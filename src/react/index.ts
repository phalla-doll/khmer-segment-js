import { useCallback, useMemo } from 'react';
import { deleteBackward, getCaretBoundaries } from '../core/caret';
import { normalizeKhmer } from '../core/normalize';
import { segmentWords } from '../core/segment';
import type {
    CaretOptions,
    DeleteResult,
    KhmerDictionary,
    SegmentOptions,
    SegmentResult,
    SegmentToken,
} from '../types/public';

export interface UseKhmerSegmentsInput {
    value: string;
    dictionary?: KhmerDictionary;
    segmentOptions?: Omit<SegmentOptions, 'dictionary'>;
}

export interface UseKhmerSegmentsResult {
    segment: SegmentResult;
    tokens: SegmentToken[];
    normalized: string;
}

export function useKhmerSegments(
    input: UseKhmerSegmentsInput
): UseKhmerSegmentsResult {
    const { value, dictionary, segmentOptions } = input;

    const segment = useMemo(
        () =>
            segmentWords(value, {
                ...segmentOptions,
                dictionary,
            }),
        [value, dictionary, segmentOptions]
    );

    return useMemo(
        () => ({
            segment,
            tokens: segment.tokens,
            normalized: segment.normalized,
        }),
        [segment]
    );
}

export interface UseKhmerTypingInput {
    value: string;
    selectionStart: number;
    caretOptions?: CaretOptions;
    dictionary?: KhmerDictionary;
    segmentOptions?: Omit<SegmentOptions, 'dictionary'>;
    includeSegment?: boolean;
}

export interface UseKhmerTypingResult {
    caretBoundaries: number[];
    segment?: SegmentResult;
    snapCaret: (index: number) => number;
    deleteBackwardAtCaret: () => { nextValue: string; nextCaret: number };
}

function clampCursor(selectionStart: number, textLength: number): number {
    if (!Number.isInteger(selectionStart)) {
        throw new TypeError(
            `selectionStart must be an integer, got ${selectionStart}`
        );
    }

    return Math.max(0, Math.min(selectionStart, textLength));
}

function nearestBoundary(boundaries: number[], index: number): number {
    if (boundaries.length === 0) {
        return 0;
    }

    let best = boundaries[0];
    let bestDistance = Math.abs(best - index);

    for (let i = 1; i < boundaries.length; i++) {
        const candidate = boundaries[i];
        const distance = Math.abs(candidate - index);
        if (
            distance < bestDistance ||
            (distance === bestDistance && candidate < best)
        ) {
            best = candidate;
            bestDistance = distance;
        }
    }

    return best;
}

function toNextDeleteResult(result: DeleteResult): {
    nextValue: string;
    nextCaret: number;
} {
    return {
        nextValue: result.text,
        nextCaret: result.cursorIndex,
    };
}

export function useKhmerTyping(
    input: UseKhmerTypingInput
): UseKhmerTypingResult {
    const {
        value,
        selectionStart,
        caretOptions,
        dictionary,
        segmentOptions,
        includeSegment,
    } = input;

    const caretNormalize = caretOptions?.normalize;
    const shouldIncludeSegment =
        includeSegment ?? Boolean(dictionary || segmentOptions);

    const caretText = useMemo(
        () => (caretNormalize ? normalizeKhmer(value) : value),
        [value, caretOptions]
    );

    const caretBoundaries = useMemo(
        () => getCaretBoundaries(value, caretOptions),
        [value, caretOptions]
    );

    const clampedSelectionStart = useMemo(
        () => clampCursor(selectionStart, caretText.length),
        [selectionStart, caretText]
    );

    const segment = useMemo(() => {
        if (!shouldIncludeSegment) {
            return undefined;
        }

        return segmentWords(value, {
            ...segmentOptions,
            dictionary,
        });
    }, [shouldIncludeSegment, value, dictionary, segmentOptions]);

    const snapCaret = useCallback(
        (index: number) => nearestBoundary(caretBoundaries, index),
        [caretBoundaries]
    );

    const deleteBackwardAtCaret = useCallback(
        () =>
            toNextDeleteResult(
                deleteBackward(value, clampedSelectionStart, caretOptions)
            ),
        [value, clampedSelectionStart, caretOptions]
    );

    return useMemo(
        () => ({
            caretBoundaries,
            segment,
            snapCaret,
            deleteBackwardAtCaret,
        }),
        [caretBoundaries, segment, snapCaret, deleteBackwardAtCaret]
    );
}
