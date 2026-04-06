import type { KhmerDictionary } from '../types/public';

export interface FmmToken {
    value: string;
    start: number;
    end: number;
    isKnown: boolean;
}

export function fmmSegment(
    clusters: string[],
    dictionary: KhmerDictionary
): FmmToken[] {
    const tokens: FmmToken[] = [];
    const hasPrefixFn = dictionary.hasPrefix?.bind(dictionary);
    let i = 0;
    let offset = 0;

    while (i < clusters.length) {
        let matched = false;

        let maxLen = clusters.length - i;
        if (hasPrefixFn) {
            maxLen = 1;
            let candidate = clusters[i];
            while (
                maxLen < clusters.length - i &&
                hasPrefixFn(candidate + clusters[i + maxLen])
            ) {
                maxLen++;
                candidate += clusters[i + maxLen - 1];
            }
        }

        for (let len = maxLen; len >= 1; len--) {
            const word = clusters.slice(i, i + len).join('');
            if (dictionary.has(word)) {
                const start = offset;
                const end = offset + word.length;
                tokens.push({ value: word, start, end, isKnown: true });
                offset = end;
                i += len;
                matched = true;
                break;
            }
        }

        if (!matched) {
            const word = clusters[i];
            const start = offset;
            const end = offset + word.length;
            tokens.push({ value: word, start, end, isKnown: false });
            offset = end;
            i++;
        }
    }

    return tokens;
}
