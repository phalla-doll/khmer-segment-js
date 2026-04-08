import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const RESULTS_JSON = join(ROOT, 'docs', 'benchmark-results.json');
const SWEEP_JSON = join(ROOT, 'docs', 'viterbi-penalty-sweep.json');
const SWEEP_MD = join(ROOT, 'docs', 'viterbi-penalty-sweep.md');

type Strategy = 'fmm' | 'bmm' | 'bimm' | 'viterbi';

interface StrategyResult {
    strategy: Strategy;
    boundaryMetrics: { precision: number; recall: number; f1: number };
    tokenMetrics: { precision: number; recall: number; f1: number };
    exactMatchRate: number;
    oovRate: number;
    oovBoundaryF1: number;
    elapsedMs: number;
}

interface AccuracyOutput {
    generatedAt: string;
    dataset: string;
    dictionarySize: number;
    sentences: number;
    viterbiBoundaryPenalty?: number;
    results: StrategyResult[];
}

interface SweepRow {
    penalty: number;
    bimmBoundaryF1: number;
    viterbiBoundaryF1: number;
    bimmOovBoundaryF1: number;
    viterbiOovBoundaryF1: number;
    bimmElapsedMs: number;
    viterbiElapsedMs: number;
    viterbiVsBimmTimeRatio: number;
}

function readAccuracyOutput(): AccuracyOutput {
    return JSON.parse(readFileSync(RESULTS_JSON, 'utf-8')) as AccuracyOutput;
}

function getStrategy(
    data: AccuracyOutput,
    strategy: Strategy
): StrategyResult | undefined {
    return data.results.find(r => r.strategy === strategy);
}

function formatSweep(rows: SweepRow[]): string {
    const lines: string[] = [];
    lines.push('# Viterbi Boundary Penalty Sweep');
    lines.push('');
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(
        '| Penalty | BiMM Boundary F1 | Viterbi Boundary F1 | BiMM OOV Boundary F1 | Viterbi OOV Boundary F1 | BiMM Time (ms) | Viterbi Time (ms) | Viterbi/BiMM Time |'
    );
    lines.push(
        '| ------- | ---------------- | ------------------- | -------------------- | ----------------------- | -------------- | ----------------- | ----------------- |'
    );
    for (const row of rows) {
        lines.push(
            `| ${row.penalty.toFixed(2)} | ${row.bimmBoundaryF1.toFixed(4)} | ${row.viterbiBoundaryF1.toFixed(4)} | ${row.bimmOovBoundaryF1.toFixed(4)} | ${row.viterbiOovBoundaryF1.toFixed(4)} | ${row.bimmElapsedMs} | ${row.viterbiElapsedMs} | ${row.viterbiVsBimmTimeRatio.toFixed(2)}x |`
        );
    }
    lines.push('');
    return lines.join('\n');
}

function main() {
    const penalties = [
        0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0, 7.5, 10.0,
    ];
    const rows: SweepRow[] = [];

    for (const penalty of penalties) {
        console.log(`\nRunning accuracy benchmark with penalty=${penalty} ...`);
        execSync(
            `npx tsx scripts/benchmark-accuracy.ts --viterbi-boundary-penalty ${penalty}`,
            {
                cwd: ROOT,
                stdio: 'inherit',
            }
        );

        const output = readAccuracyOutput();
        const bimm = getStrategy(output, 'bimm');
        const viterbi = getStrategy(output, 'viterbi');
        if (!bimm || !viterbi) {
            throw new Error(
                'Missing BiMM or Viterbi result in benchmark output'
            );
        }

        rows.push({
            penalty,
            bimmBoundaryF1: bimm.boundaryMetrics.f1,
            viterbiBoundaryF1: viterbi.boundaryMetrics.f1,
            bimmOovBoundaryF1: bimm.oovBoundaryF1,
            viterbiOovBoundaryF1: viterbi.oovBoundaryF1,
            bimmElapsedMs: bimm.elapsedMs,
            viterbiElapsedMs: viterbi.elapsedMs,
            viterbiVsBimmTimeRatio:
                viterbi.elapsedMs / Math.max(bimm.elapsedMs, 1),
        });
    }

    writeFileSync(SWEEP_JSON, JSON.stringify(rows, null, 2), 'utf-8');
    writeFileSync(SWEEP_MD, formatSweep(rows), 'utf-8');
    console.log(`\nSweep results written to ${SWEEP_MD}`);
}

main();
