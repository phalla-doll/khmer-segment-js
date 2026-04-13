import type { KhmerDictionary } from '../types/public';

export interface BmmToken {
    value: string;
    start: number;
    end: number;
    isKnown: boolean;
}

/**
 * Backward Maximum Matching (BMM) segmentation algorithm.
 *
 * Scans clusters from right to left, greedily matching the longest
 * known word at each position. Falls back to a single unknown token
 * when no match is found.
 *
 * Produces the same token shape as FMM but can yield different
 * segmentation on ambiguous input.
 */
export function bmmSegment(
    clusters: string[],
    dictionary: KhmerDictionary
): BmmToken[] {
    const tokens: BmmToken[] = [];
    const hasSuffixReversedFn = (
        dictionary as KhmerDictionary & {
            hasReversedPrefix?: (value: string) => boolean;
        }
    ).hasReversedPrefix?.bind(dictionary);
    const hasSuffixFn = dictionary.hasSuffix?.bind(dictionary);
    const reversedClusters =
        hasSuffixReversedFn !== undefined
            ? clusters.map(cluster => [...cluster].reverse().join(''))
            : null;
    let i = clusters.length - 1;

    while (i >= 0) {
        let matched = false;

        // Determine the maximum window length ending at position i
        // that could possibly form a known word (suffix optimization).
        let maxLen = i + 1;
        if (hasSuffixReversedFn && reversedClusters) {
            maxLen = 1;
            let reversedCandidate = reversedClusters[i];
            while (maxLen < i + 1 && hasSuffixReversedFn(reversedCandidate)) {
                const nextIndex = i - maxLen;
                maxLen++;
                reversedCandidate += reversedClusters[nextIndex];
            }
        } else if (hasSuffixFn) {
            maxLen = 1;
            let candidate = clusters[i];
            while (maxLen < i + 1 && hasSuffixFn(candidate)) {
                maxLen++;
                candidate = clusters[i - maxLen + 1] + candidate;
            }
        }

        // Try longest match first, shrink until we find a known word
        let bestLen = 0;
        let bestWord = '';
        let word = '';
        for (let len = 1; len <= maxLen; len++) {
            word = clusters[i - len + 1] + word;
            if (dictionary.has(word)) {
                bestLen = len;
                bestWord = word;
            }
        }

        if (bestLen > 0) {
            tokens.push({ value: bestWord, start: 0, end: 0, isKnown: true });
            i -= bestLen;
            matched = true;
        }

        if (!matched) {
            tokens.push({
                value: clusters[i],
                start: 0,
                end: 0,
                isKnown: false,
            });
            i--;
        }
    }

    // Tokens were collected right-to-left; reverse to restore left-to-right order
    tokens.reverse();

    // Compute contiguous offsets
    let offset = 0;
    for (const token of tokens) {
        token.start = offset;
        offset += token.value.length;
        token.end = offset;
    }

    return tokens;
}
