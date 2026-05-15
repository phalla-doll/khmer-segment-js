import type { SegmentToken } from '../types/public';
import { splitClusters } from '../core/cluster';
import { isDigit, isKhmerCodePoint } from '../constants/char-categories';

type ExternalKind = 'digit' | 'khmer' | 'latin' | 'space' | 'punct';

interface ExternalPart {
    value: string;
    start: number;
    end: number;
    kind: ExternalKind;
    isKnown: boolean;
}

function isAsciiLatin(cp: number): boolean {
    return (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a);
}

function isWhitespace(cp: number): boolean {
    return /\s/u.test(String.fromCodePoint(cp));
}

function isNumberSeparator(value: string): boolean {
    return value === ',' || value === '.';
}

function isDigitValue(value: string): boolean {
    return value.length > 0 && [...value].every(char => isDigit(cp(char)));
}

function isPunctuationValue(value: string): boolean {
    return (
        value.length > 0 &&
        [...value].every(char => {
            const codePoint = cp(char);
            return (
                !isDigit(codePoint) &&
                !isAsciiLatin(codePoint) &&
                !isWhitespace(codePoint) &&
                !isKhmerCodePoint(codePoint)
            );
        })
    );
}

function cp(value: string): number {
    return value.codePointAt(0) as number;
}

function containsKhmerNonDigit(value: string): boolean {
    return [...value].some(char => {
        const codePoint = cp(char);
        return isKhmerCodePoint(codePoint) && !isDigit(codePoint);
    });
}

function containsLatinOrDigit(value: string): boolean {
    return [...value].some(char => {
        const codePoint = cp(char);
        return isAsciiLatin(codePoint) || isDigit(codePoint);
    });
}

function canMergeNumberSeparator(
    current: ExternalPart,
    separator: ExternalPart,
    next: ExternalPart | undefined
): boolean {
    return (
        current.kind === 'digit' &&
        separator.kind === 'punct' &&
        isNumberSeparator(separator.value) &&
        next?.kind === 'digit'
    );
}

function splitExternalToken(token: SegmentToken): ExternalPart[] {
    const parts: ExternalPart[] = [];
    let offset = token.start;

    for (const cluster of splitClusters(token.value)) {
        const codePoint = cp(cluster);
        const start = offset;
        const end = start + cluster.length;
        offset = end;

        if (isDigit(codePoint)) {
            parts.push({
                value: cluster,
                start,
                end,
                kind: 'digit',
                isKnown: true,
            });
        } else if (containsKhmerNonDigit(cluster)) {
            parts.push({
                value: cluster,
                start,
                end,
                kind: 'khmer',
                isKnown: token.isKnown,
            });
        } else if (isAsciiLatin(codePoint)) {
            parts.push({
                value: cluster,
                start,
                end,
                kind: 'latin',
                isKnown: false,
            });
        } else if (isWhitespace(codePoint)) {
            parts.push({
                value: cluster,
                start,
                end,
                kind: 'space',
                isKnown: false,
            });
        } else {
            parts.push({
                value: cluster,
                start,
                end,
                kind: 'punct',
                isKnown: false,
            });
        }
    }

    return parts;
}

function pushPart(result: SegmentToken[], part: ExternalPart): void {
    const previous = result[result.length - 1];
    const previousLastChar = previous?.value[previous.value.length - 1];
    if (
        previous &&
        previous.end === part.start &&
        previous.isKnown === part.isKnown &&
        ((part.kind === 'latin' &&
            previousLastChar !== undefined &&
            isAsciiLatin(cp(previousLastChar))) ||
            (part.kind === 'space' && /^\s+$/u.test(previous.value)) ||
            (part.kind === 'digit' && isDigitValue(previous.value)) ||
            (part.kind === 'punct' && isPunctuationValue(previous.value)))
    ) {
        previous.value += part.value;
        previous.end = part.end;
        return;
    }

    result.push({
        value: part.value,
        start: part.start,
        end: part.end,
        isKnown: part.isKnown,
    });
}

function mergeExternalParts(parts: ExternalPart[]): SegmentToken[] {
    const result: SegmentToken[] = [];
    let i = 0;

    while (i < parts.length) {
        const part = parts[i];

        if (part.kind === 'digit') {
            const start = part.start;
            let value = part.value;
            let end = part.end;
            i++;

            while (i < parts.length) {
                const current = parts[i];
                const next = parts[i + 1];

                if (current.kind === 'digit') {
                    value += current.value;
                    end = current.end;
                    i++;
                } else if (
                    canMergeNumberSeparator(
                        { ...part, value, end },
                        current,
                        next
                    )
                ) {
                    value += current.value + next.value;
                    end = next.end;
                    i += 2;
                } else {
                    break;
                }
            }

            result.push({ value, start, end, isKnown: true });
            continue;
        }

        pushPart(result, part);
        i++;
    }

    return result;
}

export function groupExternalTokens(tokens: SegmentToken[]): SegmentToken[] {
    if (tokens.length === 0) return [];

    const result: SegmentToken[] = [];
    let pendingExternalParts: ExternalPart[] = [];

    function flushExternalParts(): void {
        if (pendingExternalParts.length === 0) return;
        result.push(...mergeExternalParts(pendingExternalParts));
        pendingExternalParts = [];
    }

    for (const token of tokens) {
        if (
            containsKhmerNonDigit(token.value) &&
            (token.isKnown || !containsLatinOrDigit(token.value))
        ) {
            flushExternalParts();
            result.push(token);
        } else {
            pendingExternalParts.push(...splitExternalToken(token));
        }
    }

    flushExternalParts();

    return result;
}
