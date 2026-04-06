import { describe, it, expect } from 'vitest';
import { isKhmerChar, containsKhmer, isKhmerText } from '../core/detect';

describe('isKhmerChar', () => {
    it('returns true for Khmer consonants', () => {
        expect(isKhmerChar('ក')).toBe(true);
        expect(isKhmerChar('អ')).toBe(true);
        expect(isKhmerChar('ស')).toBe(true);
    });

    it('returns true for Khmer dependent vowels', () => {
        expect(isKhmerChar('ា')).toBe(true);
        expect(isKhmerChar('ិ')).toBe(true);
        expect(isKhmerChar('ី')).toBe(true);
        expect(isKhmerChar('ោ')).toBe(true);
    });

    it('returns true for Khmer diacritics', () => {
        expect(isKhmerChar('់')).toBe(true);
        expect(isKhmerChar('៉')).toBe(true);
        expect(isKhmerChar('្')).toBe(true);
    });

    it('returns true for Khmer digits', () => {
        expect(isKhmerChar('០')).toBe(true);
        expect(isKhmerChar('៩')).toBe(true);
    });

    it('returns false for Latin characters', () => {
        expect(isKhmerChar('A')).toBe(false);
        expect(isKhmerChar('z')).toBe(false);
    });

    it('returns false for space', () => {
        expect(isKhmerChar(' ')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isKhmerChar('')).toBe(false);
    });

    it('returns false for punctuation', () => {
        expect(isKhmerChar('.')).toBe(false);
        expect(isKhmerChar(',')).toBe(false);
    });
});

describe('containsKhmer', () => {
    it('returns true for pure Khmer text', () => {
        expect(containsKhmer('សួស្តី')).toBe(true);
    });

    it('returns true for mixed Khmer + Latin', () => {
        expect(containsKhmer('Hello សួស្តី')).toBe(true);
        expect(containsKhmer('ក abc')).toBe(true);
    });

    it('returns false for pure Latin text', () => {
        expect(containsKhmer('Hello World')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(containsKhmer('')).toBe(false);
    });

    it('returns false for numbers and punctuation', () => {
        expect(containsKhmer('123.456')).toBe(false);
    });

    it('returns true for text with Khmer digits', () => {
        expect(containsKhmer('៥០០')).toBe(true);
    });
});

describe('isKhmerText', () => {
    it('returns true for pure Khmer text', () => {
        expect(isKhmerText('សួស្តី')).toBe(true);
        expect(isKhmerText('កខគ')).toBe(true);
    });

    it('returns true for Khmer with whitespace', () => {
        expect(isKhmerText('សួស្តី អ្នក')).toBe(true);
    });

    it('returns false for mixed Khmer + Latin', () => {
        expect(isKhmerText('Hello សួស្តី')).toBe(false);
        expect(isKhmerText('សួស្តី world')).toBe(false);
    });

    it('returns false for pure Latin text', () => {
        expect(isKhmerText('Hello')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isKhmerText('')).toBe(false);
    });

    it('returns false for whitespace only', () => {
        expect(isKhmerText('   ')).toBe(false);
    });

    it('returns true for Khmer with Khmer punctuation', () => {
        expect(isKhmerText('សួស្តី។')).toBe(true);
    });

    it('returns true for Khmer digits', () => {
        expect(isKhmerText('៥០០')).toBe(true);
    });
});
