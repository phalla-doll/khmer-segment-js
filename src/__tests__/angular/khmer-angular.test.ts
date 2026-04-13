import { describe, expect, it } from 'vitest';
import { deleteBackward, getCaretBoundaries } from '../../core/caret';
import { containsKhmer, isKhmerText } from '../../core/detect';
import { normalizeKhmer } from '../../core/normalize';
import { segmentWords } from '../../core/segment';
import { KhmerNormalizePipe, KhmerSegmentService } from '../../angular';

describe('KhmerSegmentService', () => {
    const service = new KhmerSegmentService();

    it('matches detect helpers', () => {
        expect(service.containsKhmer('Hello សួស្តី')).toBe(
            containsKhmer('Hello សួស្តី')
        );
        expect(service.isKhmerText('សួស្តីអ្នក')).toBe(isKhmerText('សួស្តីអ្នក'));
    });

    it('matches normalize helper', () => {
        const value = '\u200Bក\u200Bក\u200B';
        expect(service.normalizeKhmer(value)).toBe(normalizeKhmer(value));
    });

    it('segments text with a dictionary created by the service', () => {
        const dictionary = service.createDictionary(['សួស្តី', 'អ្នក']);
        const result = service.segmentWords('សួស្តីអ្នក', { dictionary });
        const expected = segmentWords('សួស្តីអ្នក', { dictionary });

        expect(result).toEqual(expected);
        expect(result.tokens.map(token => token.value)).toEqual([
            'សួស្តី',
            'អ្នក',
        ]);
    });

    it('matches caret helpers', () => {
        const value = 'ក្កក';
        expect(service.getCaretBoundaries(value)).toEqual(
            getCaretBoundaries(value)
        );
        expect(service.deleteBackward(value, value.length)).toEqual(
            deleteBackward(value, value.length)
        );
    });
});

describe('KhmerNormalizePipe', () => {
    const pipe = new KhmerNormalizePipe();

    it('normalizes Khmer text using core normalization', () => {
        const value = '\u200Bក\u200Bក\u200B';
        expect(pipe.transform(value)).toBe(normalizeKhmer(value));
    });

    it('returns an empty string for nullish values', () => {
        expect(pipe.transform(null)).toBe('');
        expect(pipe.transform(undefined)).toBe('');
    });
});
