import type { DictionaryEntry } from "./default-dictionary";
import dictionaryData from "./data/khmer-words.json";

export interface FrequencyDictionary {
  words: string[];
  entries: DictionaryEntry[];
  frequencies: Map<string, number>;
}

let cached: FrequencyDictionary | null = null;

export function loadFrequencyDictionary(): FrequencyDictionary {
  if (!cached) {
    const entries = dictionaryData as DictionaryEntry[];
    const words = entries.map((e) => e.word);
    const frequencies = new Map<string, number>(
      entries.map((e) => [e.word, e.freq])
    );
    cached = { words, entries, frequencies };
  }
  return cached;
}
