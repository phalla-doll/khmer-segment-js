import { describe, it, expect } from "vitest";
import { segmentWords } from "../core/segment";
import { getDefaultDictionary } from "../dictionary/default-dictionary";

describe("large text correctness", () => {
  const dict = getDefaultDictionary();

  it("tokens reconstruct the original text", () => {
    const text = "ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា";
    const result = segmentWords(text, { dictionary: dict });

    const joined = result.tokens.map((t) => t.value).join("");
    expect(joined).toBe(text);
  });

  it("offsets are contiguous and non-overlapping", () => {
    const text = "សួស្តីអ្នកទាំងអស់គ្នាក្នុងប្រទេសកម្ពុជាខ្ញុំសរសេរភាសាខ្មែរ";
    const result = segmentWords(text, { dictionary: dict });

    expect(result.tokens[0].start).toBe(0);
    for (let i = 1; i < result.tokens.length; i++) {
      expect(result.tokens[i].start).toBe(result.tokens[i - 1].end);
    }
    expect(result.tokens[result.tokens.length - 1].end).toBe(text.length);
  });

  it("repeating text produces consistent tokens", () => {
    const sentence = "សួស្តីអ្នក";
    const text = sentence.repeat(100);
    const result = segmentWords(text, { dictionary: dict });

    const firstRound = result.tokens.filter(
      (t) => t.start < sentence.length
    );
    for (let i = 0; i < 100; i++) {
      const offset = i * sentence.length;
      const roundTokens = result.tokens.filter(
        (t) => t.start >= offset && t.end <= offset + sentence.length
      );
      expect(roundTokens.map((t) => t.value).join("")).toBe(sentence);
      expect(roundTokens.map((t) => t.isKnown)).toEqual(
        firstRound.map((t) => t.isKnown)
      );
    }
  });

  it("segments a full Khmer paragraph with reasonable known-word ratio", () => {
    const paragraph =
      "កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។ " +
      "ប្រជាជនខ្មែររស់នៅលើទឹកដីនេះអស់រយៈពេលជាយូរលង់មកហើយ។ " +
      "ភាសាខ្មែរជាភាសាជាតិដែលប្រើប្រាស់នៅក្នុងប្រទេសកម្ពុជា។ " +
      "ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា។ " +
      "សួស្តីអ្នកទាំងអស់គ្នានៅក្នុងព្រះរាជាណាចក្រកម្ពុជា។";
    const result = segmentWords(paragraph, { dictionary: dict });

    const joined = result.tokens.map((t) => t.value).join("");
    expect(joined).toBe(result.normalized);

    const knownRatio = result.tokens.filter((t) => t.isKnown).length / result.tokens.length;
    expect(knownRatio).toBeGreaterThan(0.3);
  });

  it("handles text with spaces and punctuation", () => {
    const text = "សួស្តី អ្នក។ កម្ពុជា!";
    const result = segmentWords(text, { dictionary: dict });

    const joined = result.tokens.map((t) => t.value).join("");
    expect(joined).toBe(text);

    expect(result.tokens[0].start).toBe(0);
    expect(result.tokens[result.tokens.length - 1].end).toBe(text.length);
  });

  it("handles mixed Khmer and Latin text", () => {
    const text = "ខ្ញុំសរសេរ Khmer text ភាសាខ្មែរ";
    const result = segmentWords(text, { dictionary: dict });

    const joined = result.tokens.map((t) => t.value).join("");
    expect(joined).toBe(text);

    const khmerTokens = result.tokens.filter((t) => /[\u1780-\u17FF]/.test(t.value));
    expect(khmerTokens.length).toBeGreaterThan(0);
  });
});
