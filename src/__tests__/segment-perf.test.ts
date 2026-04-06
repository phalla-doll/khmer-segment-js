import { describe, it, expect } from "vitest";
import { segmentWords } from "../core/segment";
import { getDefaultDictionary } from "../dictionary/default-dictionary";

describe("segmentation performance", () => {
  const dict = getDefaultDictionary();

  it("segments 500 repetitions efficiently", () => {
    const sentence = "សួស្តីអ្នក";
    const text = sentence.repeat(500);

    const start = Date.now();
    const result = segmentWords(text, { dictionary: dict });
    const elapsed = Date.now() - start;

    expect(result.tokens.length).toBeGreaterThan(0);

    const joined = result.tokens.map((t) => t.value).join("");
    expect(joined).toBe(text);

    expect(elapsed).toBeLessThan(5000);
  });

  it("segments 2000 repetitions efficiently", () => {
    const sentence = "ខ្ញុំសរសេរភាសាខ្មែរ";
    const text = sentence.repeat(2000);

    const start = Date.now();
    const result = segmentWords(text, { dictionary: dict });
    const elapsed = Date.now() - start;

    expect(result.tokens.length).toBeGreaterThan(0);

    const joined = result.tokens.map((t) => t.value).join("");
    expect(joined).toBe(text);

    expect(elapsed).toBeLessThan(10000);
  });

  it("segments a large paragraph with mixed known/unknown words", () => {
    const paragraph =
      "កម្ពុជាជាប្រទេសមួយស្ថិតនៅទ្វីបអាស៊ី។ " +
      "រដ្ឋធម្មនុញ្ញនៃព្រះរាជាណាចក្រកម្ពុជារក្សាទុកនូវសិទ្ធិសេរីភាពនៃប្រជាពលរដ្ឋ។ " +
      "ប្រជាជនខ្មែររស់នៅលើទឹកដីនេះអស់រយៈពេលជាយូរលង់មកហើយ។ " +
      "ភាសាខ្មែរជាភាសាជាតិដែលប្រើប្រាស់នៅក្នុងប្រទេសកម្ពុជា។";
    const text = paragraph.repeat(100);

    const start = Date.now();
    const result = segmentWords(text, { dictionary: dict });
    const elapsed = Date.now() - start;

    expect(result.tokens.length).toBeGreaterThan(0);

    const knownRatio = result.tokens.filter((t) => t.isKnown).length / result.tokens.length;
    expect(knownRatio).toBeGreaterThan(0.3);

    expect(elapsed).toBeLessThan(10000);
  });
});
