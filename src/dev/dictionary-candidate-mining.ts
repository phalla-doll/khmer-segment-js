export interface Span {
    value: string;
    start: number;
    end: number;
    isKnown?: boolean;
}

export interface CandidateRow {
    value: string;
    count: number;
    example: string;
}

export interface CandidateMaps {
    unknownKhmerSpans: Map<string, CandidateRow>;
    underSplitGoldTokens: Map<string, CandidateRow>;
    recurringNameOrCompoundTokens: Map<string, CandidateRow>;
}

const KHMER_RE = /[\u1780-\u17ff]/;
const MAX_EXAMPLE_CHARS = 240;

function isKhmer(value: string): boolean {
    return KHMER_RE.test(value);
}

function toSpans(tokens: string[]): Span[] {
    let offset = 0;
    return tokens.map(value => {
        const span = { value, start: offset, end: offset + value.length };
        offset = span.end;
        return span;
    });
}

function overlaps(container: Span, spans: Span[]): Span[] {
    return spans.filter(
        span => span.start >= container.start && span.end <= container.end
    );
}

function addCandidate(
    candidates: Map<string, CandidateRow>,
    value: string,
    example: string
): void {
    const shortExample =
        example.length <= MAX_EXAMPLE_CHARS
            ? example
            : `${example.slice(0, MAX_EXAMPLE_CHARS)} ...`;
    const existing = candidates.get(value);
    if (existing) {
        existing.count++;
    } else {
        candidates.set(value, { value, count: 1, example: shortExample });
    }
}

export function createCandidateMaps(): CandidateMaps {
    return {
        unknownKhmerSpans: new Map<string, CandidateRow>(),
        underSplitGoldTokens: new Map<string, CandidateRow>(),
        recurringNameOrCompoundTokens: new Map<string, CandidateRow>(),
    };
}

export function collectCandidateRows(
    goldWords: string[],
    predSpans: Span[],
    candidates: CandidateMaps
): void {
    const goldSpans = toSpans(goldWords);
    const example = goldWords.join(' | ');

    for (const pred of predSpans) {
        if (pred.isKnown === false && isKhmer(pred.value)) {
            addCandidate(candidates.unknownKhmerSpans, pred.value, example);
        }
    }

    for (const gold of goldSpans) {
        if (!isKhmer(gold.value)) continue;
        const predictedInside = overlaps(gold, predSpans);
        if (predictedInside.length > 1) {
            addCandidate(candidates.underSplitGoldTokens, gold.value, example);
        }
        if (gold.value.length >= 4) {
            addCandidate(
                candidates.recurringNameOrCompoundTokens,
                gold.value,
                example
            );
        }
    }
}
