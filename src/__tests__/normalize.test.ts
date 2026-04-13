import { describe, it, expect } from 'vitest';
import { normalizeKhmer, normalizeKhmerCluster } from '../core/normalize';

describe('normalizeKhmerCluster', () => {
    it('returns single character unchanged', () => {
        expect(normalizeKhmerCluster('ក')).toBe('ក');
    });

    it('returns already-canonical cluster unchanged', () => {
        const input = 'ក្លី';
        expect(normalizeKhmerCluster(input)).toBe(input);
    });

    it('reorders misplaced vowel before coeng pair', () => {
        const consonant = '\u1780';
        const vowelI = '\u17B7';
        const coeng = '\u17D2';
        const consonantKa = '\u1780';

        const canonical = consonant + coeng + consonantKa + vowelI;
        const reordered = consonant + vowelI + coeng + consonantKa;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('reorders misplaced sign before vowel', () => {
        const consonant = '\u1780';
        const vowelA = '\u17B6';
        const bantoc = '\u17CB';

        const canonical = consonant + vowelA + bantoc;
        const reordered = consonant + bantoc + vowelA;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('handles coeng pair without following consonant', () => {
        const consonant = '\u1780';
        const coeng = '\u17D2';
        const input = consonant + coeng;

        expect(normalizeKhmerCluster(input)).toBe(input);
    });

    it('places MUUSIKATOAN before dependent vowels', () => {
        const mu = '\u1798'; // ម
        const muusikatoan = '\u17C9'; // ៉
        const oo = '\u17C4'; // ូ

        const canonical = mu + muusikatoan + oo;
        const reordered = mu + oo + muusikatoan;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('places TRIISAP before dependent vowels', () => {
        const ha = '\u17A0'; // ហ
        const triisap = '\u17CA'; // ៊
        const e = '\u17C1'; // េ

        const canonical = ha + triisap + e;
        const reordered = ha + e + triisap;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('normalizes ម៉ូ cluster correctly', () => {
        const cluster = '\u1798\u17C9\u17C4'; // ម៉ូ
        expect(normalizeKhmerCluster(cluster)).toBe(cluster);

        const reordered = '\u1798\u17C4\u17C9'; // មូ៉
        expect(normalizeKhmerCluster(reordered)).toBe(cluster);
    });

    it('keeps other signs after vowels', () => {
        const ka = '\u1780'; // ក
        const aa = '\u17B6'; // ា
        const nikahit = '\u17C6'; // ំ

        const canonical = ka + aa + nikahit;
        const reordered = ka + nikahit + aa;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });
});

describe('normalizeKhmer', () => {
    it('returns empty string unchanged', () => {
        expect(normalizeKhmer('')).toBe('');
    });

    it('returns Latin text unchanged', () => {
        expect(normalizeKhmer('Hello')).toBe('Hello');
    });

    it('returns already-normalized Khmer unchanged', () => {
        const input = 'សួស្តី';
        expect(normalizeKhmer(input)).toBe(input);
    });

    it('normalizes mixed text leaving Latin unchanged', () => {
        const result = normalizeKhmer('Hello');
        expect(result).toBe('Hello');
    });

    it('normalizes clusters with reordered marks', () => {
        const consonant = '\u1780';
        const bantoc = '\u17CB';
        const vowelA = '\u17B6';

        const canonical = consonant + vowelA + bantoc;
        const reordered = consonant + bantoc + vowelA;

        expect(normalizeKhmer(reordered)).toBe(canonical);
    });

    it('handles Khmer text with spaces', () => {
        const result = normalizeKhmer('ក ខ');
        expect(result).toBe('ក ខ');
    });

    it('strips zero-width space (U+200B) between Khmer clusters', () => {
        const input = 'ស\u200Bប្តា\u200Bហ៍';
        expect(normalizeKhmer(input)).toBe('សប្តាហ៍');
    });

    it('strips multiple invisible characters', () => {
        const input = 'ក\u200B\u200C\uFEFFខ';
        expect(normalizeKhmer(input)).toBe('កខ');
    });

    it('preserves regular spaces while stripping invisible chars', () => {
        const input = 'ក\u200B ខ';
        expect(normalizeKhmer(input)).toBe('ក ខ');
    });

    it('strips invisible chars from mixed Khmer and Latin text', () => {
        const input = 'ក\u200Bhello\u200Dខ';
        expect(normalizeKhmer(input)).toBe('កhelloខ');
    });

    it('normalizes ម៉ូតូ preserving MUUSIKATOAN before vowel', () => {
        const input = 'ម៉ូតូ';
        expect(normalizeKhmer(input)).toBe(input);
    });

    it('normalizes ប៉ុស្តិ៍ preserving MUUSIKATOAN before vowel', () => {
        const input = 'ប៉ុស្តិ៍';
        expect(normalizeKhmer(input)).toBe(input);
    });

    it('throws for non-string input', () => {
        expect(() => normalizeKhmer(42 as unknown as string)).toThrow(
            TypeError
        );
    });
});

describe('normalizeKhmerCluster edge cases', () => {
    it('fixes composite vowel េ + ី → ើ', () => {
        const ka = '\u1780';
        const e = '\u17C1';
        const ii = '\u17B8';
        const oe = '\u17BE';

        const canonical = ka + oe;
        const split = ka + e + ii;

        expect(normalizeKhmerCluster(split)).toBe(canonical);
    });

    it('fixes composite vowel េ + ា → ោ', () => {
        const ka = '\u1780';
        const e = '\u17C1';
        const aa = '\u17B6';
        const oo = '\u17C4';

        const canonical = ka + oo;
        const split = ka + e + aa;

        expect(normalizeKhmerCluster(split)).toBe(canonical);
    });

    it('places ROBAT (U+17CC) after coeng pairs but before shift signs', () => {
        const ka = '\u1780';
        const coeng = '\u17D2';
        const no = '\u1793';
        const robat = '\u17CC';
        const muusikatoan = '\u17C9';
        const vowel = '\u17B6';

        const canonical = ka + coeng + no + robat + muusikatoan + vowel;
        const reordered = ka + muusikatoan + vowel + robat + coeng + no;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('places coeng+RO after non-RO coeng pairs', () => {
        const ka = '\u1780';
        const coeng = '\u17D2';
        const no = '\u1793';
        const ro = '\u179A';
        const vowel = '\u17B6';

        const canonical = ka + coeng + no + coeng + ro + vowel;
        const reordered = ka + coeng + ro + coeng + no + vowel;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('handles multiple coeng pairs preserving relative order', () => {
        const ka = '\u1780';
        const coeng = '\u17D2';
        const ta = '\u178F';
        const no = '\u1793';
        const vowel = '\u17C1';

        const canonical = ka + coeng + ta + coeng + no + vowel;
        const reordered = ka + vowel + coeng + ta + coeng + no;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('handles SAMYOK SANNYA (U+17D0) as a sign', () => {
        const ka = '\u1780';
        const vowel = '\u17B6';
        const samyok = '\u17D0';

        const canonical = ka + vowel + samyok;
        const reordered = ka + samyok + vowel;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('handles BANTOC (U+17CB) ordering after vowels', () => {
        const ka = '\u1780';
        const vowel = '\u17B6';
        const bantoc = '\u17CB';

        const canonical = ka + vowel + bantoc;
        const reordered = ka + bantoc + vowel;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('handles NIKAHIT (U+17C6) as a sign after vowels', () => {
        const ka = '\u1780';
        const vowel = '\u17B6';
        const nikahit = '\u17C6';

        const canonical = ka + vowel + nikahit;
        const reordered = ka + nikahit + vowel;

        expect(normalizeKhmerCluster(reordered)).toBe(canonical);
    });

    it('normalization is idempotent', () => {
        const input = 'ខ្មែរ';
        const first = normalizeKhmerCluster(input);
        const second = normalizeKhmerCluster(first);
        expect(second).toBe(first);
    });

    it('handles ROBAT alone without coeng', () => {
        const ka = '\u1780';
        const robat = '\u17CC';
        const input = ka + robat;
        expect(normalizeKhmerCluster(input)).toBe(input);
    });
});
