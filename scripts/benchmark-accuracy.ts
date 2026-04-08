import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { segmentWords } from '../src/core/segment';
import { getDefaultDictionary } from '../src/dictionary/default-dictionary';

const BENCHMARK_DIR = join(import.meta.dirname, '..', 'benchmark', 'data');
const RESULTS_DIR = join(import.meta.dirname, '..', 'docs');

interface BoundaryMetrics {
    precision: number;
    recall: number;
    f1: number;
}

interface BenchmarkResult {
    strategy: string;
    sentences: number;
    boundaryMetrics: BoundaryMetrics;
    tokenMetrics: BoundaryMetrics;
    exactMatchRate: number;
    oovRate: number;
    oovBoundaryF1: number;
    avgTokensPerSentence: number;
    elapsedMs: number;
    errorExamples: string[];
}

type Strategy = 'fmm' | 'bmm' | 'bimm' | 'viterbi';

function loadGoldData(filePath: string): string[][] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => line.trim().split(/\s+/));
}

function extractBoundaries(tokens: string[]): Set<number> {
    const boundaries = new Set<number>();
    let pos = 0;
    for (const token of tokens) {
        pos += token.length;
        boundaries.add(pos);
    }
    return boundaries;
}

function computeMetrics(
    predicted: Set<number>,
    gold: Set<number>
): BoundaryMetrics {
    let tp = 0;
    for (const b of predicted) {
        if (gold.has(b)) tp++;
    }
    const fp = predicted.size - tp;
    const fn = gold.size - tp;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 =
        precision + recall > 0
            ? (2 * precision * recall) / (precision + recall)
            : 0;
    return { precision, recall, f1 };
}

function computeTokenMetrics(
    predicted: string[],
    gold: string[]
): BoundaryMetrics {
    let tp = 0;
    const goldCount = new Map<string, number>();
    for (const t of gold) {
        goldCount.set(t, (goldCount.get(t) ?? 0) + 1);
    }
    const predCount = new Map<string, number>();
    for (const t of predicted) {
        predCount.set(t, (predCount.get(t) ?? 0) + 1);
    }
    for (const [token, count] of predCount) {
        const goldC = goldCount.get(token) ?? 0;
        tp += Math.min(count, goldC);
    }
    const fp = predicted.length - tp;
    const fn = gold.length - tp;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 =
        precision + recall > 0
            ? (2 * precision * recall) / (precision + recall)
            : 0;
    return { precision, recall, f1 };
}

function runBenchmark(
    goldSentences: string[][],
    strategy: Strategy,
    dictionary: ReturnType<typeof getDefaultDictionary>,
    viterbiBoundaryPenalty?: number
): BenchmarkResult {
    const start = Date.now();
    const errorExamples: string[] = [];

    let totalBoundaryTP = 0;
    let totalBoundaryFP = 0;
    let totalBoundaryFN = 0;
    let totalTokenTP = 0;
    let totalTokenFP = 0;
    let totalTokenFN = 0;
    let exactMatches = 0;
    let totalTokens = 0;
    let oovTokens = 0;
    let oovBoundaryTP = 0;
    let oovBoundaryFP = 0;
    let oovBoundaryFN = 0;
    let errorCount = 0;

    for (const goldWords of goldSentences) {
        const goldText = goldWords.join('');
        const result = segmentWords(goldText, {
            dictionary,
            strategy,
            normalize: true,
            ...(strategy === 'viterbi' &&
            typeof viterbiBoundaryPenalty === 'number'
                ? { viterbiBoundaryPenalty }
                : {}),
        });

        const predictedWords = result.tokens.map(t => t.value);
        const predictedBoundaries = extractBoundaries(predictedWords);
        const goldBoundaries = extractBoundaries(goldWords);

        let tp = 0;
        for (const b of predictedBoundaries) {
            if (goldBoundaries.has(b)) tp++;
        }
        totalBoundaryTP += tp;
        totalBoundaryFP += predictedBoundaries.size - tp;
        totalBoundaryFN += goldBoundaries.size - tp;

        let tokenTP = 0;
        const goldCount = new Map<string, number>();
        for (const w of goldWords)
            goldCount.set(w, (goldCount.get(w) ?? 0) + 1);
        const predCount = new Map<string, number>();
        for (const w of predictedWords)
            predCount.set(w, (predCount.get(w) ?? 0) + 1);
        for (const [token, count] of predCount) {
            tokenTP += Math.min(count, goldCount.get(token) ?? 0);
        }
        totalTokenTP += tokenTP;
        totalTokenFP += predictedWords.length - tokenTP;
        totalTokenFN += goldWords.length - tokenTP;

        if (
            predictedWords.join('') === goldWords.join('') &&
            predictedWords.length === goldWords.length &&
            predictedWords.every((w, i) => w === goldWords[i])
        ) {
            exactMatches++;
        }

        totalTokens += result.tokens.length;
        const unknownTokens = result.tokens.filter(t => !t.isKnown);
        oovTokens += unknownTokens.length;

        const oovPositions = new Set<number>();
        let pos = 0;
        for (const t of result.tokens) {
            if (!t.isKnown) oovPositions.add(pos);
            pos += t.value.length;
        }

        let oovTP = 0;
        for (const b of predictedBoundaries) {
            if (goldBoundaries.has(b) && oovPositions.has(b)) oovTP++;
        }
        for (const b of predictedBoundaries) {
            if (oovPositions.has(b)) {
                if (goldBoundaries.has(b)) oovBoundaryTP++;
                else oovBoundaryFP++;
            }
        }
        for (const b of goldBoundaries) {
            if (oovPositions.has(b) && !predictedBoundaries.has(b)) {
                oovBoundaryFN++;
            }
        }

        if (errorCount < 20 && predictedWords.join('') !== goldWords.join('')) {
            errorExamples.push(
                `GOLD: ${goldWords.join(' | ')}\nPRED: ${predictedWords.join(' | ')}`
            );
            errorCount++;
        }
    }

    const elapsed = Date.now() - start;

    const boundaryP =
        totalBoundaryTP + totalBoundaryFP > 0
            ? totalBoundaryTP / (totalBoundaryTP + totalBoundaryFP)
            : 0;
    const boundaryR =
        totalBoundaryTP + totalBoundaryFN > 0
            ? totalBoundaryTP / (totalBoundaryTP + totalBoundaryFN)
            : 0;
    const boundaryF1 =
        boundaryP + boundaryR > 0
            ? (2 * boundaryP * boundaryR) / (boundaryP + boundaryR)
            : 0;

    const tokenP =
        totalTokenTP + totalTokenFP > 0
            ? totalTokenTP / (totalTokenTP + totalTokenFP)
            : 0;
    const tokenR =
        totalTokenTP + totalTokenFN > 0
            ? totalTokenTP / (totalTokenTP + totalTokenFN)
            : 0;
    const tokenF1 =
        tokenP + tokenR > 0 ? (2 * tokenP * tokenR) / (tokenP + tokenR) : 0;

    const oovP =
        oovBoundaryTP + oovBoundaryFP > 0
            ? oovBoundaryTP / (oovBoundaryTP + oovBoundaryFP)
            : 0;
    const oovR =
        oovBoundaryTP + oovBoundaryFN > 0
            ? oovBoundaryTP / (oovBoundaryTP + oovBoundaryFN)
            : 0;
    const oovF1 = oovP + oovR > 0 ? (2 * oovP * oovR) / (oovP + oovR) : 0;

    return {
        strategy,
        sentences: goldSentences.length,
        boundaryMetrics: {
            precision: boundaryP,
            recall: boundaryR,
            f1: boundaryF1,
        },
        tokenMetrics: {
            precision: tokenP,
            recall: tokenR,
            f1: tokenF1,
        },
        exactMatchRate: exactMatches / goldSentences.length,
        oovRate: totalTokens > 0 ? oovTokens / totalTokens : 0,
        oovBoundaryF1: oovF1,
        avgTokensPerSentence: totalTokens / goldSentences.length,
        elapsedMs: elapsed,
        errorExamples,
    };
}

function formatResults(
    results: BenchmarkResult[],
    viterbiBoundaryPenalty?: number
): string {
    const lines: string[] = [];
    lines.push('# Benchmark Results');
    lines.push('');
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push(`Dataset: kh_data_10000b (phylypo/segmentation-crf-khmer)`);
    if (typeof viterbiBoundaryPenalty === 'number') {
        lines.push(`Viterbi boundary penalty: ${viterbiBoundaryPenalty}`);
    }
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push(
        '| Strategy | Boundary P | Boundary R | Boundary F1 | Token P | Token R | Token F1 | Exact Match | OOV Rate | OOV Boundary F1 | Time (ms) |'
    );
    lines.push(
        '|----------|-----------|------------|-------------|---------|---------|----------|-------------|----------|-----------------|-----------|'
    );
    for (const r of results) {
        lines.push(
            `| ${r.strategy} | ${r.boundaryMetrics.precision.toFixed(4)} | ${r.boundaryMetrics.recall.toFixed(4)} | ${r.boundaryMetrics.f1.toFixed(4)} | ${r.tokenMetrics.precision.toFixed(4)} | ${r.tokenMetrics.recall.toFixed(4)} | ${r.tokenMetrics.f1.toFixed(4)} | ${r.exactMatchRate.toFixed(4)} | ${r.oovRate.toFixed(4)} | ${r.oovBoundaryF1.toFixed(4)} | ${r.elapsedMs} |`
        );
    }
    lines.push('');

    for (const r of results) {
        lines.push(`## ${r.strategy.toUpperCase()} Details`);
        lines.push('');
        lines.push(`- Sentences: ${r.sentences}`);
        lines.push(
            `- Avg tokens/sentence: ${r.avgTokensPerSentence.toFixed(1)}`
        );
        lines.push(`- Elapsed: ${r.elapsedMs}ms`);
        lines.push('');
        lines.push('### Error Examples');
        lines.push('');
        for (const ex of r.errorExamples) {
            lines.push('```');
            lines.push(ex);
            lines.push('```');
            lines.push('');
        }
    }

    return lines.join('\n');
}

function parseViterbiBoundaryPenalty(): number | undefined {
    const args = process.argv.slice(2);
    const flagIndex = args.findIndex(
        arg => arg === '--viterbi-boundary-penalty'
    );
    if (flagIndex === -1 || flagIndex === args.length - 1) return undefined;
    const value = Number(args[flagIndex + 1]);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(
            'Invalid --viterbi-boundary-penalty value. Expected a non-negative number.'
        );
    }
    return value;
}

async function main() {
    const viterbiBoundaryPenalty = parseViterbiBoundaryPenalty();
    const dataFile = join(BENCHMARK_DIR, 'kh_data_10000.txt');
    const altDataFile = join(BENCHMARK_DIR, 'kh_data_10000b.txt');

    let goldFile = dataFile;
    if (!existsSync(dataFile) && existsSync(altDataFile)) {
        goldFile = altDataFile;
    }
    if (!existsSync(goldFile)) {
        console.error(
            `Benchmark data not found at ${dataFile} or ${altDataFile}`
        );
        console.error('Run: npx tsx scripts/download-benchmark-data.ts');
        process.exit(1);
    }

    console.log(`Loading gold data from ${goldFile}...`);
    const goldSentences = loadGoldData(goldFile);
    console.log(`Loaded ${goldSentences.length} sentences`);

    const dictionary = getDefaultDictionary();
    console.log(`Dictionary size: ${dictionary.size} words`);
    if (typeof viterbiBoundaryPenalty === 'number') {
        console.log(`Viterbi boundary penalty: ${viterbiBoundaryPenalty}`);
    }

    const strategies: Strategy[] = ['fmm', 'bmm', 'bimm', 'viterbi'];
    const results: BenchmarkResult[] = [];

    for (const strategy of strategies) {
        console.log(`\nBenchmarking ${strategy}...`);
        const result = runBenchmark(
            goldSentences,
            strategy,
            dictionary,
            viterbiBoundaryPenalty
        );
        results.push(result);
        console.log(
            `  Boundary F1: ${result.boundaryMetrics.f1.toFixed(4)}, ` +
                `Token F1: ${result.tokenMetrics.f1.toFixed(4)}, ` +
                `Exact Match: ${result.exactMatchRate.toFixed(4)}, ` +
                `Time: ${result.elapsedMs}ms`
        );
    }

    mkdirSync(RESULTS_DIR, { recursive: true });
    const report = formatResults(results, viterbiBoundaryPenalty);
    const reportPath = join(RESULTS_DIR, 'benchmark-results.md');
    writeFileSync(reportPath, report, 'utf-8');
    const jsonPath = join(RESULTS_DIR, 'benchmark-results.json');
    writeFileSync(
        jsonPath,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                dataset: 'kh_data_10000b',
                dictionarySize: dictionary.size,
                sentences: goldSentences.length,
                viterbiBoundaryPenalty,
                results: results.map(r => ({
                    strategy: r.strategy,
                    boundaryMetrics: r.boundaryMetrics,
                    tokenMetrics: r.tokenMetrics,
                    exactMatchRate: r.exactMatchRate,
                    oovRate: r.oovRate,
                    oovBoundaryF1: r.oovBoundaryF1,
                    elapsedMs: r.elapsedMs,
                })),
            },
            null,
            2
        ),
        'utf-8'
    );
    console.log(`\nResults written to ${reportPath}`);
    console.log(`Results JSON written to ${jsonPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
