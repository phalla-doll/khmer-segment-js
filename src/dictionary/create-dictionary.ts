import type { KhmerDictionary } from '../types/public';
import { MemoryDictionary } from './memory-dictionary';

export function createDictionary(
    words: string[],
    frequencies?: ReadonlyMap<string, number>
): KhmerDictionary {
    return new MemoryDictionary(words, frequencies);
}
