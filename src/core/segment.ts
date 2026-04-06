import type { SegmentOptions, SegmentResult, SegmentToken } from "../types/public";
import { normalizeKhmer } from "./normalize";
import { splitClusters } from "./cluster";
import { fmmSegment } from "../algorithms/fmm";

export function segmentWords(
  text: string,
  options?: SegmentOptions
): SegmentResult {
  const shouldNormalize = options?.normalize !== false;
  const normalized = shouldNormalize ? normalizeKhmer(text) : text;
  const clusters = splitClusters(normalized);
  const dictionary = options?.dictionary;

  let tokens: SegmentToken[];
  if (dictionary) {
    tokens = fmmSegment(clusters, dictionary);
  } else {
    let offset = 0;
    tokens = clusters.map((cluster) => {
      const start = offset;
      const end = offset + cluster.length;
      offset = end;
      return { value: cluster, start, end, isKnown: false };
    });
  }

  return {
    original: text,
    normalized,
    tokens,
  };
}
