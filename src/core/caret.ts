import { splitClusters } from './cluster';
import { normalizeKhmer } from './normalize';
import type { CaretOptions, DeleteResult } from '../types/public';

export function getCaretBoundaries(
    text: string,
    options?: CaretOptions
): number[] {
    const src = options?.normalize ? normalizeKhmer(text) : text;

    if (!src) return [0];

    const clusters = splitClusters(src);
    const positions: number[] = [0];
    let offset = 0;

    for (const cluster of clusters) {
        offset += cluster.length;
        positions.push(offset);
    }

    return positions;
}

export function deleteBackward(
    text: string,
    cursorIndex: number,
    options?: CaretOptions
): DeleteResult {
    const src = options?.normalize ? normalizeKhmer(text) : text;

    if (!Number.isInteger(cursorIndex)) {
        throw new TypeError(
            `cursorIndex must be an integer, got ${cursorIndex}`
        );
    }

    const clamped = Math.max(0, Math.min(cursorIndex, src.length));

    if (clamped === 0) {
        return { text: src, cursorIndex: 0 };
    }

    const boundaries = getCaretBoundaries(src, { normalize: false });

    let prev = 0;
    for (const b of boundaries) {
        if (b >= clamped) break;
        prev = b;
    }

    return {
        text: src.slice(0, prev) + src.slice(clamped),
        cursorIndex: prev,
    };
}
