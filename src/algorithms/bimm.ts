import type { KhmerDictionary } from "../types/public";
import { fmmSegment } from "./fmm";
import { bmmSegment } from "./bmm";

export interface BimmToken {
  value: string;
  start: number;
  end: number;
  isKnown: boolean;
}

/**
 * Bidirectional Maximum Matching (BiMM) segmentation algorithm.
 *
 * Runs both FMM (forward) and BMM (backward), then picks the better
 * result using these heuristics:
 *
 * 1. If both produce the same result, return it
 * 2. Prefer the segmentation with fewer unknown tokens
 * 3. If tied on unknowns, prefer fewer total tokens (longer matches)
 * 4. If still tied, prefer FMM (left-to-right convention)
 */
export function bimmSegment(
  clusters: string[],
  dictionary: KhmerDictionary
): BimmToken[] {
  const fmmResult = fmmSegment(clusters, dictionary);
  const bmmResult = bmmSegment(clusters, dictionary);

  const fmmUnknowns = fmmResult.filter((t) => !t.isKnown).length;
  const bmmUnknowns = bmmResult.filter((t) => !t.isKnown).length;

  // Heuristic 1: fewer unknown tokens wins
  if (fmmUnknowns !== bmmUnknowns) {
    return fmmUnknowns < bmmUnknowns ? fmmResult : bmmResult;
  }

  // Heuristic 2: fewer total tokens wins (longer matches preferred)
  if (fmmResult.length !== bmmResult.length) {
    return fmmResult.length < bmmResult.length ? fmmResult : bmmResult;
  }

  // Heuristic 3: tied — prefer FMM by convention
  return fmmResult;
}