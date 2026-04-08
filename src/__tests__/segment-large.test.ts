import { describe, it, expect } from 'vitest';
import { segmentWords } from '../core/segment';
import { getDefaultDictionary } from '../dictionary/default-dictionary';

describe('large text correctness', () => {
    const dict = getDefaultDictionary();

    it('tokens reconstruct the original text', () => {
        const text = 'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា';
        const result = segmentWords(text, { dictionary: dict });

        const joined = result.tokens.map(t => t.value).join('');
        expect(joined).toBe(text);
    });

    it('offsets are contiguous and non-overlapping', () => {
        const text =
            'សួស្តីអ្នកទាំងអស់គ្នាក្នុងប្រទេសកម្ពុជាខ្ញុំសរសេរភាសាខ្មែរ';
        const result = segmentWords(text, { dictionary: dict });

        expect(result.tokens[0].start).toBe(0);
        for (let i = 1; i < result.tokens.length; i++) {
            expect(result.tokens[i].start).toBe(result.tokens[i - 1].end);
        }
        expect(result.tokens[result.tokens.length - 1].end).toBe(text.length);
    });

    it('repeating text produces consistent tokens', () => {
        const sentence = 'សួស្តីអ្នក';
        const text = sentence.repeat(100);
        const result = segmentWords(text, { dictionary: dict });

        const firstRound = result.tokens.filter(t => t.start < sentence.length);
        for (let i = 0; i < 100; i++) {
            const offset = i * sentence.length;
            const roundTokens = result.tokens.filter(
                t => t.start >= offset && t.end <= offset + sentence.length
            );
            expect(roundTokens.map(t => t.value).join('')).toBe(sentence);
            expect(roundTokens.map(t => t.isKnown)).toEqual(
                firstRound.map(t => t.isKnown)
            );
        }
    });

    it('segments a full Khmer paragraph with reasonable known-word ratio', () => {
        const paragraph =
            'កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។ ' +
            'ប្រជាជនខ្មែររស់នៅលើទឹកដីនេះអស់រយៈពេលជាយូរលង់មកហើយ។ ' +
            'ភាសាខ្មែរជាភាសាជាតិដែលប្រើប្រាស់នៅក្នុងប្រទេសកម្ពុជា។ ' +
            'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា។ ' +
            'សួស្តីអ្នកទាំងអស់គ្នានៅក្នុងព្រះរាជាណាចក្រកម្ពុជា។';
        const result = segmentWords(paragraph, { dictionary: dict });

        const joined = result.tokens.map(t => t.value).join('');
        expect(joined).toBe(result.normalized);

        const knownRatio =
            result.tokens.filter(t => t.isKnown).length / result.tokens.length;
        expect(knownRatio).toBeGreaterThan(0.3);
    });

    it('handles text with spaces and punctuation', () => {
        const text = 'សួស្តី អ្នក។ កម្ពុជា!';
        const result = segmentWords(text, { dictionary: dict });

        const joined = result.tokens.map(t => t.value).join('');
        expect(joined).toBe(text);

        expect(result.tokens[0].start).toBe(0);
        expect(result.tokens[result.tokens.length - 1].end).toBe(text.length);
    });

    it('handles mixed Khmer and Latin text', () => {
        const text = 'ខ្ញុំសរសេរ Khmer text ភាសាខ្មែរ';
        const result = segmentWords(text, { dictionary: dict });

        const joined = result.tokens.map(t => t.value).join('');
        expect(joined).toBe(text);

        const khmerTokens = result.tokens.filter(t =>
            /[\u1780-\u17FF]/.test(t.value)
        );
        expect(khmerTokens.length).toBeGreaterThan(0);
    });

    it('segments real-world news text with ZWS as compound known words', () => {
        const text =
            'ផលិតផល\u200Bខ្មែរ\u200Bច្រើន\u200Bមុខ \u200Bដាំ\u200Bដុះ និង\u200Bកែ\u200Bច្នៃ\u200Bដោយ\u200Bកសិករ ផលិតករ និង\u200Bសិប្បករ\u200Bខ្មែរ នៅ\u200Bក្នុង\u200Bខេត្តកំពង់ស្ពឺ\u200B នៅ\u200Bតែ\u200Bបន្ត\u200Bដាក់\u200Bលក់\u200Bរៀង\u200Bរាល់\u200Bចុង\u200Bស\u200Bប្តា\u200Bហ៍';

        const result = segmentWords(text, {
            dictionary: dict,
            strategy: 'fmm',
        });

        const joined = result.tokens.map(t => t.value).join('');
        expect(joined).toBe(result.normalized);

        expect(result.tokens[0].start).toBe(0);
        expect(result.tokens[result.tokens.length - 1].end).toBe(
            result.normalized.length
        );

        expect(result.tokens.every(t => t.value !== '\u200B')).toBe(true);

        const compoundKnown = ['កែច្នៃ', 'រៀងរាល់', 'សប្តាហ៍'];
        for (const word of compoundKnown) {
            const tok = result.tokens.find(t => t.value === word);
            expect(tok).toBeDefined();
            expect(tok!.isKnown).toBe(true);
        }

        const knownRatio =
            result.tokens.filter(t => t.isKnown).length / result.tokens.length;
        expect(knownRatio).toBeGreaterThan(0.6);
    });

    it('segments real-world accident report with ZWS as compound known words', () => {
        const text =
            'យោង\u200Bតាម\u200Bការ\u200Bពិនិត្យ\u200Bជាក់ស្តែង\u200Bនៅ\u200Bកន្លែង\u200Bកើតហេតុ ' +
            'គ្រោះថ្នាក់\u200Bនេះ\u200Bបាន\u200Bបណ្តាល\u200Bឱ្យរ\u200Bថយន្ត\u200Bក្នុង\u200Bក្បួន\u200Bចំនួន ០៤ គ្រឿង ' +
            'រង\u200Bការ\u200Bខូចខាត \u200B។ ' +
            'ក្នុង\u200Bនោះ\u200Bមាន ០១ គ្រឿង\u200Bខូចខាត\u200Bធ្ងន់ធ្ងរ (\u200Bផ្នែក\u200Bខាង\u200Bមុខ\u200B) ' +
            'រហូត\u200Bមិន\u200Bអាច\u200Bធ្វើ\u200Bដំណើរ\u200Bទៅ\u200Bមុខ\u200Bទៀត\u200Bបាន \u200B។ ' +
            '\u200Bរថយន្ត ០៣ គ្រឿង\u200Bទៀត\u200Bរង\u200Bការ\u200Bខូចខាត\u200Bស្រាល\u200B';

        const result = segmentWords(text, {
            dictionary: dict,
            strategy: 'fmm',
        });

        // Tokens must reconstruct the normalized text (ZWS stripped)
        const joined = result.tokens.map(t => t.value).join('');
        expect(joined).toBe(result.normalized);

        // Offsets are contiguous and span the full normalized text
        expect(result.tokens[0].start).toBe(0);
        expect(result.tokens[result.tokens.length - 1].end).toBe(
            result.normalized.length
        );

        // No ZWS tokens should remain
        expect(result.tokens.every(t => t.value !== '\u200B')).toBe(true);

        // Normalized text should have ZWS stripped (shorter than original)
        expect(result.normalized.length).toBeLessThan(result.original.length);

        // Key compound words that FMM must recognize as single known tokens
        const compoundKnown = [
            'រថយន្ត', // car — first occurrence had ZWS splitting the word
            'យោងតាម', // according to
            'ការពិនិត្យ', // inspection
            'កើតហេតុ', // incident
            'គ្រោះថ្នាក់', // accident
            'ខូចខាត', // damage
            'ធ្ងន់ធ្ងរ', // severe
            'មិនអាច', // cannot
            'ធ្វើដំណើរ', // travel
            'ទៅមុខ', // forward
            'ខាងមុខ', // front
            'រងការ', // suffer (FMM matches this before រង + ការ)
        ];

        for (const word of compoundKnown) {
            const tok = result.tokens.find(t => t.value === word);
            expect(tok, `Expected "${word}" to be a known token`).toBeDefined();
            expect(tok!.isKnown).toBe(true);
        }

        // The first occurrence of រថយន្ត had ZWS splitting "រ" from "ថយន្ត"
        // After normalization strips ZWS, FMM must match it as a single word
        const carTokens = result.tokens.filter(t => t.value === 'រថយន្ត');
        expect(carTokens.length).toBe(2); // appears twice in the text
        expect(carTokens.every(t => t.isKnown)).toBe(true);

        // Reasonable known-word ratio
        const knownRatio =
            result.tokens.filter(t => t.isKnown).length / result.tokens.length;
        expect(knownRatio).toBeGreaterThan(0.5);
    });
});
