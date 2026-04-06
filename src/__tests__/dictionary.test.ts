import { describe, it, expect } from 'vitest';
import { createDictionary } from '../dictionary/create-dictionary';

describe('createDictionary', () => {
    it('creates a dictionary from word list', () => {
        const dict = createDictionary(['សួស្តី', 'អ្នក', 'ក្មែរ']);
        expect(dict.has('សួស្តី')).toBe(true);
        expect(dict.has('អ្នក')).toBe(true);
        expect(dict.has('ក្មែរ')).toBe(true);
    });

    it('returns false for unknown words', () => {
        const dict = createDictionary(['សួស្តី']);
        expect(dict.has('xyz')).toBe(false);
        expect(dict.has('')).toBe(false);
    });

    it('returns false for empty dictionary', () => {
        const dict = createDictionary([]);
        expect(dict.has('សួស្តី')).toBe(false);
    });

    it('handles duplicate words', () => {
        const dict = createDictionary(['ក', 'ក', 'ខ']);
        expect(dict.has('ក')).toBe(true);
        expect(dict.has('ខ')).toBe(true);
    });

    it('filters out empty strings', () => {
        const dict = createDictionary(['', 'ក']);
        expect(dict.has('')).toBe(false);
        expect(dict.has('ក')).toBe(true);
    });
});

describe('hasPrefix', () => {
    it('returns true for a prefix of a known word', () => {
        const dict = createDictionary(['សួស្តី']);
        expect(dict.hasPrefix!('សួ')).toBe(true);
        expect(dict.hasPrefix!('សួស')).toBe(true);
        expect(dict.hasPrefix!('សួស្តី')).toBe(true);
    });

    it('returns true for single-character prefix', () => {
        const dict = createDictionary(['កខ']);
        expect(dict.hasPrefix!('ក')).toBe(true);
    });

    it('returns false for non-matching prefix', () => {
        const dict = createDictionary(['កខ']);
        expect(dict.hasPrefix!('គ')).toBe(false);
    });

    it('returns false for prefix longer than any word', () => {
        const dict = createDictionary(['កខ']);
        expect(dict.hasPrefix!('កខគ')).toBe(false);
    });

    it('returns false for empty dictionary', () => {
        const dict = createDictionary([]);
        expect(dict.hasPrefix!('ក')).toBe(false);
    });
});

describe('hasSuffix', () => {
    it('returns true for a suffix of a known word', () => {
        const dict = createDictionary(['សួស្តី']);
        expect(dict.hasSuffix!('ី')).toBe(true);
        expect(dict.hasSuffix!('្តី')).toBe(true);
    });

    it('returns false for non-matching suffix', () => {
        const dict = createDictionary(['កខ']);
        expect(dict.hasSuffix!('គ')).toBe(false);
    });

    it('returns false for empty dictionary', () => {
        const dict = createDictionary([]);
        expect(dict.hasSuffix!('ក')).toBe(false);
    });
});
