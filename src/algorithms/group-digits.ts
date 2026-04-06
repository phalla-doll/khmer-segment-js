import type { FmmToken } from "./fmm";

/**
 * Checks if a string is a single Khmer digit.
 * Khmer digits are U+17E0 (០) through U+17E9 (៩).
 */
function isKhmerDigitStr(s: string): boolean {
  if (s.length !== 1) return false;
  const cp = s.codePointAt(0)!;
  return cp >= 0x17e0 && cp <= 0x17e9;
}

/**
 * Merges consecutive digit tokens into a single token.
 *
 * For example, three separate tokens ១, ៨, ៤ become one token ១៨៤.
 * This is applied as a post-processing step after FMM/BMM segmentation.
 */
export function groupDigitTokens(tokens: FmmToken[]): FmmToken[] {
  if (tokens.length === 0) return [];

  const result: FmmToken[] = [];
  let i = 0;

  while (i < tokens.length) {
    if (isKhmerDigitStr(tokens[i].value)) {
      const start = tokens[i].start;
      let combined = tokens[i].value;
      let end = tokens[i].end;
      let known = tokens[i].isKnown;

      i++;
      while (i < tokens.length && isKhmerDigitStr(tokens[i].value)) {
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