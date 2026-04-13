// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDictionary } from '../../dictionary/create-dictionary';
import { useKhmerSegments, type UseKhmerSegmentsInput } from '../../react';

describe('useKhmerSegments', () => {
    it('returns deterministic segmentation output for Khmer text', () => {
        const dict = createDictionary(['សួស្តី', 'អ្នក']);
        const { result } = renderHook(({ input }) => useKhmerSegments(input), {
            initialProps: {
                input: {
                    value: 'សួស្តីអ្នក',
                    dictionary: dict,
                    segmentOptions: { strategy: 'viterbi' as const },
                },
            },
        });

        expect(result.current.tokens.map(token => token.value)).toEqual([
            'សួស្តី',
            'អ្នក',
        ]);
        expect(result.current.segment.normalized).toBe('សួស្តីអ្នក');
    });

    it('updates when value changes', () => {
        const { result, rerender } = renderHook(
            ({ input }) => useKhmerSegments(input),
            {
                initialProps: { input: { value: 'កខ' } },
            }
        );

        expect(result.current.tokens.map(token => token.value)).toEqual([
            'ក',
            'ខ',
        ]);

        rerender({ input: { value: 'កខគ' } });
        expect(result.current.tokens.map(token => token.value)).toEqual([
            'ក',
            'ខ',
            'គ',
        ]);
    });

    it('updates when dictionary changes', () => {
        const smallDict = createDictionary(['ក']);
        const largerDict = createDictionary(['កខ']);
        const { result, rerender } = renderHook(
            ({ input }) => useKhmerSegments(input),
            {
                initialProps: {
                    input: {
                        value: 'កខ',
                        dictionary: smallDict,
                        segmentOptions: { strategy: 'fmm' as const },
                    },
                },
            }
        );

        expect(result.current.tokens.map(token => token.value)).toEqual([
            'ក',
            'ខ',
        ]);

        rerender({
            input: {
                value: 'កខ',
                dictionary: largerDict,
                segmentOptions: { strategy: 'fmm' as const },
            },
        });

        const updated = result.current;
        expect(updated.tokens.map(token => token.value)).toEqual(['កខ']);
        expect(updated.tokens[0]?.isKnown).toBe(true);
    });

    it('returns a stable memoized result when inputs are unchanged', () => {
        const dict = createDictionary(['សួស្តី', 'អ្នក']);
        const input: UseKhmerSegmentsInput = {
            value: 'សួស្តីអ្នក',
            dictionary: dict,
            segmentOptions: { strategy: 'viterbi', normalize: true },
        };
        const { result, rerender } = renderHook(
            ({ hookInput }) => useKhmerSegments(hookInput),
            { initialProps: { hookInput: input } }
        );

        const first = result.current;
        rerender({ hookInput: { ...input } });
        const second = result.current;

        expect(second).toBe(first);
        expect(second.segment).toBe(first.segment);
        expect(second.tokens).toBe(first.tokens);
    });

    it('recomputes when segment options change', () => {
        const dict = createDictionary(
            ['កម្ពុជា', 'ក', 'ម្ពុជា'],
            new Map([
                ['កម្ពុជា', 100],
                ['ក', 1000],
                ['ម្ពុជា', 1000],
            ])
        );
        const { result, rerender } = renderHook(
            ({ input }) => useKhmerSegments(input),
            {
                initialProps: {
                    input: {
                        value: 'កម្ពុជា',
                        dictionary: dict,
                        segmentOptions: {
                            strategy: 'viterbi' as const,
                            viterbiBoundaryPenalty: 0,
                        },
                    },
                },
            }
        );

        const lowPenaltyTokens = result.current.tokens.map(
            token => token.value
        );

        rerender({
            input: {
                value: 'កម្ពុជា',
                dictionary: dict,
                segmentOptions: {
                    strategy: 'viterbi' as const,
                    viterbiBoundaryPenalty: 10,
                },
            },
        });

        const highPenaltyTokens = result.current.tokens.map(
            token => token.value
        );
        expect(highPenaltyTokens).not.toEqual(lowPenaltyTokens);
    });
});
