import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const BASELINE_PATH = join(ROOT, 'docs', 'benchmark-baseline.json');
const CURRENT_PATH = join(ROOT, 'docs', 'benchmark-results.json');

type Strategy = 'fmm' | 'bmm' | 'bimm' | 'viterbi';

interface StrategyResult {
    strategy: Strategy;
    boundaryMetrics: { f1: number };
    tokenMetrics: { f1: number };
    exactMatchRate: number;
    oovBoundaryF1: number;
}

interface BenchmarkFile {
    results: StrategyResult[];
}

interface Tolerance {
    boundaryF1Drop: number;
    tokenF1Drop: number;
    exactMatchDrop: number;
    oovBoundaryF1Drop: number;
}

const DEFAULT_TOLERANCE: Tolerance = {
    boundaryF1Drop: 0.005,
    tokenF1Drop: 0.01,
    exactMatchDrop: 0.005,
    oovBoundaryF1Drop: 0.02,
};

const TOLERANCE_BY_STRATEGY: Partial<Record<Strategy, Tolerance>> = {
    // Viterbi is still under active tuning, so allow wider movement.
    viterbi: {
        boundaryF1Drop: 0.03,
        tokenF1Drop: 0.04,
        exactMatchDrop: 0.01,
        oovBoundaryF1Drop: 0.05,
    },
};

function load(path: string): BenchmarkFile {
    return JSON.parse(readFileSync(path, 'utf-8')) as BenchmarkFile;
}

function getStrategy(data: BenchmarkFile, strategy: Strategy): StrategyResult {
    const result = data.results.find(r => r.strategy === strategy);
    if (!result) {
        throw new Error(`Missing strategy "${strategy}" in benchmark data`);
    }
    return result;
}

function failsLowerBound(
    current: number,
    baseline: number,
    allowedDrop: number
): boolean {
    return current < baseline - allowedDrop;
}

function main() {
    if (!existsSync(BASELINE_PATH)) {
        throw new Error(
            `Missing baseline file: ${BASELINE_PATH}. Commit docs/benchmark-baseline.json first.`
        );
    }
    if (!existsSync(CURRENT_PATH)) {
        throw new Error(
            `Missing current benchmark file: ${CURRENT_PATH}. Run npm run test:accuracy first.`
        );
    }

    const baseline = load(BASELINE_PATH);
    const current = load(CURRENT_PATH);
    const strategies: Strategy[] = ['fmm', 'bmm', 'bimm', 'viterbi'];

    const failures: string[] = [];

    for (const strategy of strategies) {
        const base = getStrategy(baseline, strategy);
        const cur = getStrategy(current, strategy);
        const tolerance = TOLERANCE_BY_STRATEGY[strategy] ?? DEFAULT_TOLERANCE;

        if (
            failsLowerBound(
                cur.boundaryMetrics.f1,
                base.boundaryMetrics.f1,
                tolerance.boundaryF1Drop
            )
        ) {
            failures.push(
                `${strategy}: boundary F1 dropped from ${base.boundaryMetrics.f1.toFixed(4)} to ${cur.boundaryMetrics.f1.toFixed(4)}`
            );
        }
        if (
            failsLowerBound(
                cur.tokenMetrics.f1,
                base.tokenMetrics.f1,
                tolerance.tokenF1Drop
            )
        ) {
            failures.push(
                `${strategy}: token F1 dropped from ${base.tokenMetrics.f1.toFixed(4)} to ${cur.tokenMetrics.f1.toFixed(4)}`
            );
        }
        if (
            failsLowerBound(
                cur.exactMatchRate,
                base.exactMatchRate,
                tolerance.exactMatchDrop
            )
        ) {
            failures.push(
                `${strategy}: exact-match rate dropped from ${base.exactMatchRate.toFixed(4)} to ${cur.exactMatchRate.toFixed(4)}`
            );
        }
        if (
            failsLowerBound(
                cur.oovBoundaryF1,
                base.oovBoundaryF1,
                tolerance.oovBoundaryF1Drop
            )
        ) {
            failures.push(
                `${strategy}: OOV boundary F1 dropped from ${base.oovBoundaryF1.toFixed(4)} to ${cur.oovBoundaryF1.toFixed(4)}`
            );
        }
    }

    if (failures.length > 0) {
        console.error('Benchmark regression check failed:');
        for (const failure of failures) {
            console.error(`- ${failure}`);
        }
        process.exit(1);
    }

    console.log('Benchmark regression check passed.');
}

main();
