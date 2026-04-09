import { describe, it, expect } from 'vitest';
import { segmentWords } from '../core/segment';
import { getDefaultDictionary } from '../dictionary/default-dictionary';

interface BenchResult {
    median: number;
    p95: number;
    runs: number[];
}

function benchmark(
    fn: () => void,
    warmupRuns = 3,
    measureRuns = 7
): BenchResult {
    for (let i = 0; i < warmupRuns; i++) fn();

    const runs: number[] = [];
    for (let i = 0; i < measureRuns; i++) {
        const start = performance.now();
        fn();
        runs.push(performance.now() - start);
    }

    runs.sort((a, b) => a - b);
    return {
        median: runs[Math.floor(runs.length / 2)],
        p95: runs[Math.ceil(runs.length * 0.95) - 1],
        runs,
    };
}

describe('segmentation performance', () => {
    const dict = getDefaultDictionary();

    it('segments 500 repetitions efficiently', () => {
        const sentence = 'សួស្តីអ្នក';
        const text = sentence.repeat(500);

        const result = benchmark(() =>
            segmentWords(text, { dictionary: dict })
        );

        const seg = segmentWords(text, { dictionary: dict });
        expect(seg.tokens.length).toBeGreaterThan(0);
        expect(seg.tokens.map(t => t.value).join('')).toBe(text);

        expect(result.median).toBeLessThan(5000);
    });

    it('segments 2000 repetitions efficiently', () => {
        const sentence = 'ខ្ញុំសរសេរភាសាខ្មែរ';
        const text = sentence.repeat(2000);

        const result = benchmark(() =>
            segmentWords(text, { dictionary: dict })
        );

        const seg = segmentWords(text, { dictionary: dict });
        expect(seg.tokens.length).toBeGreaterThan(0);
        expect(seg.tokens.map(t => t.value).join('')).toBe(text);

        expect(result.median).toBeLessThan(10000);
    });

    it('segments a large paragraph with mixed known/unknown words', () => {
        const paragraph =
            'កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។ ' +
            'រដ្ឋធម្មនុញ្ញនៃព្រះរាជាណាចក្រកម្ពុជារក្សាទុកនូវសិទ្ធិសេរីភាពនៃប្រជាពលរដ្ឋ។ ' +
            'ប្រជាជនខ្មែររស់នៅលើទឹកដីនេះអស់រយៈពេលជាយូរលង់មកហើយ។ ' +
            'ភាសាខ្មែរជាភាសាជាតិដែលប្រើប្រាស់នៅក្នុងប្រទេសកម្ពុជា។';
        const text = paragraph.repeat(100);

        const result = benchmark(() =>
            segmentWords(text, { dictionary: dict })
        );

        const seg = segmentWords(text, { dictionary: dict });
        expect(seg.tokens.length).toBeGreaterThan(0);

        const knownRatio =
            seg.tokens.filter(t => t.isKnown).length / seg.tokens.length;
        expect(knownRatio).toBeGreaterThan(0.3);

        expect(result.median).toBeLessThan(10000);
    });
});

describe('Viterbi performance', () => {
    const dict = getDefaultDictionary();

    it('segments 500 repetitions efficiently with Viterbi', () => {
        const sentence = 'សួស្តីអ្នក';
        const text = sentence.repeat(500);

        const result = benchmark(() =>
            segmentWords(text, { dictionary: dict, strategy: 'viterbi' })
        );

        const seg = segmentWords(text, {
            dictionary: dict,
            strategy: 'viterbi',
        });
        expect(seg.tokens.length).toBeGreaterThan(0);
        expect(seg.tokens.map(t => t.value).join('')).toBe(text);

        expect(result.median).toBeLessThan(10000);
    });

    it('segments 2000 repetitions efficiently with Viterbi', () => {
        const sentence = 'ខ្ញុំសរសេរភាសាខ្មែរ';
        const text = sentence.repeat(2000);

        const result = benchmark(() =>
            segmentWords(text, { dictionary: dict, strategy: 'viterbi' })
        );

        const seg = segmentWords(text, {
            dictionary: dict,
            strategy: 'viterbi',
        });
        expect(seg.tokens.length).toBeGreaterThan(0);
        expect(seg.tokens.map(t => t.value).join('')).toBe(text);

        expect(result.median).toBeLessThan(20000);
    });

    it('segments a large paragraph with Viterbi', () => {
        const paragraph =
            'កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។ ' +
            'រដ្ឋធម្មនុញ្ញនៃព្រះរាជាណាចក្រកម្ពុជារក្សាទុកនូវសិទ្ធិសេរីភាពនៃប្រជាពលរដ្ឋ។ ' +
            'ប្រជាជនខ្មែររស់នៅលើទឹកដីនេះអស់រយៈពេលជាយូរលង់មកហើយ។ ' +
            'ភាសាខ្មែរជាភាសាជាតិដែលប្រើប្រាស់នៅក្នុងប្រទេសកម្ពុជា។';
        const text = paragraph.repeat(100);

        const result = benchmark(() =>
            segmentWords(text, { dictionary: dict, strategy: 'viterbi' })
        );

        const seg = segmentWords(text, {
            dictionary: dict,
            strategy: 'viterbi',
        });
        expect(seg.tokens.length).toBeGreaterThan(0);
        expect(seg.tokens.map(t => t.value).join('')).toBe(text);

        expect(result.median).toBeLessThan(20000);
    });

    it('Viterbi latency is within 2.5x of BiMM (median of repeated runs)', () => {
        const text =
            'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា។ ' +
            'កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។'.repeat(50);

        const bimmResult = benchmark(() =>
            segmentWords(text, { dictionary: dict, strategy: 'bimm' })
        );

        const viterbiResult = benchmark(() =>
            segmentWords(text, { dictionary: dict, strategy: 'viterbi' })
        );

        expect(viterbiResult.median).toBeLessThanOrEqual(
            bimmResult.median * 2.5 + 100
        );
    });
});
