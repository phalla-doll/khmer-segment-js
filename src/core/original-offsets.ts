import type { SegmentToken } from '../types/public';
import { cpAt, isKhmerCodePoint } from '../constants/char-categories';
import { walkClusterEnd } from './cluster-walker';
import { normalizeKhmerCluster } from './normalize';

const INVISIBLE_CODE_POINTS = new Set([
    0x200b, 0x200c, 0x200d, 0x2060, 0x200e, 0x200f, 0xfeff,
]);

interface SourceChar {
    value: string;
    originalStart: number;
    originalEnd: number;
}

interface SourceSpan {
    originalStart: number;
    originalEnd: number;
}

export interface NormalizedSourceMap {
    normalized: string;
    spans: SourceSpan[];
}

function getSourceChars(text: string): SourceChar[] {
    const sourceChars: SourceChar[] = [];
    let offset = 0;

    for (const value of text) {
        const originalStart = offset;
        const originalEnd = originalStart + value.length;
        offset = originalEnd;

        if (!INVISIBLE_CODE_POINTS.has(cpAt(value))) {
            sourceChars.push({ value, originalStart, originalEnd });
        }
    }

    return sourceChars;
}

function pushMappedValue(
    output: string[],
    spans: SourceSpan[],
    value: string,
    sourceSpan: SourceSpan
): void {
    output.push(value);
    for (const char of value) {
        for (let i = 0; i < char.length; i++) {
            spans.push(sourceSpan);
        }
    }
}

export function normalizeKhmerWithSourceMap(text: string): NormalizedSourceMap {
    const sourceChars = getSourceChars(text);
    const chars = sourceChars.map(char => char.value);
    const output: string[] = [];
    const spans: SourceSpan[] = [];
    let i = 0;

    while (i < chars.length) {
        const clusterStart = i;
        const clusterEnd = walkClusterEnd(chars, i);
        const clusterChars = sourceChars.slice(clusterStart, clusterEnd);
        const cluster = clusterChars.map(char => char.value).join('');
        const firstCp = cpAt(cluster);
        const normalizedCluster = isKhmerCodePoint(firstCp)
            ? normalizeKhmerCluster(cluster)
            : cluster;
        const sourceSpan = {
            originalStart: clusterChars[0].originalStart,
            originalEnd: clusterChars[clusterChars.length - 1].originalEnd,
        };

        pushMappedValue(output, spans, normalizedCluster, sourceSpan);
        i = clusterEnd;
    }

    return {
        normalized: output.join(''),
        spans,
    };
}

export function addOriginalOffsets(
    tokens: SegmentToken[],
    original: string,
    normalized: string,
    shouldNormalize: boolean,
    existingSourceMap?: NormalizedSourceMap
): SegmentToken[] {
    if (!shouldNormalize) {
        return tokens.map(token => ({
            ...token,
            originalStart: token.start,
            originalEnd: token.end,
        }));
    }

    const sourceMap =
        existingSourceMap ?? normalizeKhmerWithSourceMap(original);
    if (sourceMap.normalized !== normalized) {
        return tokens.map(token => ({
            ...token,
            originalStart: token.start,
            originalEnd: token.end,
        }));
    }

    return tokens.map(token => {
        const tokenSpans = sourceMap.spans.slice(token.start, token.end);
        if (tokenSpans.length === 0) {
            return {
                ...token,
                originalStart: token.start,
                originalEnd: token.end,
            };
        }

        return {
            ...token,
            originalStart: tokenSpans[0].originalStart,
            originalEnd: tokenSpans[tokenSpans.length - 1].originalEnd,
        };
    });
}
