import { splitClusters } from './cluster';
import {
    isConsonant,
    isDependentVowel,
    isSign,
    isCoeng,
    isKhmerCodePoint,
    isShiftSign,
} from '../constants/char-categories';

const INVISIBLE_CHARS = /[\u200B\u200C\u200D\u2060\u200E\u200F\uFEFF]/g;

export function normalizeKhmerCluster(cluster: string): string {
    const chars = [...cluster];
    if (chars.length <= 1) return chars.join('');

    let i = 0;
    const base: string[] = [];
    const coengPairs: string[] = [];
    const shiftSigns: string[] = [];
    const vowels: string[] = [];
    const otherSigns: string[] = [];
    const other: string[] = [];

    base.push(chars[i]);
    i++;

    while (i < chars.length) {
        const cp = chars[i].codePointAt(0)!;

        if (isCoeng(cp)) {
            let pair = chars[i];
            i++;
            if (i < chars.length && isConsonant(chars[i].codePointAt(0)!)) {
                pair += chars[i];
                i++;
            }
            coengPairs.push(pair);
        } else if (isShiftSign(cp)) {
            shiftSigns.push(chars[i]);
            i++;
        } else if (isDependentVowel(cp)) {
            vowels.push(chars[i]);
            i++;
        } else if (isSign(cp)) {
            otherSigns.push(chars[i]);
            i++;
        } else {
            other.push(chars[i]);
            i++;
        }
    }

    return [
        ...base,
        ...coengPairs,
        ...shiftSigns,
        ...vowels,
        ...otherSigns,
        ...other,
    ].join('');
}

export function normalizeKhmer(text: string): string {
    const cleaned = text.replace(INVISIBLE_CHARS, '');
    const clusters = splitClusters(cleaned);
    return clusters
        .map(cluster => {
            const firstCp = cluster.codePointAt(0)!;
            if (isKhmerCodePoint(firstCp)) {
                return normalizeKhmerCluster(cluster);
            }
            return cluster;
        })
        .join('');
}
