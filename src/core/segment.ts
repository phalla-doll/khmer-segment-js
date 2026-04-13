import type {
    KhmerDictionary,
    SegmentOptions,
    SegmentResult,
    SegmentToken,
} from '../types/public';
import { normalizeKhmer } from './normalize';
import { splitClusters } from './cluster';
import { fmmSegment } from '../algorithms/fmm';
import { bmmSegment } from '../algorithms/bmm';
import { bimmSegment } from '../algorithms/bimm';
import { viterbiSegment } from '../algorithms/viterbi';
import { groupDigitTokens } from '../algorithms/group-digits';
import { isKhmerSentencePunctuationToken } from '../constants/char-categories';

const VALID_STRATEGIES = ['fmm', 'bmm', 'bimm', 'viterbi'] as const;

function assertStringInput(
    name: string,
    value: unknown
): asserts value is string {
    if (typeof value !== 'string') {
        throw new TypeError(`${name} must be a string, got ${typeof value}`);
    }
}

function validateDictionary(
    dictionary: unknown
): asserts dictionary is KhmerDictionary {
    if (dictionary === undefined) {
        return;
    }
    if (dictionary === null || typeof dictionary !== 'object') {
        throw new TypeError(
            `Invalid dictionary: expected an object implementing KhmerDictionary, got ${typeof dictionary}`
        );
    }

    const maybeDictionary = dictionary as Partial<KhmerDictionary>;
    if (typeof maybeDictionary.has !== 'function') {
        throw new TypeError(
            'Invalid dictionary: missing required has(word) function'
        );
    }
    if (
        typeof maybeDictionary.size !== 'number' ||
        !Number.isFinite(maybeDictionary.size)
    ) {
        throw new TypeError('Invalid dictionary: size must be a finite number');
    }
    if (
        maybeDictionary.hasPrefix !== undefined &&
        typeof maybeDictionary.hasPrefix !== 'function'
    ) {
        throw new TypeError('Invalid dictionary: hasPrefix must be a function');
    }
    if (
        maybeDictionary.hasSuffix !== undefined &&
        typeof maybeDictionary.hasSuffix !== 'function'
    ) {
        throw new TypeError('Invalid dictionary: hasSuffix must be a function');
    }
    if (
        maybeDictionary.getFrequency !== undefined &&
        typeof maybeDictionary.getFrequency !== 'function'
    ) {
        throw new TypeError(
            'Invalid dictionary: getFrequency must be a function'
        );
    }
}

function validateOptions(options?: SegmentOptions): void {
    if (
        options !== undefined &&
        (options === null || typeof options !== 'object')
    ) {
        throw new TypeError(
            `options must be an object when provided, got ${typeof options}`
        );
    }

    if (options?.strategy !== undefined) {
        if (typeof options.strategy !== 'string') {
            throw new TypeError(
                `Invalid strategy: expected a string, got ${typeof options.strategy}`
            );
        }
        if (
            !(VALID_STRATEGIES as readonly string[]).includes(options.strategy)
        ) {
            throw new TypeError(
                `Invalid strategy: "${options.strategy}". Valid strategies are: ${VALID_STRATEGIES.join(', ')}`
            );
        }
    }

    validateDictionary(options?.dictionary);
}

export function segmentWords(
    text: string,
    options?: SegmentOptions
): SegmentResult {
    assertStringInput('text', text);
    validateOptions(options);

    const shouldNormalize = options?.normalize !== false;
    const normalized = shouldNormalize ? normalizeKhmer(text) : text;
    const clusters = splitClusters(normalized);
    const dictionary = options?.dictionary;

    let tokens: SegmentToken[];
    if (dictionary) {
        const strategy = options?.strategy ?? 'viterbi';
        switch (strategy) {
            case 'fmm':
                tokens = fmmSegment(clusters, dictionary);
                break;
            case 'bmm':
                tokens = bmmSegment(clusters, dictionary);
                break;
            case 'bimm':
                tokens = bimmSegment(clusters, dictionary);
                break;
            case 'viterbi':
                tokens = viterbiSegment(clusters, dictionary, {
                    boundaryPenalty: options?.viterbiBoundaryPenalty,
                });
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

    tokens = groupDigitTokens(tokens);
    tokens = markKhmerSentencePunctuationKnown(tokens);

    return {
        original: text,
        normalized,
        tokens,
    };
}

function markKhmerSentencePunctuationKnown(
    tokens: SegmentToken[]
): SegmentToken[] {
    return tokens.map(token =>
        isKhmerSentencePunctuationToken(token.value)
            ? { ...token, isKnown: true }
            : token
    );
}
