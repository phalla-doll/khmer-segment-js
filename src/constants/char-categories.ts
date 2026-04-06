import {
  CONSONANT_START,
  CONSONANT_END,
  INDEPENDENT_VOWEL_START,
  INDEPENDENT_VOWEL_END,
  DEPENDENT_VOWEL_START,
  DEPENDENT_VOWEL_END,
  SIGN_START,
  SIGN_END,
  KHMER_COENG,
  KHMER_RANGE_START,
  KHMER_RANGE_END,
  DIGIT_START,
  DIGIT_END,
} from "./unicode";

export function isKhmerCodePoint(cp: number): boolean {
  return cp >= KHMER_RANGE_START && cp <= KHMER_RANGE_END;
}

export function isConsonant(cp: number): boolean {
  return cp >= CONSONANT_START && cp <= CONSONANT_END;
}

export function isIndependentVowel(cp: number): boolean {
  return cp >= INDEPENDENT_VOWEL_START && cp <= INDEPENDENT_VOWEL_END;
}

export function isDependentVowel(cp: number): boolean {
  return cp >= DEPENDENT_VOWEL_START && cp <= DEPENDENT_VOWEL_END;
}

export function isSign(cp: number): boolean {
  return cp >= SIGN_START && cp <= SIGN_END;
}

export function isCoeng(cp: number): boolean {
  return cp === KHMER_COENG;
}

export function isKhmerDigit(cp: number): boolean {
  return cp >= DIGIT_START && cp <= DIGIT_END;
}

export function isClusterBase(cp: number): boolean {
  return isConsonant(cp) || isIndependentVowel(cp);
}

export function isClusterContinuation(cp: number): boolean {
  return isDependentVowel(cp) || isSign(cp) || isCoeng(cp);
}
