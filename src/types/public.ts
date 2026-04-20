export interface SegmentToken {
    value: string;
    /** Zero-based start offset into `SegmentResult.normalized`. */
    start: number;
    /** Zero-based exclusive end offset into `SegmentResult.normalized`. */
    end: number;
    isKnown: boolean;
}

export interface SegmentOptions {
    strategy?: 'fmm' | 'bmm' | 'bimm' | 'viterbi';
    dictionary?: KhmerDictionary;
    normalize?: boolean;
    /**
     * Optional additive transition penalty used by Viterbi to discourage
     * excessive splitting. Ignored by non-Viterbi strategies.
     */
    viterbiBoundaryPenalty?: number;
}

export interface SegmentResult {
    original: string;
    /** Normalized text used to compute token boundaries and offsets. */
    normalized: string;
    tokens: SegmentToken[];
}

export interface KhmerDictionary {
    has(word: string): boolean;
    hasPrefix?(value: string): boolean;
    hasSuffix?(value: string): boolean;
    getFrequency?(word: string): number | undefined;
    size: number;
}

export interface CaretOptions {
    normalize?: boolean;
}

export interface DeleteResult {
    text: string;
    cursorIndex: number;
}

/** Unit for typing comparison: grapheme clusters (Khmer-safe) or whitespace-delimited words. */
export type TypingUnit = 'cluster' | 'word';

export interface TypingCompareOptions {
    /**
     * When true (default), both strings are passed through `normalizeKhmer` before comparison.
     */
    normalize?: boolean;
    /**
     * Compare cluster-by-cluster (default) or word-by-word (split on whitespace).
     */
    unit?: TypingUnit;
    /**
     * When true, strips Khmer sentence punctuation, common ASCII punctuation, and zero-width
     * characters before comparison. Whitespace is normalized to single spaces for word mode.
     */
    ignorePunctuation?: boolean;
}

/** Per-unit state for rendering (e.g. highlight correct vs wrong spans). */
export interface TypingUnitState {
    value: string;
    correct: boolean;
}

/**
 * Result of comparing typed text against a target for typing games.
 * Offsets and lengths refer to the normalized strings returned on this object.
 */
export interface TypingComparison {
    normalizedTarget: string;
    normalizedTyped: string;
    /** Number of leading units that match the target exactly. */
    correctUnits: number;
    /** Total units in the target. */
    totalUnits: number;
    /**
     * Start offset in `normalizedTarget` where the first mismatch occurs, or `normalizedTarget.length` if the typed prefix fully matches the target prefix and lengths align for completion check.
     */
    mismatchOffset: number;
    /** Length in UTF-16 code units of the correct prefix of `normalizedTarget` implied by matched units. */
    correctPrefixLength: number;
    /** True when `normalizedTyped === normalizedTarget`. */
    isComplete: boolean;
    /** One entry per target unit for UI coloring. */
    unitStates: TypingUnitState[];
}

export interface TypingMetricsInput {
    /**
     * Number of characters in the correct prefix (UTF-16 code units), e.g. `correctPrefixLength` from `compareTyping`.
     */
    correctCharCount: number;
    /** Total characters the user has typed (UTF-16), for accuracy. */
    totalTypedCharCount: number;
    /** Elapsed time in milliseconds. */
    elapsedMs: number;
}

export interface TypingMetrics {
    /** Standard WPM using five characters per word on `correctCharCount`. */
    wpm: number;
    /** Correct characters per minute. */
    cpm: number;
    /** 0–100; `100 * correctCharCount / totalTypedCharCount` when `totalTypedCharCount > 0`. */
    accuracy: number;
    correctChars: number;
}
