export interface SegmentToken {
  value: string;
  start: number;
  end: number;
  isKnown: boolean;
}

export interface SegmentOptions {
  strategy?: "fmm" | "bmm" | "bimm";
  dictionary?: KhmerDictionary;
  normalize?: boolean;
}

export interface SegmentResult {
  original: string;
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
}
