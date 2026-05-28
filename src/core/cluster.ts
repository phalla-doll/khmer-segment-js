import { walkClusterEnd } from './cluster-walker';

export function splitClusters(text: string): string[] {
    if (!text) return [];

    const chars = [...text];
    const clusters: string[] = [];
    let i = 0;

    while (i < chars.length) {
        const end = walkClusterEnd(chars, i);
        clusters.push(chars.slice(i, end).join(''));
        i = end;
    }

    return clusters;
}

export function countClusters(text: string): number {
    if (!text) return 0;

    const chars = [...text];
    let i = 0;
    let count = 0;

    while (i < chars.length) {
        count++;
        i = walkClusterEnd(chars, i);
    }

    return count;
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
