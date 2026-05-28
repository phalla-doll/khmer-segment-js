import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { pathToFileURL } from 'url';
import { segmentWords } from '../src/core/segment';
import { getDefaultDictionary } from '../src/dictionary/default-dictionary';
import {
    collectCandidateRows,
    createCandidateMaps,
    type CandidateMaps,
    type CandidateRow,
    type Span,
} from '../src/dev/dictionary-candidate-mining';

const BENCHMARK_DIR = join(import.meta.dirname, '..', 'benchmark', 'data');
const RESULTS_DIR = join(import.meta.dirname, '..', 'docs');
const MAX_REPORT_ROWS = 100;

export interface DictionaryCandidateReport {
    generatedAt: string;
    dataset: string;
    strategy: 'bimm';
    unknownKhmerSpans: CandidateRow[];
    underSplitGoldTokens: CandidateRow[];
    recurringNameOrCompoundTokens: CandidateRow[];
}

function topRows(candidates: Map<string, CandidateRow>): CandidateRow[] {
    return [...candidates.values()]
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        .slice(0, MAX_REPORT_ROWS);
}

export function mineDictionaryCandidates(
    goldSentences: string[][]
): Omit<DictionaryCandidateReport, 'generatedAt' | 'dataset' | 'strategy'> {
    const dictionary = getDefaultDictionary();
    const candidates: CandidateMaps = createCandidateMaps();

    for (const goldWords of goldSentences) {
        const goldText = goldWords.join('');
        const result = segmentWords(goldText, {
            dictionary,
            strategy: 'bimm',
            normalize: true,
        });
        const predSpans: Span[] = result.tokens.map(token => ({
            value: token.value,
            start: token.start,
            end: token.end,
            isKnown: token.isKnown,
        }));
        collectCandidateRows(goldWords, predSpans, candidates);
    }

    return {
        unknownKhmerSpans: topRows(candidates.unknownKhmerSpans),
        underSplitGoldTokens: topRows(candidates.underSplitGoldTokens),
        recurringNameOrCompoundTokens: topRows(
            candidates.recurringNameOrCompoundTokens
        ),
    };
}

function loadGoldData(filePath: string): string[][] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => line.trim().split(/\s+/));
}

function formatRows(rows: CandidateRow[]): string[] {
    if (rows.length === 0) return ['_No candidates found._', ''];

    const lines = [
        '| Candidate | Count | Example |',
        '| --------- | ----: | ------- |',
    ];
    for (const row of rows) {
        lines.push(
            `| ${row.value} | ${row.count} | ${row.example.replaceAll('|', '\\|')} |`
        );
    }
    lines.push('');
    return lines;
}

function formatReport(report: DictionaryCandidateReport): string {
    const lines: string[] = [];
    lines.push('# Dictionary Candidate Mining Report');
    lines.push('');
    lines.push(`Date: ${report.generatedAt}`);
    lines.push(`Dataset: ${report.dataset}`);
    lines.push('Strategy: bimm');
    lines.push('');
    lines.push(
        'These are review candidates only. Do not add them to the dictionary until source, quality, and licensing are checked.'
    );
    lines.push('');
    lines.push('## Unknown Khmer Spans');
    lines.push('');
    lines.push(...formatRows(report.unknownKhmerSpans));
    lines.push('## Under-Split Gold Tokens');
    lines.push('');
    lines.push(...formatRows(report.underSplitGoldTokens));
    lines.push('## Recurring Name Or Compound Tokens');
    lines.push('');
    lines.push(...formatRows(report.recurringNameOrCompoundTokens));
    return lines.join('\n');
}

function resolveGoldFile(): string {
    const dataFile = join(BENCHMARK_DIR, 'kh_data_10000.txt');
    const altDataFile = join(BENCHMARK_DIR, 'kh_data_10000b.txt');

    if (existsSync(dataFile)) return dataFile;
    if (existsSync(altDataFile)) return altDataFile;
    throw new Error(
        `Benchmark data not found at ${dataFile} or ${altDataFile}. Run npm run download:benchmark first.`
    );
}

async function main(): Promise<void> {
    const goldFile = resolveGoldFile();
    const goldSentences = loadGoldData(goldFile);
    const candidates = mineDictionaryCandidates(goldSentences);
    const report: DictionaryCandidateReport = {
        generatedAt: new Date().toISOString(),
        dataset: basename(goldFile, '.txt'),
        strategy: 'bimm',
        ...candidates,
    };

    mkdirSync(RESULTS_DIR, { recursive: true });
    const markdownPath = join(RESULTS_DIR, 'dictionary-candidates.md');
    const jsonPath = join(RESULTS_DIR, 'dictionary-candidates.json');
    writeFileSync(markdownPath, formatReport(report), 'utf-8');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Dictionary candidate report written to ${markdownPath}`);
    console.log(`Dictionary candidate JSON written to ${jsonPath}`);
}

const invokedPath = process.argv[1]
    ? pathToFileURL(process.argv[1]).href
    : undefined;

if (invokedPath === import.meta.url) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
