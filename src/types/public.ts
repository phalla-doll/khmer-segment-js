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

export interface TypingDiffItem {
    expected?: string;
    actual?: string;
    correct: boolean;
}

export interface TypingComparisonResult {
    expectedClusters: string[];
    actualClusters: string[];
    diff: TypingDiffItem[];
    accuracy: number;
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
