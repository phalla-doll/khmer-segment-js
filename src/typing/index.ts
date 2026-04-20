import { normalizeKhmer } from '../core/normalize';
import { splitClusters } from '../core/cluster';
import { isKhmerSentencePunctuation } from '../constants/char-categories';
import type {
    TypingCompareOptions,
    TypingComparison,
    TypingMetrics,
    TypingMetricsInput,
    TypingUnitState,
} from '../types/public';

export type {
    TypingCompareOptions,
    TypingComparison,
    TypingMetrics,
    TypingMetricsInput,
    TypingUnit,
    TypingUnitState,
} from '../types/public';

function isZeroWidthOrBom(cp: number): boolean {
    return cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0xfeff;
}

function isAsciiPunctuationChar(ch: string): boolean {
    const cp = ch.codePointAt(0) as number;
    return (
        (cp >= 0x21 && cp <= 0x2f) ||
        (cp >= 0x3a && cp <= 0x40) ||
        (cp >= 0x5b && cp <= 0x60) ||
        (cp >= 0x7b && cp <= 0x7e)
    );
}

/**
 * Removes punctuation and zero-width characters for optional "ignore punctuation" mode.
 */
function stripIgnoredForCompare(text: string): string {
    const chars = [...text];
    const kept: string[] = [];
    for (const ch of chars) {
        const cp = ch.codePointAt(0) as number;
        if (isZeroWidthOrBom(cp)) continue;
        if (isKhmerSentencePunctuation(cp)) continue;
        if (isAsciiPunctuationChar(ch)) continue;
        if (/\p{P}/u.test(ch)) continue;
        kept.push(ch);
    }
    return kept.join('');
}

function splitWords(text: string): string[] {
    return text.split(/\s+/).filter(Boolean);
}

function offsetAfterUnits(
    fullText: string,
    units: string[],
    count: number
): number {
    if (count <= 0) return 0;
    let offset = 0;
    for (let i = 0; i < count && i < units.length; i++) {
        offset += units[i].length;
    }
    return offset;
}

function buildUnitStates(
    targetUnits: string[],
    correctLeading: number
): TypingUnitState[] {
    return targetUnits.map((value, i) => ({
        value,
        correct: i < correctLeading,
    }));
}

/**
 * Compares typed input against a target string for Khmer-aware typing games.
 *
 * Default unit is **cluster** (grapheme cluster), which matches how users type Khmer.
 */
export function compareTyping(
    target: string,
    typed: string,
    options?: TypingCompareOptions
): TypingComparison {
    if (typeof target !== 'string' || typeof typed !== 'string') {
        throw new TypeError('compareTyping expects string arguments');
    }

    const normalize = options?.normalize !== false;
    const unit = options?.unit ?? 'cluster';
    const ignorePunctuation = options?.ignorePunctuation === true;

    let normalizedTarget = normalize ? normalizeKhmer(target) : target;
    let normalizedTyped = normalize ? normalizeKhmer(typed) : typed;

    if (ignorePunctuation) {
        normalizedTarget = stripIgnoredForCompare(normalizedTarget);
        normalizedTyped = stripIgnoredForCompare(normalizedTyped);
        if (unit === 'word') {
            normalizedTarget = normalizedTarget.replace(/\s+/g, ' ').trim();
            normalizedTyped = normalizedTyped.replace(/\s+/g, ' ').trim();
        }
    }

    const targetUnits =
        unit === 'word'
            ? splitWords(normalizedTarget)
            : splitClusters(normalizedTarget);
    const typedUnits =
        unit === 'word'
            ? splitWords(normalizedTyped)
            : splitClusters(normalizedTyped);

    const totalUnits = targetUnits.length;

    let correctUnits = 0;
    const maxCompare = Math.min(targetUnits.length, typedUnits.length);
    for (let i = 0; i < maxCompare; i++) {
        if (typedUnits[i] !== targetUnits[i]) break;
        correctUnits++;
    }

    const correctPrefixLength = offsetAfterUnits(
        normalizedTarget,
        targetUnits,
        correctUnits
    );

    const mismatchOffset =
        correctUnits >= targetUnits.length
            ? normalizedTarget.length
            : offsetAfterUnits(normalizedTarget, targetUnits, correctUnits);

    const isComplete =
        normalizedTyped === normalizedTarget &&
        normalizedTyped.length === normalizedTarget.length;

    const unitStates = buildUnitStates(targetUnits, correctUnits);

    return {
        normalizedTarget,
        normalizedTyped,
        correctUnits,
        totalUnits,
        mismatchOffset,
        correctPrefixLength,
        isComplete,
        unitStates,
    };
}

/**
 * Returns the UTF-16 offset in the normalized target where the first mismatch begins.
 * Shorthand for `compareTyping(target, typed, options).mismatchOffset` when that index
 * is before the end of the target; otherwise returns `normalizedTarget.length`.
 */
export function getFirstMismatchIndex(
    target: string,
    typed: string,
    options?: TypingCompareOptions
): number {
    const c = compareTyping(target, typed, options);
    return Math.min(c.mismatchOffset, c.normalizedTarget.length);
}

/**
 * Length of the correct prefix of the normalized target (UTF-16 code units) implied by `compareTyping`.
 */
export function getCorrectPrefixLength(
    target: string,
    typed: string,
    options?: TypingCompareOptions
): number {
    return compareTyping(target, typed, options).correctPrefixLength;
}

/**
 * Computes WPM (5 chars = 1 word), CPM, and accuracy from session totals.
 *
 * **Accuracy** is `100 * correctCharCount / totalTypedCharCount` when `totalTypedCharCount > 0`.
 */
export function computeTypingMetrics(input: TypingMetricsInput): TypingMetrics {
    const { correctCharCount, totalTypedCharCount, elapsedMs } = input;

    if (!Number.isFinite(correctCharCount) || correctCharCount < 0) {
        throw new TypeError(
            'correctCharCount must be a non-negative finite number'
        );
    }
    if (!Number.isFinite(totalTypedCharCount) || totalTypedCharCount < 0) {
        throw new TypeError(
            'totalTypedCharCount must be a non-negative finite number'
        );
    }
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
        throw new TypeError('elapsedMs must be a non-negative finite number');
    }

    const minutes = elapsedMs / 60000;
    const wpm = minutes > 0 ? correctCharCount / 5 / minutes : 0;
    const cpm = minutes > 0 ? correctCharCount / minutes : 0;
    const accuracy =
        totalTypedCharCount > 0
            ? (100 * Math.min(correctCharCount, totalTypedCharCount)) /
              totalTypedCharCount
            : 100;

    return {
        wpm,
        cpm,
        accuracy,
        correctChars: correctCharCount,
    };
}
