import type { KhmerDictionary, SegmentToken } from '../types/public';
import {
    isKhmerSentencePunctuation,
    isDigit,
    isConsonant,
    isClusterBase,
    isDependentVowel,
    isSign,
    isCoeng,
} from '../constants/char-categories';

const DEFAULT_COST = 10.0;
const UNKNOWN_COST = 20.0;
const SINGLE_CONSONANT_PENALTY = 10.0;
const ORPHAN_SIGN_PENALTY = 50.0;
const DEFAULT_BOUNDARY_PENALTY = 10.0;

interface ViterbiOptions {
    boundaryPenalty?: number;
}

function isRobat(cp: number): boolean {
    return cp === 0x17cc;
}

function cpAt(s: string): number {
    return s.codePointAt(0) as number;
}

function getClusterLength(chars: string[], start: number): number {
    let i = start;
    if (i >= chars.length) return 0;

    const cp = cpAt(chars[i]);
    if (!isClusterBase(cp)) return 1;

    i++;
    while (i < chars.length) {
        const nextCp = cpAt(chars[i]);
        if (isCoeng(nextCp)) {
            i++;
            if (i < chars.length && isConsonant(cpAt(chars[i]))) {
                i++;
            }
        } else if (isRobat(nextCp)) {
            i++;
        } else if (isDependentVowel(nextCp) || isSign(nextCp)) {
            i++;
        } else {
            break;
        }
    }

    return i - start;
}

function isSeparator(cp: number): boolean {
    return (
        cp <= 0x2f ||
        (cp >= 0x3a && cp <= 0x40) ||
        (cp >= 0x5b && cp <= 0x60) ||
        (cp >= 0x7b && cp <= 0x7f) ||
        (cp >= 0x2000 && cp <= 0x206f) ||
        cp === 0x17d4 ||
        cp === 0x17d5 ||
        cp === 0x17d6
    );
}

export function viterbiSegment(
    clusters: string[],
    dictionary: KhmerDictionary,
    options?: ViterbiOptions
): SegmentToken[] {
    if (clusters.length === 0) return [];

    const chars = [...clusters.join('')];
    const n = chars.length;
    const boundaryPenalty =
        typeof options?.boundaryPenalty === 'number' &&
        Number.isFinite(options.boundaryPenalty) &&
        options.boundaryPenalty >= 0
            ? options.boundaryPenalty
            : DEFAULT_BOUNDARY_PENALTY;
    const hasPrefixFn = dictionary.hasPrefix?.bind(dictionary);
    const getFreqFn = dictionary.getFrequency?.bind(dictionary);

    const INF = Infinity;
    const dp: number[] = new Array(n + 1).fill(INF);
    const from: number[] = new Array(n + 1).fill(-1);
    const fromKnown: boolean[] = new Array(n + 1).fill(false);
    dp[0] = 0;

    for (let i = 0; i < n; i++) {
        if (dp[i] === INF) continue;

        const cp = cpAt(chars[i]);

        if (!isClusterBase(cp) && !isDigit(cp) && !isSeparator(cp)) {
            const cost =
                dp[i] + UNKNOWN_COST + ORPHAN_SIGN_PENALTY + boundaryPenalty;
            if (cost < dp[i + 1]) {
                dp[i + 1] = cost;
                from[i + 1] = i;
                fromKnown[i + 1] = false;
            }
            continue;
        }

        if (isDigit(cp)) {
            let j = i + 1;
            while (j < n && isDigit(cpAt(chars[j]))) {
                j++;
            }
            const cost = dp[i] + 1.0 + boundaryPenalty;
            if (cost < dp[j]) {
                dp[j] = cost;
                from[j] = i;
                fromKnown[j] = true;
            }
            continue;
        }

        if (isSeparator(cp)) {
            const cost = dp[i] + 0.1 + boundaryPenalty;
            if (cost < dp[i + 1]) {
                dp[i + 1] = cost;
                from[i + 1] = i;
                fromKnown[i + 1] = isKhmerSentencePunctuation(cp);
            }
            continue;
        }

        let maxWordLen = n - i;
        if (hasPrefixFn) {
            maxWordLen = 0;
            let candidate = '';
            while (maxWordLen < n - i) {
                candidate += chars[i + maxWordLen];
                if (!hasPrefixFn(candidate)) break;
                maxWordLen++;
            }
            if (maxWordLen === 0) maxWordLen = 1;
        }

        for (let len = maxWordLen; len >= 1; len--) {
            const end = i + len;
            if (end > n) continue;

            const word = chars.slice(i, end).join('');

            if (dictionary.has(word)) {
                let cost: number;
                if (getFreqFn) {
                    const freq = getFreqFn(word);
                    if (freq !== undefined && freq > 0) {
                        cost = dp[i] - Math.log(freq) + boundaryPenalty;
                    } else {
                        cost = dp[i] + DEFAULT_COST + boundaryPenalty;
                    }
                } else {
                    cost = dp[i] + DEFAULT_COST + boundaryPenalty;
                }

                if (cost < dp[end]) {
                    dp[end] = cost;
                    from[end] = i;
                    fromKnown[end] = true;
                }
            }
        }

        const clusterLen = getClusterLength(chars, i);
        let unknownCost = dp[i] + UNKNOWN_COST + boundaryPenalty;

        if (clusterLen === 1 && isConsonant(cp)) {
            unknownCost += SINGLE_CONSONANT_PENALTY;
        }

        const unknownEnd = i + clusterLen;
        if (unknownEnd <= n && unknownCost < dp[unknownEnd]) {
            dp[unknownEnd] = unknownCost;
            from[unknownEnd] = i;
            fromKnown[unknownEnd] = false;
        }
    }

    const path: number[] = [];
    let cur = n;
    while (cur > 0) {
        const prev = from[cur];
        if (prev === -1) {
            cur--;
            path.push(cur);
        } else {
            path.push(prev);
            cur = prev;
        }
    }
    path.reverse();

    const tokens: SegmentToken[] = [];
    let offset = 0;

    for (let idx = 0; idx < path.length; idx++) {
        const start = path[idx];
        const end = idx + 1 < path.length ? path[idx + 1] : n;
        const value = chars.slice(start, end).join('');
        const isKnown = fromKnown[end];

        tokens.push({
            value,
            start: offset,
            end: offset + value.length,
            isKnown,
        });
        offset += value.length;
    }

    return mergeConsecutiveUnknowns(tokens);
}

function mergeConsecutiveUnknowns(tokens: SegmentToken[]): SegmentToken[] {
    if (tokens.length <= 1) return tokens;

    const result: SegmentToken[] = [];
    let i = 0;

    while (i < tokens.length) {
        if (!tokens[i].isKnown) {
            const start = tokens[i].start;
            let combined = tokens[i].value;
            let end = tokens[i].end;
            i++;

            while (i < tokens.length && !tokens[i].isKnown) {
                combined += tokens[i].value;
                end = tokens[i].end;
                i++;
            }

            result.push({ value: combined, start, end, isKnown: false });
        } else {
            result.push(tokens[i]);
            i++;
        }
    }

    return result;
}
