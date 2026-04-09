import { splitClusters } from './cluster';
import {
    isConsonant,
    isDependentVowel,
    isSign,
    isCoeng,
    isKhmerCodePoint,
    isShiftSign,
} from '../constants/char-categories';

// eslint-disable-next-line no-misleading-character-class
const INVISIBLE_CHARS = /[\u200B\u200C\u200D\u2060\u200E\u200F\uFEFF]/g;

const RO = 0x179a;

function isRobat(cp: number): boolean {
    return cp === 0x17cc;
}

function cpAt(s: string, idx: number = 0): number {
    return s.codePointAt(idx) as number;
}

function fixCompositeVowels(chars: string[]): string[] {
    const result: string[] = [];
    let i = 0;
    while (i < chars.length) {
        const cp = cpAt(chars[i]);
        if (cp === 0x17c1 && i + 1 < chars.length) {
            const nextCp = cpAt(chars[i + 1]);
            if (nextCp === 0x17b8) {
                result.push('\u17be');
                i += 2;
                continue;
            }
            if (nextCp === 0x17b6) {
                result.push('\u17c4');
                i += 2;
                continue;
            }
        }
        result.push(chars[i]);
        i++;
    }
    return result;
}

export function normalizeKhmerCluster(cluster: string): string {
    const rawChars = [...cluster];
    if (rawChars.length <= 1) return rawChars.join('');

    const chars = fixCompositeVowels(rawChars);

    let i = 0;
    const base: string[] = [];
    const coengNonRo: string[] = [];
    const coengRo: string[] = [];
    const robat: string[] = [];
    const shiftSigns: string[] = [];
    const vowels: string[] = [];
    const otherSigns: string[] = [];
    const other: string[] = [];

    base.push(chars[i]);
    i++;

    while (i < chars.length) {
        const cp = cpAt(chars[i]);

        if (isCoeng(cp)) {
            let pair = chars[i];
            i++;
            if (i < chars.length && isConsonant(cpAt(chars[i]))) {
                const subCp = cpAt(chars[i]);
                pair += chars[i];
                i++;
                if (subCp === RO) {
                    coengRo.push(pair);
                } else {
                    coengNonRo.push(pair);
                }
            } else {
                coengNonRo.push(pair);
            }
        } else if (isRobat(cp)) {
            robat.push(chars[i]);
            i++;
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
        ...coengNonRo,
        ...coengRo,
        ...robat,
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
            const firstCp = cpAt(cluster);
            if (isKhmerCodePoint(firstCp)) {
                return normalizeKhmerCluster(cluster);
            }
            return cluster;
        })
        .join('');
}
