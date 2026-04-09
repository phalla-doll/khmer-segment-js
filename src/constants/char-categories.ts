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
    ASCII_DIGIT_START,
    ASCII_DIGIT_END,
    KHMER_PUNCT_KHAN,
    KHMER_PUNCT_BARIYOOSAN,
    KHMER_PUNCT_CAMNUC_PII_KUUH,
} from './unicode';

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

/** MUUSIKATOAN (U+17C9) or TRIISAP (U+17CA) — consonant-shifting signs */
export function isShiftSign(cp: number): boolean {
    return cp === 0x17c9 || cp === 0x17ca;
}

export function isCoeng(cp: number): boolean {
    return cp === KHMER_COENG;
}

export function isKhmerDigit(cp: number): boolean {
    return cp >= DIGIT_START && cp <= DIGIT_END;
}

export function isAsciiDigit(cp: number): boolean {
    return cp >= ASCII_DIGIT_START && cp <= ASCII_DIGIT_END;
}

export function isDigit(cp: number): boolean {
    return isKhmerDigit(cp) || isAsciiDigit(cp);
}

export function isKhmerSentencePunctuation(cp: number): boolean {
    return (
        cp === KHMER_PUNCT_KHAN ||
        cp === KHMER_PUNCT_BARIYOOSAN ||
        cp === KHMER_PUNCT_CAMNUC_PII_KUUH
    );
}

export function isKhmerSentencePunctuationToken(value: string): boolean {
    return (
        value.length === 1 &&
        isKhmerSentencePunctuation(value.codePointAt(0) as number)
    );
}

export function isClusterBase(cp: number): boolean {
    return isConsonant(cp) || isIndependentVowel(cp);
}

export function isClusterContinuation(cp: number): boolean {
    return isDependentVowel(cp) || isSign(cp) || isCoeng(cp);
}

export function isRobat(cp: number): boolean {
    return cp === 0x17cc;
}

export function cpAt(s: string, idx: number = 0): number {
    return s.codePointAt(idx) as number;
}
