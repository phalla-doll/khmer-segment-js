import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { segmentWords } from '../src/core/segment';
import { getDefaultDictionary } from '../src/dictionary/default-dictionary';

const BENCHMARK_DIR = join(import.meta.dirname, '..', 'benchmark', 'data');
const RESULTS_DIR = join(import.meta.dirname, '..', 'docs');
const DEFAULT_VITERBI_BOUNDARY_PENALTY = 10;
const MAX_EXAMPLES_PER_CATEGORY = 5;
const MAX_EXAMPLE_CHARS = 1200;
const KHMER_RE = /[\u1780-\u17ff]/;
const LATIN_RE = /[A-Za-z]/;
const DIGIT_RE = /[0-9\u17e0-\u17e9]/;

type CategoryId =
    | 'normalization-drift'
    | 'latin-run-handling'
    | 'numeric-format-handling'
    | 'punctuation-run-handling'
    | 'khmer-over-merge'
    | 'khmer-under-split'
    | 'unknown-khmer-span'
    | 'other';

interface Span {
    value: string;
    start: number;
    end: number;
    isKnown?: boolean;
}

interface CategorySummary {
    id: CategoryId;
    title: string;
    description: string;
    nextStep: string;
    count: number;
    examples: Array<{ gold: string; pred: string }>;
}

const CATEGORY_INFO: Record<
    CategoryId,
    Pick<CategorySummary, 'title' | 'description' | 'nextStep'>
> = {
    'normalization-drift': {
        title: 'Normalization drift',
        description:
            'The normalized text differs from the raw gold text, so token comparison mixes segmentation errors with spelling/order normalization differences.',
        nextStep:
            'Normalize gold tokens before boundary extraction, then report raw-text drift separately.',
    },
    'latin-run-handling': {
        title: 'Latin run handling',
        description:
            'Latin words or names appear in the gold text but are split into smaller predicted pieces.',
        nextStep:
            'Group contiguous Latin letters as one non-Khmer token before Khmer dictionary segmentation.',
    },
    'numeric-format-handling': {
        title: 'Numeric format handling',
        description:
            'Formatted numbers such as comma-separated amounts are split around punctuation.',
        nextStep:
            'Extend digit grouping to include number-internal separators such as comma and period.',
    },
    'punctuation-run-handling': {
        title: 'Punctuation run handling',
        description:
            'Runs such as ellipses are split differently from the benchmark gold tokens.',
        nextStep:
            'Decide whether punctuation runs should be single tokens and encode that policy consistently.',
    },
    'khmer-over-merge': {
        title: 'Khmer over-merge',
        description:
            'A predicted Khmer token spans multiple gold tokens, usually from long dictionary entries or high-frequency compounds.',
        nextStep:
            'Add feature costs or dictionary metadata that can discourage specific high-risk compounds.',
    },
    'khmer-under-split': {
        title: 'Khmer under-split',
        description:
            'A gold Khmer token is split into multiple predicted tokens, often around names, rare words, or low-frequency compounds.',
        nextStep:
            'Improve dictionary coverage and add Viterbi features for short-fragment penalties.',
    },
    'unknown-khmer-span': {
        title: 'Unknown Khmer span',
        description:
            'Predicted output contains unknown Khmer spans, indicating dictionary coverage or fallback weakness.',
        nextStep:
            'Mine frequent unknown spans from the benchmark and review them for dictionary inclusion.',
    },
    other: {
        title: 'Other',
        description:
            'The sentence mismatched, but none of the current coarse classifiers explained it.',
        nextStep:
            'Inspect examples and add a more specific classifier before tuning behavior.',
    },
};

function loadGoldData(filePath: string): string[][] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => line.trim().split(/\s+/));
}

function toSpans(tokens: string[]): Span[] {
    let offset = 0;
    return tokens.map(value => {
        const span = { value, start: offset, end: offset + value.length };
        offset = span.end;
        return span;
    });
}

function overlaps(container: Span, spans: Span[]): Span[] {
    return spans.filter(
        span => span.start >= container.start && span.end <= container.end
    );
}

function sameTokenSequence(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((token, i) => token === b[i]);
}

function isKhmer(value: string): boolean {
    return KHMER_RE.test(value);
}

function isLatin(value: string): boolean {
    return LATIN_RE.test(value);
}

function isDigitFormatted(value: string): boolean {
    return (
        DIGIT_RE.test(value) && /[,.:]/.test(value) && !/^[,.:]+$/.test(value)
    );
}

function isPunctuationRun(value: string): boolean {
    return /^[\p{P}\u17d4-\u17d6]{2,}$/u.test(value);
}

function hasLatinRunMismatch(goldSpans: Span[], predSpans: Span[]): boolean {
    const splitGoldLatin = goldSpans.some(gold => {
        if (!isLatin(gold.value) || gold.value.length <= 1) return false;
        const predictedInside = overlaps(gold, predSpans);
        return (
            predictedInside.length > 1 ||
            predictedInside.some(pred => pred.value !== gold.value)
        );
    });

    if (splitGoldLatin) return true;

    return predSpans.some(pred => {
        if (!isLatin(pred.value)) return false;
        const goldInside = overlaps(pred, goldSpans).filter(gold =>
            isLatin(gold.value)
        );
        return goldInside.length > 1;
    });
}

function hasNumericFormatSplit(goldSpans: Span[], predSpans: Span[]): boolean {
    return goldSpans.some(gold => {
        if (!isDigitFormatted(gold.value)) return false;
        return overlaps(gold, predSpans).length > 1;
    });
}

function hasPunctuationRunSplit(goldSpans: Span[], predSpans: Span[]): boolean {
    return goldSpans.some(gold => {
        if (!isPunctuationRun(gold.value)) return false;
        return overlaps(gold, predSpans).length > 1;
    });
}

function hasKhmerOverMerge(goldSpans: Span[], predSpans: Span[]): boolean {
    return predSpans.some(pred => {
        if (!isKhmer(pred.value)) return false;
        const goldInside = overlaps(pred, goldSpans);
        return goldInside.length > 1;
    });
}

function hasKhmerUnderSplit(goldSpans: Span[], predSpans: Span[]): boolean {
    return goldSpans.some(gold => {
        if (!isKhmer(gold.value)) return false;
        const predictedInside = overlaps(gold, predSpans);
        return predictedInside.length > 1;
    });
}

function hasUnknownKhmerSpan(predSpans: Span[]): boolean {
    return predSpans.some(
        pred => pred.isKnown === false && isKhmer(pred.value)
    );
}

function classifySentence(
    goldWords: string[],
    predSpans: Span[],
    normalized: string
): CategoryId[] {
    const goldText = goldWords.join('');
    const goldSpans = toSpans(goldWords);
    const categories: CategoryId[] = [];

    if (normalized !== goldText) categories.push('normalization-drift');
    if (hasLatinRunMismatch(goldSpans, predSpans)) {
        categories.push('latin-run-handling');
    }
    if (hasNumericFormatSplit(goldSpans, predSpans)) {
        categories.push('numeric-format-handling');
    }
    if (hasPunctuationRunSplit(goldSpans, predSpans)) {
        categories.push('punctuation-run-handling');
    }
    if (hasKhmerOverMerge(goldSpans, predSpans)) {
        categories.push('khmer-over-merge');
    }
    if (hasKhmerUnderSplit(goldSpans, predSpans)) {
        categories.push('khmer-under-split');
    }
    if (hasUnknownKhmerSpan(predSpans)) {
        categories.push('unknown-khmer-span');
    }

    return categories.length > 0 ? categories : ['other'];
}

function createEmptySummaries(): Record<CategoryId, CategorySummary> {
    const summaries = {} as Record<CategoryId, CategorySummary>;
    for (const id of Object.keys(CATEGORY_INFO) as CategoryId[]) {
        summaries[id] = {
            id,
            ...CATEGORY_INFO[id],
            count: 0,
            examples: [],
        };
    }
    return summaries;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
}

function truncateExample(value: string): string {
    if (value.length <= MAX_EXAMPLE_CHARS) return value;
    return `${value.slice(0, MAX_EXAMPLE_CHARS)} ... [truncated]`;
}

function formatReport(params: {
    generatedAt: string;
    dataset: string;
    sentences: number;
    mismatchedSentences: number;
    exactMatchRate: number;
    summaries: CategorySummary[];
}): string {
    const lines: string[] = [];
    lines.push('# Benchmark Error Analysis');
    lines.push('');
    lines.push(`Date: ${params.generatedAt}`);
    lines.push(`Dataset: ${params.dataset}`);
    lines.push(`Strategy: viterbi`);
    lines.push(
        `Viterbi boundary penalty: default (${DEFAULT_VITERBI_BOUNDARY_PENALTY})`
    );
    lines.push(`Sentences: ${params.sentences}`);
    lines.push(`Exact sentence match: ${formatPercent(params.exactMatchRate)}`);
    lines.push(`Mismatched sentences: ${params.mismatchedSentences}`);
    lines.push('');
    lines.push('## Category Summary');
    lines.push('');
    lines.push('| Category | Sentences | Share of mismatches | Next step |');
    lines.push('| --- | ---: | ---: | --- |');
    for (const summary of params.summaries) {
        if (summary.count === 0) continue;
        lines.push(
            `| ${summary.title} | ${summary.count} | ${formatPercent(summary.count / params.mismatchedSentences)} | ${summary.nextStep} |`
        );
    }
    lines.push('');
    lines.push(
        'A sentence can appear in multiple categories, so category counts are not expected to sum to total mismatches.'
    );
    lines.push('');
    lines.push('## Examples');
    lines.push('');

    for (const summary of params.summaries) {
        if (summary.count === 0) continue;
        lines.push(`### ${summary.title}`);
        lines.push('');
        lines.push(summary.description);
        lines.push('');
        for (const example of summary.examples) {
            lines.push('```');
            lines.push(`GOLD: ${example.gold}`);
            lines.push(`PRED: ${example.pred}`);
            lines.push('```');
            lines.push('');
        }
    }

    return lines.join('\n');
}

async function main() {
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
        console.error('Run: npm run download:benchmark');
        process.exit(1);
    }

    const generatedAt = new Date().toISOString();
    const dataset = basename(goldFile, '.txt');
    const goldSentences = loadGoldData(goldFile);
    const dictionary = getDefaultDictionary();
    const summaries = createEmptySummaries();

    let exactMatches = 0;
    let mismatchedSentences = 0;

    for (const goldWords of goldSentences) {
        const goldText = goldWords.join('');
        const result = segmentWords(goldText, {
            dictionary,
            strategy: 'viterbi',
            normalize: true,
        });
        const predictedWords = result.tokens.map(token => token.value);

        if (sameTokenSequence(predictedWords, goldWords)) {
            exactMatches++;
            continue;
        }

        mismatchedSentences++;
        const predSpans: Span[] = result.tokens.map(token => ({
            value: token.value,
            start: token.start,
            end: token.end,
            isKnown: token.isKnown,
        }));
        const categories = classifySentence(
            goldWords,
            predSpans,
            result.normalized
        );
        const example = {
            gold: truncateExample(goldWords.join(' | ')),
            pred: truncateExample(predictedWords.join(' | ')),
        };

        for (const category of categories) {
            const summary = summaries[category];
            summary.count++;
            if (summary.examples.length < MAX_EXAMPLES_PER_CATEGORY) {
                summary.examples.push(example);
            }
        }
    }

    const sortedSummaries = Object.values(summaries).sort(
        (a, b) => b.count - a.count
    );
    const exactMatchRate = exactMatches / goldSentences.length;
    const report = formatReport({
        generatedAt,
        dataset,
        sentences: goldSentences.length,
        mismatchedSentences,
        exactMatchRate,
        summaries: sortedSummaries,
    });

    mkdirSync(RESULTS_DIR, { recursive: true });
    const reportPath = join(RESULTS_DIR, 'benchmark-error-analysis.md');
    const jsonPath = join(RESULTS_DIR, 'benchmark-error-analysis.json');
    writeFileSync(reportPath, report, 'utf-8');
    writeFileSync(
        jsonPath,
        JSON.stringify(
            {
                generatedAt,
                dataset,
                strategy: 'viterbi',
                effectiveViterbiBoundaryPenalty:
                    DEFAULT_VITERBI_BOUNDARY_PENALTY,
                dictionarySize: dictionary.size,
                sentences: goldSentences.length,
                exactMatchRate,
                mismatchedSentences,
                categories: sortedSummaries,
            },
            null,
            2
        ),
        'utf-8'
    );

    console.log(`Error analysis written to ${reportPath}`);
    console.log(`Error analysis JSON written to ${jsonPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
