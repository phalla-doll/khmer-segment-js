import { describe, it, expect } from 'vitest';
import { getCaretBoundaries, deleteBackward } from '../core/caret';
import { normalizeKhmer } from '../core/normalize';

describe('getCaretBoundaries', () => {
    it('returns [0] for empty string', () => {
        expect(getCaretBoundaries('')).toEqual([0]);
    });

    it('returns [0, 1] for single consonant', () => {
        expect(getCaretBoundaries('ក')).toEqual([0, 1]);
    });

    it('returns [0, clusterLength] for consonant + coeng + subscript', () => {
        expect(getCaretBoundaries('ក្ក')).toEqual([0, 3]);
    });

    it('returns boundaries at each cluster edge for multi-cluster text', () => {
        expect(getCaretBoundaries('កក')).toEqual([0, 1, 2]);
    });

    it('handles consonant with vowel', () => {
        expect(getCaretBoundaries('កា')).toEqual([0, 2]);
    });

    it('handles consonant with coeng + subscript + vowel', () => {
        expect(getCaretBoundaries('ក្កា')).toEqual([0, 4]);
    });

    it('handles mixed Khmer and Latin text', () => {
        const result = getCaretBoundaries('កaក');
        expect(result).toEqual([0, 1, 2, 3]);
    });

    it('covers entire string with no gaps', () => {
        const text = 'សួស្តីអ្នក';
        const boundaries = getCaretBoundaries(text);
        expect(boundaries[0]).toBe(0);
        expect(boundaries[boundaries.length - 1]).toBe(text.length);
        for (let i = 1; i < boundaries.length; i++) {
            expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1]);
        }
    });

    it('returns sorted unique positions', () => {
        const text = 'កក្កកា';
        const boundaries = getCaretBoundaries(text);
        for (let i = 1; i < boundaries.length; i++) {
            expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1]);
        }
    });

    it('handles Latin-only text character by character', () => {
        expect(getCaretBoundaries('abc')).toEqual([0, 1, 2, 3]);
    });

    it('handles text with spaces', () => {
        expect(getCaretBoundaries('ក ក')).toEqual([0, 1, 2, 3]);
    });

    it('handles digits as individual clusters', () => {
        expect(getCaretBoundaries('១២៣')).toEqual([0, 1, 2, 3]);
    });

    describe('normalize option', () => {
        it('operates on raw text by default (normalize: false)', () => {
            const result = getCaretBoundaries('កក');
            expect(result).toEqual([0, 1, 2]);
        });

        it('operates on normalized text when normalize: true', () => {
            const text = 'កក';
            const result = getCaretBoundaries(text, { normalize: true });
            const normalized = normalizeKhmer(text);
            expect(result[result.length - 1]).toBe(normalized.length);
        });

        it('returns positions in normalized-text space when normalize: true', () => {
            const text = 'កា';
            const result = getCaretBoundaries(text, { normalize: true });
            const normalized = normalizeKhmer(text);
            expect(result[0]).toBe(0);
            expect(result[result.length - 1]).toBe(normalized.length);
        });
    });
});

describe('deleteBackward', () => {
    it('deletes last cluster when cursor at end', () => {
        expect(deleteBackward('កក', 2)).toEqual({
            text: 'ក',
            cursorIndex: 1,
        });
    });

    it('deletes last cluster from coeng text', () => {
        expect(deleteBackward('ក្កក', 4)).toEqual({
            text: 'ក្ក',
            cursorIndex: 3,
        });
    });

    it('is a no-op when cursor at start', () => {
        expect(deleteBackward('ក', 0)).toEqual({
            text: 'ក',
            cursorIndex: 0,
        });
    });

    it('deletes first cluster when cursor in middle', () => {
        expect(deleteBackward('កក', 1)).toEqual({
            text: 'ក',
            cursorIndex: 0,
        });
    });

    it('clamps cursor to end when cursorIndex > text.length', () => {
        const result = deleteBackward('កក', 999);
        expect(result).toEqual({ text: 'ក', cursorIndex: 1 });
    });

    it('clamps cursor to 0 when cursorIndex < 0', () => {
        expect(deleteBackward('ក', -5)).toEqual({
            text: 'ក',
            cursorIndex: 0,
        });
    });

    it('throws TypeError for non-integer cursorIndex', () => {
        expect(() => deleteBackward('ក', 1.5)).toThrow(TypeError);
        expect(() => deleteBackward('ក', NaN)).toThrow(TypeError);
        expect(() => deleteBackward('ក', Infinity)).toThrow(TypeError);
    });

    it('is a no-op for empty string', () => {
        expect(deleteBackward('', 0)).toEqual({ text: '', cursorIndex: 0 });
    });

    it('deletes entire coeng cluster', () => {
        expect(deleteBackward('ក្ក', 3)).toEqual({
            text: '',
            cursorIndex: 0,
        });
    });

    it('handles consecutive deletes producing consistent state', () => {
        const r1 = deleteBackward('កកក', 3);
        expect(r1).toEqual({ text: 'កក', cursorIndex: 2 });
        const r2 = deleteBackward(r1.text, r1.cursorIndex);
        expect(r2).toEqual({ text: 'ក', cursorIndex: 1 });
        const r3 = deleteBackward(r2.text, r2.cursorIndex);
        expect(r3).toEqual({ text: '', cursorIndex: 0 });
    });

    it('handles mixed Khmer and Latin text', () => {
        expect(deleteBackward('កa', 2)).toEqual({
            text: 'ក',
            cursorIndex: 1,
        });
    });

    it('deletes Latin character before cursor', () => {
        expect(deleteBackward('aក', 1)).toEqual({
            text: 'ក',
            cursorIndex: 0,
        });
    });

    it('handles consonant with vowel as single unit', () => {
        expect(deleteBackward('កាក', 3)).toEqual({
            text: 'កា',
            cursorIndex: 2,
        });
    });

    it('handles text with spaces', () => {
        expect(deleteBackward('ក ក', 3)).toEqual({
            text: 'ក ',
            cursorIndex: 2,
        });
    });

    describe('normalize option', () => {
        it('operates on raw text by default', () => {
            const result = deleteBackward('កក', 2);
            expect(result.text).toBe('ក');
        });

        it('operates on normalized text when normalize: true', () => {
            const text = 'កក';
            const result = deleteBackward(text, 2, { normalize: true });
            const normalized = normalizeKhmer(text);
            expect(result.cursorIndex).toBeLessThanOrEqual(normalized.length);
        });
    });
});
