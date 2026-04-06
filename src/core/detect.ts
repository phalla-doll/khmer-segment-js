import { isKhmerCodePoint } from "../constants/char-categories";

export function isKhmerChar(char: string): boolean {
  if (!char) return false;
  const cp = char.codePointAt(0)!;
  return isKhmerCodePoint(cp);
}

export function containsKhmer(text: string): boolean {
  for (const ch of text) {
    if (isKhmerChar(ch)) return true;
  }
  return false;
}

export function isKhmerText(text: string): boolean {
  if (!text.length) return false;
  let hasKhmer = false;
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    if (!isKhmerChar(ch)) return false;
    hasKhmer = true;
  }
  return hasKhmer;
}
