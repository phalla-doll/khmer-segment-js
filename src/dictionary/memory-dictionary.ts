import type { KhmerDictionary } from "../types/public";
import { Trie } from "./trie";

export class MemoryDictionary implements KhmerDictionary {
  private trie: Trie;
  private reverseTrie: Trie;

  constructor(words: string[]) {
    this.trie = new Trie();
    this.reverseTrie = new Trie();
    for (const word of words) {
      if (word.length > 0) {
        this.trie.insert(word);
        this.reverseTrie.insert([...word].reverse().join(""));
      }
    }
  }

  has(word: string): boolean {
    return this.trie.has(word);
  }

  hasPrefix(value: string): boolean {
    return this.trie.hasPrefix(value);
  }

  hasSuffix(value: string): boolean {
    return this.reverseTrie.hasPrefix([...value].reverse().join(""));
  }
}
