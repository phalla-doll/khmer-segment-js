import type { DictionaryEntry } from './default-dictionary';
import dictionaryData from './data/khmer-words.json';

export interface FrequencyDictionary {
    words: string[];
    entries: DictionaryEntry[];
    frequencies: Map<string, number>;
}

export interface ReadonlyFrequencyDictionary {
    readonly words: readonly string[];
    readonly entries: readonly Readonly<DictionaryEntry>[];
    readonly frequencies: ReadonlyMap<string, number>;
}

let cached: ReadonlyFrequencyDictionary | null = null;

function getCachedFrequencyDictionary(): ReadonlyFrequencyDictionary {
    if (!cached) {
        const entries = Object.freeze(
            (dictionaryData as DictionaryEntry[]).map(entry =>
                Object.freeze({
                    word: entry.word,
                    freq: entry.freq,
                })
            )
        ) as readonly Readonly<DictionaryEntry>[];
        const words = Object.freeze(entries.map(entry => entry.word));
        const frequencies = new Map<string, number>(
            entries.map(entry => [entry.word, entry.freq])
        );
        cached = Object.freeze({ words, entries, frequencies });
    }

    return cached;
}

export function getFrequencyDictionaryView(): ReadonlyFrequencyDictionary {
    return getCachedFrequencyDictionary();
}

export function loadFrequencyDictionary(): FrequencyDictionary {
    const view = getCachedFrequencyDictionary();

    return {
        words: [...view.words],
        entries: view.entries.map(entry => ({
            word: entry.word,
            freq: entry.freq,
        })),
        frequencies: new Map(view.frequencies),
    };
}
