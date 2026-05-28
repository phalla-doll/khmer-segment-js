import {
    cpAt,
    isClusterBase,
    isCoeng,
    isConsonant,
    isDependentVowel,
    isRobat,
    isSign,
} from '../constants/char-categories';

export function walkClusterEnd(chars: string[], start: number): number {
    if (start >= chars.length) return start;

    const cp = cpAt(chars[start]);
    if (!isClusterBase(cp)) return start + 1;

    let i = start + 1;
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

    return i;
}

export function getClusterCharBoundaries(
    text: string
): Array<{ start: number; end: number }> {
    const chars = [...text];
    const boundaries: Array<{ start: number; end: number }> = [];
    let i = 0;
    let offset = 0;

    while (i < chars.length) {
        const clusterStart = i;
        const clusterEnd = walkClusterEnd(chars, i);
        const start = offset;

        while (i < clusterEnd) {
            offset += chars[i].length;
            i++;
        }

        boundaries.push({ start, end: offset });

        if (clusterEnd === clusterStart) {
            i++;
        }
    }

    return boundaries;
}
