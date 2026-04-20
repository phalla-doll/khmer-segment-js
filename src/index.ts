export { containsKhmer, isKhmerChar, isKhmerText } from './core/detect';

export { normalizeKhmer, normalizeKhmerCluster } from './core/normalize';

export {
    splitClusters,
    countClusters,
    getClusterBoundaries,
} from './core/cluster';

export { segmentWords } from './core/segment';

export { getCaretBoundaries, deleteBackward } from './core/caret';

export { createDictionary } from './dictionary/create-dictionary';

export {
    compareTyping,
    computeTypingMetrics,
    getCorrectPrefixLength,
    getFirstMismatchIndex,
} from './typing/index';

export type {
    SegmentOptions,
    SegmentResult,
    SegmentToken,
    KhmerDictionary,
    CaretOptions,
    DeleteResult,
    TypingCompareOptions,
    TypingComparison,
    TypingMetrics,
    TypingMetricsInput,
    TypingUnit,
    TypingUnitState,
} from './types/public';
