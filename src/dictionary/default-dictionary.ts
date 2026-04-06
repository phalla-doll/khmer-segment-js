import type { KhmerDictionary } from '../types/public';
import { createDictionary } from './create-dictionary';
import dictionaryData from './data/khmer-words.json';

export interface DictionaryEntry {
    word: string;
    freq: number;
}

const data: DictionaryEntry[] = dictionaryData as DictionaryEntry[];

let cachedDict: KhmerDictionary | null = null;

export function getDefaultDictionary(): KhmerDictionary {
    if (!cachedDict) {
        const words = data.map(e => e.word);
        const freqMap = new Map<string, number>(
            data.map(e => [e.word, e.freq])
        );
        cachedDict = createDictionary(words, freqMap);
    }
    return cachedDict;
}
