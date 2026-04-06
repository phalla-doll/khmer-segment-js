import { describe, it, expect } from "vitest";
import { segmentWords } from "../core/segment";
import { createDictionary } from "../dictionary/create-dictionary";
import { getDefaultDictionary } from "../dictionary/default-dictionary";

describe("segmentWords", () => {
  const dict = createDictionary(["សួស្តី", "អ្នក", "ក្មែរ", "ទាំងអស់គ្នា"]);

  it("segments known words", () => {
    const result = segmentWords("សួស្តី", { dictionary: dict });
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].value).toBe("សួស្តី");
    expect(result.tokens[0].isKnown).toBe(true);
  });

  it("segments multiple known words", () => {
    const result = segmentWords("សួស្តីអ្នក", { dictionary: dict });
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0].value).toBe("សួស្តី");
    expect(result.tokens[0].isKnown).toBe(true);
    expect(result.tokens[1].value).toBe("អ្នក");
    expect(result.tokens[1].isKnown).toBe(true);
  });

  it("marks unknown clusters as unknown", () => {
    const result = segmentWords("សួស្តីគ", { dictionary: dict });
    const unknowns = result.tokens.filter((t) => !t.isKnown);
    expect(unknowns.length).toBeGreaterThanOrEqual(1);
    expect(unknowns[0].value).toBe("គ");
  });

  it("returns original and normalized text", () => {
    const result = segmentWords("សួស្តី", { dictionary: dict });
    expect(result.original).toBe("សួស្តី");
    expect(result.normalized).toBe("សួស្តី");
  });

  it("returns unknown tokens when no dictionary provided", () => {
    const result = segmentWords("កខគ");
    expect(result.tokens.every((t) => !t.isKnown)).toBe(true);
    expect(result.tokens.map((t) => t.value)).toEqual(["ក", "ខ", "គ"]);
  });

  it("returns empty tokens for empty string", () => {
    const result = segmentWords("", { dictionary: dict });
    expect(result.tokens).toEqual([]);
  });

  it("handles mixed Khmer and Latin without dictionary", () => {
    const result = segmentWords("កA");
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0].value).toBe("ក");
    expect(result.tokens[1].value).toBe("A");
  });

  it("respects normalize: false option", () => {
    const result = segmentWords("ក", {
      dictionary: dict,
      normalize: false,
    });
    expect(result.normalized).toBe("ក");
  });

  it("segments a long word with FMM (greedy longest match)", () => {
    const result = segmentWords("ទាំងអស់គ្នា", { dictionary: dict });
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].value).toBe("ទាំងអស់គ្នា");
    expect(result.tokens[0].isKnown).toBe(true);
  });

  it("computes correct start/end offsets", () => {
    const result = segmentWords("សួស្តីអ្នក", { dictionary: dict });
    expect(result.tokens[0].start).toBe(0);
    expect(result.tokens[0].end).toBe("សួស្តី".length);
    expect(result.tokens[1].start).toBe("សួស្តី".length);
    expect(result.tokens[1].end).toBe("សួស្តីអ្នក".length);
  });

  it("handles text where no word matches", () => {
    const result = segmentWords("ឥត", { dictionary: dict });
    expect(result.tokens.every((t) => !t.isKnown)).toBe(true);
  });

  describe("zero-width space handling", () => {
    const defaultDict = getDefaultDictionary();

    const zwsCases = [
      { word: "សប្តាហ៍", input: "ស\u200Bប្តា\u200Bហ៍" },
      { word: "រៀងរាល់", input: "រៀង\u200Bរាល់" },
      { word: "កែច្នៃ", input: "កែ\u200Bច្នៃ" },
    ];

    for (const { word, input } of zwsCases) {
      it(`segments "${word}" with ZWS as known word`, () => {
        const result = segmentWords(input, { dictionary: defaultDict });
        const matched = result.tokens.find((t) => t.value === word);
        expect(matched).toBeDefined();
        expect(matched!.isKnown).toBe(true);
      });
    }
  });
});
