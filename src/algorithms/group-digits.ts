import type { FmmToken } from './fmm';
import { isDigit } from '../constants/char-categories';

function isDigitStr(s: string): boolean {
    if (s.length !== 1) return false;
    const cp = s.codePointAt(0)!;
    return isDigit(cp);
}

export function groupDigitTokens(tokens: FmmToken[]): FmmToken[] {
    if (tokens.length === 0) return [];

    const result: FmmToken[] = [];
    let i = 0;

    while (i < tokens.length) {
        if (isDigitStr(tokens[i].value)) {
            const start = tokens[i].start;
            let combined = tokens[i].value;
            let end = tokens[i].end;
            let known = tokens[i].isKnown;

            i++;
            while (i < tokens.length && isDigitStr(tokens[i].value)) {
                combined += tokens[i].value;
                end = tokens[i].end;
                known = known || tokens[i].isKnown;
                i++;
            }

            result.push({ value: combined, start, end, isKnown: known });
        } else {
            result.push(tokens[i]);
            i++;
        }
    }

    return result;
}
