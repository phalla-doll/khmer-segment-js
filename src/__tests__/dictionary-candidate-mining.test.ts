import { describe, expect, it } from 'vitest';
import {
    collectCandidateRows,
    createCandidateMaps,
    type Span,
} from '../dev/dictionary-candidate-mining';

describe('dictionary candidate mining', () => {
    it('collects unknown Khmer spans and under-split gold tokens', () => {
        const candidates = createCandidateMaps();
        const first = 'ភ្នំ';
        const second = 'ពេញ';
        const predictions: Span[] = [
            { value: first, start: 0, end: first.length, isKnown: false },
            {
                value: second,
                start: first.length,
                end: first.length + second.length,
                isKnown: true,
            },
        ];

        collectCandidateRows(['ភ្នំពេញ'], predictions, candidates);

        expect(candidates.unknownKhmerSpans.get('ភ្នំ')?.count).toBe(1);
        expect(candidates.underSplitGoldTokens.get('ភ្នំពេញ')?.count).toBe(1);
        expect(
            candidates.recurringNameOrCompoundTokens.get('ភ្នំពេញ')?.count
        ).toBe(1);
    });

    it('ignores non-Khmer unknown spans', () => {
        const candidates = createCandidateMaps();
        const predictions: Span[] = [
            { value: 'Anne', start: 0, end: 4, isKnown: false },
        ];

        collectCandidateRows(['Anne'], predictions, candidates);

        expect(candidates.unknownKhmerSpans.size).toBe(0);
        expect(candidates.underSplitGoldTokens.size).toBe(0);
    });
});
