import type { SegmentToken } from '../types/public';
import { isDigit } from '../constants/char-categories';

function isDigitStr(s: string): boolean {
    if (s.length !== 1) return false;
    return isDigit(s.codePointAt(0) as number);
}

export function groupDigitTokens(tokens: SegmentToken[]): SegmentToken[] {
    if (tokens.length === 0) return [];

    const result: SegmentToken[] = [];
    let i = 0;

    while (i < tokens.length) {
        if (isDigitStr(tokens[i].value)) {
            const start = tokens[i].start;
            let combined = tokens[i].value;
            let end = tokens[i].end;

            i++;
            while (i < tokens.length && isDigitStr(tokens[i].value)) {
                combined += tokens[i].value;
                end = tokens[i].end;
                i++;
            }

            result.push({ value: combined, start, end, isKnown: true });
        } else {
            result.push(tokens[i]);
            i++;
        }
    }

    return result;
}
