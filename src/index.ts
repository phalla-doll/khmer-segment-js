export { containsKhmer, isKhmerChar, isKhmerText } from "./core/detect";

export { normalizeKhmer, normalizeKhmerCluster } from "./core/normalize";

export {
  splitClusters,
  countClusters,
  getClusterBoundaries,
} from "./core/cluster";

export { segmentWords } from "./core/segment";

export { createDictionary } from "./dictionary/create-dictionary";

export type {
  SegmentOptions,
  SegmentResult,
  SegmentToken,
  TypingComparisonResult,
  KhmerDictionary,
} from "./types/public";
