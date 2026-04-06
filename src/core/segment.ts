import type {
    SegmentOptions,
    SegmentResult,
    SegmentToken,
} from '../types/public';
import { normalizeKhmer } from './normalize';
import { splitClusters } from './cluster';
import { fmmSegment } from '../algorithms/fmm';
import { bmmSegment } from '../algorithms/bmm';
import { bimmSegment } from '../algorithms/bimm';
import { groupDigitTokens } from '../algorithms/group-digits';

export function segmentWords(
    text: string,
    options?: SegmentOptions
): SegmentResult {
    const shouldNormalize = options?.normalize !== false;
    const normalized = shouldNormalize ? normalizeKhmer(text) : text;
    const clusters = splitClusters(normalized);
    const dictionary = options?.dictionary;

    let tokens: SegmentToken[];
    if (dictionary) {
        const strategy = options?.strategy ?? 'fmm';
        switch (strategy) {
            case 'bmm':
                tokens = bmmSegment(clusters, dictionary);
                break;
            case 'bimm':
                tokens = bimmSegment(clusters, dictionary);
                break;
            default:
                tokens = fmmSegment(clusters, dictionary);
                break;
        }
    } else {
        let offset = 0;
        tokens = clusters.map(cluster => {
            const start = offset;
            const end = offset + cluster.length;
            offset = end;
            return { value: cluster, start, end, isKnown: false };
        });
    }

    tokens = groupDigitTokens(tokens) as SegmentToken[];

    return {
        original: text,
        normalized,
        tokens,
    };
}
