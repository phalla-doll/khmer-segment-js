import type { KhmerDictionary } from "../types/public";
import { MemoryDictionary } from "./memory-dictionary";

export function createDictionary(words: string[]): KhmerDictionary {
  return new MemoryDictionary(words);
}
