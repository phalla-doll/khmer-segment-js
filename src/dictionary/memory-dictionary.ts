import type { KhmerDictionary } from '../types/public';
import { Trie } from './trie';

export class MemoryDictionary implements KhmerDictionary {
    private trie: Trie;
    private reverseTrie: Trie;
    private freqMap: ReadonlyMap<string, number>;
    readonly size: number;

    constructor(words: string[], frequencies?: ReadonlyMap<string, number>) {
        this.trie = new Trie();
        this.reverseTrie = new Trie();
        this.freqMap = frequencies ?? new Map();
        const uniqueWords = new Set<string>();

        for (const word of words) {
            if (word.length > 0) {
                uniqueWords.add(word);
            }
        }

        for (const word of uniqueWords) {
            if (word.length > 0) {
                this.trie.insert(word);
                this.reverseTrie.insert([...word].reverse().join(''));
            }
        }
        this.size = uniqueWords.size;
    }

    has(word: string): boolean {
        return this.trie.has(word);
    }

    hasPrefix(value: string): boolean {
        return this.trie.hasPrefix(value);
    }

    hasSuffix(value: string): boolean {
        return this.reverseTrie.hasPrefix([...value].reverse().join(''));
    }

    getFrequency(word: string): number | undefined {
        return this.freqMap.get(word);
    }
}
