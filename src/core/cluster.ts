import {
    isConsonant,
    isDependentVowel,
    isSign,
    isCoeng,
    isClusterBase,
    isRobat,
    cpAt,
} from '../constants/char-categories';

export function splitClusters(text: string): string[] {
    if (!text) return [];

    const chars = [...text];
    const clusters: string[] = [];
    let i = 0;

    while (i < chars.length) {
        const cp = cpAt(chars[i], 0);

        if (isClusterBase(cp)) {
            let cluster = chars[i];
            i++;

            while (i < chars.length) {
                const nextCp = cpAt(chars[i], 0);

                if (isCoeng(nextCp)) {
                    cluster += chars[i];
                    i++;
                    if (i < chars.length && isConsonant(cpAt(chars[i], 0))) {
                        cluster += chars[i];
                        i++;
                    }
                } else if (isRobat(nextCp)) {
                    cluster += chars[i];
                    i++;
                } else if (isDependentVowel(nextCp) || isSign(nextCp)) {
                    cluster += chars[i];
                    i++;
                } else {
                    break;
                }
            }

            clusters.push(cluster);
        } else {
            clusters.push(chars[i]);
            i++;
        }
    }

    return clusters;
}

export function countClusters(text: string): number {
    return splitClusters(text).length;
}

export function getClusterBoundaries(
    text: string
): Array<{ start: number; end: number }> {
    const clusters = splitClusters(text);
    const boundaries: Array<{ start: number; end: number }> = [];
    let offset = 0;

    for (const cluster of clusters) {
        boundaries.push({ start: offset, end: offset + cluster.length });
        offset += cluster.length;
    }

    return boundaries;
}
