import { describe, it, expect } from 'vitest';
import {
    compareTyping,
    getCorrectPrefixLength,
    getFirstMismatchIndex,
} from '../../typing/index';

describe('compareTyping', () => {
    it('matches full Khmer text cluster-by-cluster', () => {
        const target = 'សួស្តីអ្នក';
        const typed = 'សួស្តីអ្នក';
        const r = compareTyping(target, typed);
        expect(r.isComplete).toBe(true);
        expect(r.correctUnits).toBe(r.totalUnits);
        expect(r.correctPrefixLength).toBe(r.normalizedTarget.length);
        expect(r.unitStates.every(u => u.correct)).toBe(true);
    });

    it('tracks partial cluster progress', () => {
        const target = 'សួស្តី';
        const typed = 'សួ';
        const r = compareTyping(target, typed);
        expect(r.isComplete).toBe(false);
        expect(r.correctUnits).toBe(1);
        expect(r.totalUnits).toBeGreaterThan(1);
        expect(r.mismatchOffset).toBe(r.correctPrefixLength);
    });

    it('detects mismatch on first differing cluster', () => {
        const target = 'កខគ';
        const typed = 'កគ';
        const r = compareTyping(target, typed, { normalize: true });
        expect(r.correctUnits).toBe(1);
        expect(r.unitStates[0]?.correct).toBe(true);
        expect(r.unitStates[1]?.correct).toBe(false);
    });

    it('supports word unit mode', () => {
        const target = 'សួស្តី អ្នក';
        const typed = 'សួស្តី';
        const r = compareTyping(target, typed, { unit: 'word' });
        expect(r.correctUnits).toBe(1);
        expect(r.totalUnits).toBe(2);
        expect(r.isComplete).toBe(false);
    });

    it('ignorePunctuation strips sentence punctuation for comparison', () => {
        const target = 'សួស្តី។';
        const typed = 'សួស្តី';
        const withPunct = compareTyping(target, typed, {
            ignorePunctuation: true,
            unit: 'cluster',
        });
        expect(withPunct.isComplete).toBe(true);
    });

    it('throws on non-string input', () => {
        expect(() => compareTyping(null as unknown as string, '')).toThrow(
            TypeError
        );
    });
});

describe('getFirstMismatchIndex / getCorrectPrefixLength', () => {
    it('delegates to compareTyping', () => {
        const target = 'abc';
        const typed = 'ab';
        expect(
            getCorrectPrefixLength(target, typed, { normalize: false })
        ).toBe(2);
        expect(getFirstMismatchIndex(target, typed, { normalize: false })).toBe(
            2
        );
    });
});
