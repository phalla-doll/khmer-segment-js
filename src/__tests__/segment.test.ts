import { describe, it, expect } from 'vitest';
import { segmentWords } from '../core/segment';
import { createDictionary } from '../dictionary/create-dictionary';
import { getDefaultDictionary } from '../dictionary/default-dictionary';

describe('segmentWords', () => {
    const dict = createDictionary(['សួស្តី', 'អ្នក', 'ក្មែរ', 'ទាំងអស់គ្នា']);

    it('segments known words', () => {
        const result = segmentWords('សួស្តី', { dictionary: dict });
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0].value).toBe('សួស្តី');
        expect(result.tokens[0].isKnown).toBe(true);
    });

    it('segments multiple known words', () => {
        const result = segmentWords('សួស្តីអ្នក', { dictionary: dict });
        expect(result.tokens).toHaveLength(2);
        expect(result.tokens[0].value).toBe('សួស្តី');
        expect(result.tokens[0].isKnown).toBe(true);
        expect(result.tokens[1].value).toBe('អ្នក');
        expect(result.tokens[1].isKnown).toBe(true);
    });

    it('marks unknown clusters as unknown', () => {
        const result = segmentWords('សួស្តីគ', { dictionary: dict });
        const unknowns = result.tokens.filter(t => !t.isKnown);
        expect(unknowns.length).toBeGreaterThanOrEqual(1);
        expect(unknowns[0].value).toBe('គ');
    });

    it('returns original and normalized text', () => {
        const result = segmentWords('សួស្តី', { dictionary: dict });
        expect(result.original).toBe('សួស្តី');
        expect(result.normalized).toBe('សួស្តី');
    });

    it('returns unknown tokens when no dictionary provided', () => {
        const result = segmentWords('កខគ');
        expect(result.tokens.every(t => !t.isKnown)).toBe(true);
        expect(result.tokens.map(t => t.value)).toEqual(['ក', 'ខ', 'គ']);
    });

    it('returns empty tokens for empty string', () => {
        const result = segmentWords('', { dictionary: dict });
        expect(result.tokens).toEqual([]);
    });

    it('handles mixed Khmer and Latin without dictionary', () => {
        const result = segmentWords('កA');
        expect(result.tokens).toHaveLength(2);
        expect(result.tokens[0].value).toBe('ក');
        expect(result.tokens[1].value).toBe('A');
    });

    it('respects normalize: false option', () => {
        const result = segmentWords('ក', {
            dictionary: dict,
            normalize: false,
        });
        expect(result.normalized).toBe('ក');
    });

    it('segments a long word with FMM (greedy longest match)', () => {
        const result = segmentWords('ទាំងអស់គ្នា', { dictionary: dict });
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0].value).toBe('ទាំងអស់គ្នា');
        expect(result.tokens[0].isKnown).toBe(true);
    });

    it('computes correct start/end offsets', () => {
        const result = segmentWords('សួស្តីអ្នក', { dictionary: dict });
        expect(result.tokens[0].start).toBe(0);
        expect(result.tokens[0].end).toBe('សួស្តី'.length);
        expect(result.tokens[1].start).toBe('សួស្តី'.length);
        expect(result.tokens[1].end).toBe('សួស្តីអ្នក'.length);
    });

    it('handles text where no word matches', () => {
        const result = segmentWords('ឥត', { dictionary: dict });
        expect(result.tokens.every(t => !t.isKnown)).toBe(true);
    });

    describe('zero-width space handling', () => {
        const defaultDict = getDefaultDictionary();

        const zwsCases = [
            { word: 'សប្តាហ៍', input: 'ស\u200Bប្តា\u200Bហ៍' },
            { word: 'រៀងរាល់', input: 'រៀង\u200Bរាល់' },
            { word: 'កែច្នៃ', input: 'កែ\u200Bច្នៃ' },
        ];

        for (const { word, input } of zwsCases) {
            it(`segments "${word}" with ZWS as known word`, () => {
                const result = segmentWords(input, { dictionary: defaultDict });
                const matched = result.tokens.find(t => t.value === word);
                expect(matched).toBeDefined();
                expect(matched!.isKnown).toBe(true);
            });
        }

        it('keeps token offsets relative to normalized text', () => {
            const input = 'ស\u200Bប្តា\u200Bហ៍';
            const result = segmentWords(input, { dictionary: defaultDict });

            expect(result.original.length).toBeGreaterThan(
                result.normalized.length
            );
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[result.tokens.length - 1].end).toBe(
                result.normalized.length
            );
            expect(result.tokens.map(t => t.value).join('')).toBe(
                result.normalized
            );
            expect(result.tokens[result.tokens.length - 1].end).not.toBe(
                result.original.length
            );
        });
    });

    describe('digit grouping', () => {
        const dict = createDictionary(['សួស្តី', 'អ្នក']);

        it('groups consecutive Khmer digits into a single token', () => {
            const result = segmentWords('១៨៤', { dictionary: dict });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('១៨៤');
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[0].end).toBe(3);
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('groups digits surrounded by words', () => {
            const result = segmentWords('សួស្តី១៨៤អ្នក', { dictionary: dict });
            const digitToken = result.tokens.find(t =>
                /^[\u17E0-\u17E90-9]+$/.test(t.value)
            );
            expect(digitToken).toBeDefined();
            expect(digitToken!.value).toBe('១៨៤');
        });

        it('does not group non-adjacent digits', () => {
            const result = segmentWords('១អ្នក៨', { dictionary: dict });
            const digitTokens = result.tokens.filter(t =>
                /^[\u17E0-\u17E90-9]$/.test(t.value)
            );
            expect(digitTokens).toHaveLength(2);
            expect(digitTokens[0].value).toBe('១');
            expect(digitTokens[1].value).toBe('៨');
        });

        it('groups digits even without dictionary', () => {
            const result = segmentWords('៥៦៧');
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('៥៦៧');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('groups mixed Arabic and Khmer digits into a single token', () => {
            const result = segmentWords('២០2៥', { dictionary: dict });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('២០2៥');
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[0].end).toBe(4);
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('groups pure Arabic digits into a single token', () => {
            const result = segmentWords('2025', { dictionary: dict });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('2025');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('groups mixed digits surrounded by words', () => {
            const result = segmentWords('សួស្តី២០2៥អ្នក', { dictionary: dict });
            const digitToken = result.tokens.find(t =>
                /[\u17E0-\u17E90-9]/.test(t.value)
            );
            expect(digitToken).toBeDefined();
            expect(digitToken!.value).toBe('២០2៥');
        });

        it('groups mixed digits without dictionary', () => {
            const result = segmentWords('១២3៤');
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('១២3៤');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('keeps non-digit unknown tokens as unknown', () => {
            const result = segmentWords('គ៥៦', { dictionary: dict });
            expect(result.tokens).toHaveLength(2);
            expect(result.tokens[0]).toMatchObject({
                value: 'គ',
                isKnown: false,
            });
            expect(result.tokens[1]).toMatchObject({
                value: '៥៦',
                isKnown: true,
            });
        });
    });

    describe('Khmer sentence punctuation knownness', () => {
        const dict = createDictionary(['សួស្តី', 'អ្នក', 'ក្មែរ']);

        it('marks ។, ៕, and ៖ as known in default strategy', () => {
            const result = segmentWords('សួស្តី។អ្នក៕ក្មែរ៖', {
                dictionary: dict,
            });
            const punctuation = result.tokens.filter(t =>
                /[។៕៖]/.test(t.value)
            );
            expect(punctuation.map(t => t.value)).toEqual(['។', '៕', '៖']);
            expect(punctuation.every(t => t.isKnown)).toBe(true);
        });

        it('marks ។, ៕, and ៖ as known in Viterbi', () => {
            const result = segmentWords('សួស្តី។អ្នក៕ក្មែរ៖', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            const punctuation = result.tokens.filter(t =>
                /[។៕៖]/.test(t.value)
            );
            expect(punctuation.map(t => t.value)).toEqual(['។', '៕', '៖']);
            expect(punctuation.every(t => t.isKnown)).toBe(true);
        });

        it('marks Khmer sentence punctuation as known without dictionary', () => {
            const result = segmentWords('គ។៕៖');
            expect(result.tokens).toHaveLength(4);
            expect(result.tokens[0]).toMatchObject({
                value: 'គ',
                isKnown: false,
            });
            expect(result.tokens[1]).toMatchObject({
                value: '។',
                isKnown: true,
            });
            expect(result.tokens[2]).toMatchObject({
                value: '៕',
                isKnown: true,
            });
            expect(result.tokens[3]).toMatchObject({
                value: '៖',
                isKnown: true,
            });
        });
    });

    describe('BMM strategy', () => {
        const dict = createDictionary([
            'សួស្តី',
            'អ្នក',
            'ក្មែរ',
            'ទាំងអស់គ្នា',
        ]);

        it('segments known words with BMM', () => {
            const result = segmentWords('សួស្តី', {
                dictionary: dict,
                strategy: 'bmm',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('segments multiple known words with BMM', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'bmm',
            });
            expect(result.tokens).toHaveLength(2);
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[1].value).toBe('អ្នក');
            expect(result.tokens.every(t => t.isKnown)).toBe(true);
        });

        it('computes correct offsets with BMM', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'bmm',
            });
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[0].end).toBe('សួស្តី'.length);
            expect(result.tokens[1].start).toBe('សួស្តី'.length);
            expect(result.tokens[1].end).toBe('សួស្តីអ្នក'.length);
        });

        it('reconstructs text from BMM tokens', () => {
            const text = 'សួស្តីអ្នកក្មែរ';
            const result = segmentWords(text, {
                dictionary: dict,
                strategy: 'bmm',
            });
            expect(result.tokens.map(t => t.value).join('')).toBe(text);
        });

        it('matches long compound words with BMM', () => {
            const result = segmentWords('ទាំងអស់គ្នា', {
                dictionary: dict,
                strategy: 'bmm',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('ទាំងអស់គ្នា');
            expect(result.tokens[0].isKnown).toBe(true);
        });
    });

    describe('BiMM strategy', () => {
        const dict = createDictionary([
            'សួស្តី',
            'អ្នក',
            'ក្មែរ',
            'ទាំងអស់គ្នា',
        ]);

        it('segments known words with BiMM', () => {
            const result = segmentWords('សួស្តី', {
                dictionary: dict,
                strategy: 'bimm',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('segments multiple known words with BiMM', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'bimm',
            });
            expect(result.tokens).toHaveLength(2);
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[1].value).toBe('អ្នក');
            expect(result.tokens.every(t => t.isKnown)).toBe(true);
        });

        it('computes correct offsets with BiMM', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'bimm',
            });
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[result.tokens.length - 1].end).toBe(
                'សួស្តីអ្នក'.length
            );
        });

        it('reconstructs text from BiMM tokens', () => {
            const text = 'សួស្តីអ្នកក្មែរ';
            const result = segmentWords(text, {
                dictionary: dict,
                strategy: 'bimm',
            });
            expect(result.tokens.map(t => t.value).join('')).toBe(text);
        });

        it('matches long compound words with BiMM', () => {
            const result = segmentWords('ទាំងអស់គ្នា', {
                dictionary: dict,
                strategy: 'bimm',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('ទាំងអស់គ្នា');
            expect(result.tokens[0].isKnown).toBe(true);
        });
    });

    describe('number word recognition', () => {
        const dict = getDefaultDictionary();

        it('recognizes basic number words', () => {
            const result = segmentWords('មួយ', { dictionary: dict });
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('recognizes multiple number words', () => {
            const result = segmentWords('មួយពីរបួន', { dictionary: dict });
            expect(result.tokens.map(t => t.value)).toEqual([
                'មួយ',
                'ពីរ',
                'បួន',
            ]);
            expect(result.tokens.every(t => t.isKnown)).toBe(true);
        });

        it('recognizes place value words', () => {
            const result = segmentWords('រយពាន់ម៉ឺនសែនលាន', {
                dictionary: dict,
            });
            expect(result.tokens.every(t => t.isKnown)).toBe(true);
        });

        it('recognizes compound number words', () => {
            const result = segmentWords('ដប់មួយ', { dictionary: dict });
            expect(result.tokens.every(t => t.isKnown)).toBe(true);
        });

        it('recognizes tens place words', () => {
            const result = segmentWords('សាមសិប', { dictionary: dict });
            expect(result.tokens[0].value).toBe('សាមសិប');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('segments mixed text with number words', () => {
            const result = segmentWords('មានមួយពីរបី', { dictionary: dict });
            const reconstructed = result.tokens.map(t => t.value).join('');
            expect(reconstructed).toBe('មានមួយពីរបី');
        });
    });

    describe('strategy comparison', () => {
        it('defaults to FMM when no strategy specified', () => {
            const dict = createDictionary(['សួស្តី']);
            const result = segmentWords('សួស្តី', { dictionary: dict });
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('all strategies produce contiguous offsets', () => {
            const dict = getDefaultDictionary();
            const text = 'ក្រោយពីមានការផ្សព្វផ្សាយ';

            for (const strategy of ['fmm', 'bmm', 'bimm', 'viterbi'] as const) {
                const result = segmentWords(text, {
                    dictionary: dict,
                    strategy,
                });
                expect(result.tokens[0].start).toBe(0);
                expect(result.tokens[result.tokens.length - 1].end).toBe(
                    result.normalized.length
                );
                for (let j = 1; j < result.tokens.length; j++) {
                    expect(result.tokens[j].start).toBe(
                        result.tokens[j - 1].end
                    );
                }
            }
        });

        it('all strategies reconstruct the same text', () => {
            const dict = getDefaultDictionary();
            const text = 'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា';

            for (const strategy of ['fmm', 'bmm', 'bimm', 'viterbi'] as const) {
                const result = segmentWords(text, {
                    dictionary: dict,
                    strategy,
                });
                expect(result.tokens.map(t => t.value).join('')).toBe(
                    result.normalized
                );
            }
        });
    });

    describe('Viterbi strategy', () => {
        const dict = createDictionary(
            ['សួស្តី', 'អ្នក', 'ក្មែរ', 'ទាំងអស់គ្នា'],
            new Map([
                ['សួស្តី', 100],
                ['អ្នក', 200],
                ['ក្មែរ', 150],
                ['ទាំងអស់គ្នា', 50],
            ])
        );

        it('segments known words with Viterbi', () => {
            const result = segmentWords('សួស្តី', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('segments multiple known words with Viterbi', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens).toHaveLength(2);
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[1].value).toBe('អ្នក');
            expect(result.tokens.every(t => t.isKnown)).toBe(true);
        });

        it('computes correct offsets with Viterbi', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[0].end).toBe('សួស្តី'.length);
            expect(result.tokens[1].start).toBe('សួស្តី'.length);
            expect(result.tokens[1].end).toBe('សួស្តីអ្នក'.length);
        });

        it('reconstructs text from Viterbi tokens', () => {
            const text = 'សួស្តីអ្នកក្មែរ';
            const result = segmentWords(text, {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens.map(t => t.value).join('')).toBe(text);
        });

        it('matches long compound words with Viterbi', () => {
            const result = segmentWords('ទាំងអស់គ្នា', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].value).toBe('ទាំងអស់គ្នា');
            expect(result.tokens[0].isKnown).toBe(true);
        });

        it('handles unknown words with Viterbi', () => {
            const result = segmentWords('សួស្តីគ', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens[0].value).toBe('សួស្តី');
            expect(result.tokens[0].isKnown).toBe(true);
            const unknowns = result.tokens.filter(t => !t.isKnown);
            expect(unknowns.length).toBeGreaterThanOrEqual(1);
        });

        it('marks Khmer and ASCII digit runs as known with Viterbi', () => {
            const result = segmentWords('១២3៤', {
                dictionary: dict,
                strategy: 'viterbi',
            });
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0]).toMatchObject({
                value: '១២3៤',
                isKnown: true,
            });
        });

        it('prefers common words over rare words with frequency weighting', () => {
            const freqDict = createDictionary(
                ['ក', 'កន្ត្រក', 'ន្ត្រក'],
                new Map([
                    ['ក', 10],
                    ['កន្ត្រក', 500],
                    ['ន្ត្រក', 5],
                ])
            );
            const result = segmentWords('កន្ត្រក', {
                dictionary: freqDict,
                strategy: 'viterbi',
            });
            const word = result.tokens.find(t => t.value === 'កន្ត្រក');
            expect(word).toBeDefined();
            expect(word!.isKnown).toBe(true);
        });

        it('supports boundary penalty to reduce over-segmentation', () => {
            const freqDict = createDictionary(
                ['ក', 'ម្ពុជា', 'កម្ពុជា'],
                new Map([
                    ['ក', 1000],
                    ['ម្ពុជា', 1000],
                    ['កម្ពុជា', 100],
                ])
            );

            const noPenalty = segmentWords('កម្ពុជា', {
                dictionary: freqDict,
                strategy: 'viterbi',
                viterbiBoundaryPenalty: 0,
            });
            expect(noPenalty.tokens.map(t => t.value)).toEqual(['ក', 'ម្ពុជា']);

            const highPenalty = segmentWords('កម្ពុជា', {
                dictionary: freqDict,
                strategy: 'viterbi',
                viterbiBoundaryPenalty: 10,
            });
            expect(highPenalty.tokens.map(t => t.value)).toEqual(['កម្ពុជា']);
        });

        it('ignores invalid boundary penalty values', () => {
            const result = segmentWords('សួស្តីអ្នក', {
                dictionary: dict,
                strategy: 'viterbi',
                viterbiBoundaryPenalty: -1,
            });
            expect(result.tokens.map(t => t.value).join('')).toBe('សួស្តីអ្នក');
        });

        it('offsets are contiguous for Viterbi on real text', () => {
            const defaultDict = getDefaultDictionary();
            const text = 'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា';
            const result = segmentWords(text, {
                dictionary: defaultDict,
                strategy: 'viterbi',
            });
            expect(result.tokens[0].start).toBe(0);
            expect(result.tokens[result.tokens.length - 1].end).toBe(
                result.normalized.length
            );
            for (let i = 1; i < result.tokens.length; i++) {
                expect(result.tokens[i].start).toBe(result.tokens[i - 1].end);
            }
        });

        it('reconstructs real-world text with Viterbi', () => {
            const defaultDict = getDefaultDictionary();
            const text =
                'កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។ ' +
                'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា។';
            const result = segmentWords(text, {
                dictionary: defaultDict,
                strategy: 'viterbi',
            });
            expect(result.tokens.map(t => t.value).join('')).toBe(text);
        });

        it('is deterministic across repeated runs', () => {
            const defaultDict = getDefaultDictionary();
            const text = 'ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា';
            const results = [];
            for (let i = 0; i < 5; i++) {
                results.push(
                    segmentWords(text, {
                        dictionary: defaultDict,
                        strategy: 'viterbi',
                    })
                );
            }
            const expected = results[0].tokens.map(t => t.value);
            for (const r of results) {
                expect(r.tokens.map(t => t.value)).toEqual(expected);
            }
        });
    });
});
