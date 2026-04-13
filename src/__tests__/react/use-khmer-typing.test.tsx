// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getCaretBoundaries } from '../../core/caret';
import { normalizeKhmer } from '../../core/normalize';
import { createDictionary } from '../../dictionary/create-dictionary';
import { useKhmerTyping, type UseKhmerTypingInput } from '../../react';

describe('useKhmerTyping', () => {
    it('returns caret boundaries from the core caret helper', () => {
        const value = 'ក្កក';
        const { result } = renderHook(({ input }) => useKhmerTyping(input), {
            initialProps: { input: { value, selectionStart: value.length } },
        });

        expect(result.current.caretBoundaries).toEqual(
            getCaretBoundaries(value)
        );
    });

    it('snaps caret to the nearest valid boundary', () => {
        const value = 'ក្កក';
        const { result } = renderHook(({ input }) => useKhmerTyping(input), {
            initialProps: { input: { value, selectionStart: value.length } },
        });

        const { snapCaret } = result.current;
        expect(snapCaret(2)).toBe(3);
        expect(snapCaret(1)).toBe(0);
    });

    it('deletes one cluster before the current caret', () => {
        const value = 'ក្កក';
        const { result } = renderHook(({ input }) => useKhmerTyping(input), {
            initialProps: { input: { value, selectionStart: value.length } },
        });

        expect(result.current.deleteBackwardAtCaret()).toEqual({
            nextValue: 'ក្ក',
            nextCaret: 3,
        });
    });

    it('respects normalized caret space when caret normalize is enabled', () => {
        const value = '\u200Bក\u200Bក\u200B';
        const normalized = normalizeKhmer(value);
        const { result } = renderHook(({ input }) => useKhmerTyping(input), {
            initialProps: {
                input: {
                    value,
                    selectionStart: 99,
                    caretOptions: { normalize: true },
                },
            },
        });

        expect(
            result.current.caretBoundaries[
                result.current.caretBoundaries.length - 1
            ]
        ).toBe(normalized.length);
        expect(result.current.deleteBackwardAtCaret()).toEqual({
            nextValue: 'ក',
            nextCaret: 1,
        });
    });

    it('updates caret boundaries when caret options change', () => {
        const value = '\u200Bក\u200Bក\u200B';
        const { result, rerender } = renderHook(
            ({ input }) => useKhmerTyping(input),
            {
                initialProps: {
                    input: {
                        value,
                        selectionStart: value.length,
                        caretOptions: { normalize: false },
                    },
                },
            }
        );

        const rawBoundaries = result.current.caretBoundaries;
        rerender({
            input: {
                value,
                selectionStart: value.length,
                caretOptions: { normalize: true },
            },
        });

        const normalizedBoundaries = result.current.caretBoundaries;
        expect(normalizedBoundaries).not.toEqual(rawBoundaries);
    });

    it('handles mixed Khmer, Latin, and digits consistently', () => {
        const value = 'កa123';
        const { result } = renderHook(({ input }) => useKhmerTyping(input), {
            initialProps: { input: { value, selectionStart: value.length } },
        });

        expect(result.current.deleteBackwardAtCaret()).toEqual({
            nextValue: 'កa12',
            nextCaret: 4,
        });
    });

    it('optionally includes segmentation output for shared UI rendering', () => {
        const dict = createDictionary(['កខ']);
        const initialInput: UseKhmerTypingInput = {
            value: 'កខ',
            selectionStart: 2,
            dictionary: dict,
            segmentOptions: { strategy: 'fmm' },
            includeSegment: true,
        };

        const { result, rerender } = renderHook(
            ({ input }) => useKhmerTyping(input),
            { initialProps: { input: initialInput } }
        );

        const withSegment = result.current.segment;
        expect(withSegment).toBeDefined();
        expect(withSegment?.tokens.map(token => token.value)).toEqual(['កខ']);

        rerender({
            input: {
                ...initialInput,
                includeSegment: false,
            },
        });

        expect(result.current.segment).toBeUndefined();
    });

    it('throws for non-integer selectionStart values', () => {
        expect(() =>
            renderHook(() =>
                useKhmerTyping({
                    value: 'ក',
                    selectionStart: 1.5,
                })
            )
        ).toThrow(TypeError);
    });
});
