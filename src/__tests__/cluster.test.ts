import { describe, it, expect } from 'vitest';
import {
    splitClusters,
    countClusters,
    getClusterBoundaries,
} from '../core/cluster';

describe('splitClusters', () => {
    it('returns empty array for empty string', () => {
        expect(splitClusters('')).toEqual([]);
    });

    it('splits single consonants into individual clusters', () => {
        expect(splitClusters('កខគ')).toEqual(['ក', 'ខ', 'គ']);
    });

    it('keeps consonant + vowel as one cluster', () => {
        expect(splitClusters('កា')).toEqual(['កា']);
        expect(splitClusters('កិ')).toEqual(['កិ']);
        expect(splitClusters('កី')).toEqual(['កី']);
    });

    it('keeps consonant + coeng + consonant as one cluster', () => {
        expect(splitClusters('ក្ក')).toEqual(['ក្ក']);
        expect(splitClusters('ស្ត')).toEqual(['ស្ត']);
    });

    it('handles full clusters with coeng, vowel, and sign', () => {
        expect(splitClusters('ស្តី')).toEqual(['ស្តី']);
        expect(splitClusters('ក្មែ')).toEqual(['ក្មែ']);
    });

    it('splits multiple clusters correctly', () => {
        const result = splitClusters('សួស្តី');
        expect(result).toEqual(['សួ', 'ស្តី']);
    });

    it('handles consecutive consonants as separate clusters', () => {
        expect(splitClusters('កក')).toEqual(['ក', 'ក']);
    });

    it('treats Latin characters as individual clusters', () => {
        expect(splitClusters('ABC')).toEqual(['A', 'B', 'C']);
    });

    it('handles mixed Khmer and Latin', () => {
        const result = splitClusters('កAខ');
        expect(result).toEqual(['ក', 'A', 'ខ']);
    });

    it('handles spaces as separate clusters', () => {
        const result = splitClusters('ក ខ');
        expect(result).toEqual(['ក', ' ', 'ខ']);
    });

    it('handles consonant with diacritic sign', () => {
        expect(splitClusters('កំ')).toEqual(['កំ']);
        expect(splitClusters('ប៉')).toEqual(['ប៉']);
    });

    it('handles subscript with vowel', () => {
        expect(splitClusters('ក្លី')).toEqual(['ក្លី']);
    });

    it('handles multiple coeng consonants', () => {
        expect(splitClusters('ក្ក្ខ')).toEqual(['ក្ក្ខ']);
    });

    it('handles Khmer digits as individual clusters', () => {
        expect(splitClusters('៥៦៧')).toEqual(['៥', '៦', '៧']);
    });

    it('handles a full word', () => {
        const result = splitClusters('អ្នក');
        expect(result).toEqual(['អ្ន', 'ក']);
    });

    it('handles Khmer punctuation as separate', () => {
        const result = splitClusters('ក។ខ');
        expect(result).toEqual(['ក', '។', 'ខ']);
    });

    it('keeps ROBAT (U+17CC) as part of the cluster', () => {
        const ka = '\u1780';
        const robat = '\u17CC';
        expect(splitClusters(ka + robat)).toEqual([ka + robat]);
    });

    it('keeps consonant + coeng + consonant + ROBAT as one cluster', () => {
        const ka = '\u1780';
        const coeng = '\u17D2';
        const no = '\u1793';
        const robat = '\u17CC';
        expect(splitClusters(ka + coeng + no + robat)).toEqual([
            ka + coeng + no + robat,
        ]);
    });

    it('handles independent vowels as cluster bases', () => {
        const result = splitClusters('ឥត');
        expect(result).toEqual(['ឥ', 'ត']);
    });

    it('handles stacked subscripts', () => {
        const ka = '\u1780';
        const coeng = '\u17D2';
        const ta = '\u178F';
        const no = '\u1793';
        const cluster = ka + coeng + ta + coeng + no;
        expect(splitClusters(cluster)).toEqual([cluster]);
    });
});

describe('countClusters', () => {
    it('returns 0 for empty string', () => {
        expect(countClusters('')).toBe(0);
    });

    it('counts single consonants', () => {
        expect(countClusters('កខគ')).toBe(3);
    });

    it('counts clusters with vowels', () => {
        expect(countClusters('កាំ')).toBe(1);
    });

    it('counts mixed text correctly', () => {
        expect(countClusters('ក A ខ')).toBe(5);
    });

    it('counts subscript clusters as one', () => {
        expect(countClusters('ក្ក្ខ')).toBe(1);
    });

    it('counts real word clusters', () => {
        expect(countClusters('សួស្តី')).toBe(2);
        expect(countClusters('អ្នក')).toBe(2);
    });
});

describe('getClusterBoundaries', () => {
    it('returns empty for empty string', () => {
        expect(getClusterBoundaries('')).toEqual([]);
    });

    it('returns correct boundaries for single characters', () => {
        expect(getClusterBoundaries('កខ')).toEqual([
            { start: 0, end: 1 },
            { start: 1, end: 2 },
        ]);
    });

    it('returns correct boundaries for multi-char clusters', () => {
        const result = getClusterBoundaries('សួស្តី');
        expect(result).toEqual([
            { start: 0, end: 2 },
            { start: 2, end: 6 },
        ]);
    });

    it('returns boundaries that reconstruct the original string', () => {
        const text = 'សួស្តីអ្នក';
        const boundaries = getClusterBoundaries(text);
        const reconstructed = boundaries
            .map(b => text.slice(b.start, b.end))
            .join('');
        expect(reconstructed).toBe(text);
    });
});
