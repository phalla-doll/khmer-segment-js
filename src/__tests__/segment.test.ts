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

  describe("digit grouping", () => {
    const dict = createDictionary(["សួស្តី", "អ្នក"]);

    it("groups consecutive Khmer digits into a single token", () => {
      const result = segmentWords("១៨៤", { dictionary: dict });
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toBe("១៨៤");
      expect(result.tokens[0].start).toBe(0);
      expect(result.tokens[0].end).toBe(3);
    });

    it("groups digits surrounded by words", () => {
      const result = segmentWords("សួស្តី១៨៤អ្នក", { dictionary: dict });
      const digitToken = result.tokens.find((t) => /^[\u17E0-\u17E9]+$/.test(t.value));
      expect(digitToken).toBeDefined();
      expect(digitToken!.value).toBe("១៨៤");
    });

    it("does not group non-adjacent digits", () => {
      const result = segmentWords("១អ្នក៨", { dictionary: dict });
      const digitTokens = result.tokens.filter((t) => /^[\u17E0-\u17E9]$/.test(t.value));
      expect(digitTokens).toHaveLength(2);
      expect(digitTokens[0].value).toBe("១");
      expect(digitTokens[1].value).toBe("៨");
    });

    it("groups digits even without dictionary", () => {
      const result = segmentWords("៥៦៧");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toBe("៥៦៧");
    });
  });

  describe("BMM strategy", () => {
    const dict = createDictionary(["សួស្តី", "អ្នក", "ក្មែរ", "ទាំងអស់គ្នា"]);

    it("segments known words with BMM", () => {
      const result = segmentWords("សួស្តី", { dictionary: dict, strategy: "bmm" });
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toBe("សួស្តី");
      expect(result.tokens[0].isKnown).toBe(true);
    });

    it("segments multiple known words with BMM", () => {
      const result = segmentWords("សួស្តីអ្នក", { dictionary: dict, strategy: "bmm" });
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].value).toBe("សួស្តី");
      expect(result.tokens[1].value).toBe("អ្នក");
      expect(result.tokens.every((t) => t.isKnown)).toBe(true);
    });

    it("computes correct offsets with BMM", () => {
      const result = segmentWords("សួស្តីអ្នក", { dictionary: dict, strategy: "bmm" });
      expect(result.tokens[0].start).toBe(0);
      expect(result.tokens[0].end).toBe("សួស្តី".length);
      expect(result.tokens[1].start).toBe("សួស្តី".length);
      expect(result.tokens[1].end).toBe("សួស្តីអ្នក".length);
    });

    it("reconstructs text from BMM tokens", () => {
      const text = "សួស្តីអ្នកក្មែរ";
      const result = segmentWords(text, { dictionary: dict, strategy: "bmm" });
      expect(result.tokens.map((t) => t.value).join("")).toBe(text);
    });

    it("matches long compound words with BMM", () => {
      const result = segmentWords("ទាំងអស់គ្នា", { dictionary: dict, strategy: "bmm" });
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toBe("ទាំងអស់គ្នា");
      expect(result.tokens[0].isKnown).toBe(true);
    });
  });

  describe("BiMM strategy", () => {
    const dict = createDictionary(["សួស្តី", "អ្នក", "ក្មែរ", "ទាំងអស់គ្នា"]);

    it("segments known words with BiMM", () => {
      const result = segmentWords("សួស្តី", { dictionary: dict, strategy: "bimm" });
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toBe("សួស្តី");
      expect(result.tokens[0].isKnown).toBe(true);
    });

    it("segments multiple known words with BiMM", () => {
      const result = segmentWords("សួស្តីអ្នក", { dictionary: dict, strategy: "bimm" });
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].value).toBe("សួស្តី");
      expect(result.tokens[1].value).toBe("អ្នក");
      expect(result.tokens.every((t) => t.isKnown)).toBe(true);
    });

    it("computes correct offsets with BiMM", () => {
      const result = segmentWords("សួស្តីអ្នក", { dictionary: dict, strategy: "bimm" });
      expect(result.tokens[0].start).toBe(0);
      expect(result.tokens[result.tokens.length - 1].end).toBe("សួស្តីអ្នក".length);
    });

    it("reconstructs text from BiMM tokens", () => {
      const text = "សួស្តីអ្នកក្មែរ";
      const result = segmentWords(text, { dictionary: dict, strategy: "bimm" });
      expect(result.tokens.map((t) => t.value).join("")).toBe(text);
    });

    it("matches long compound words with BiMM", () => {
      const result = segmentWords("ទាំងអស់គ្នា", { dictionary: dict, strategy: "bimm" });
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toBe("ទាំងអស់គ្នា");
      expect(result.tokens[0].isKnown).toBe(true);
    });
  });

  describe("strategy comparison", () => {
    it("defaults to FMM when no strategy specified", () => {
      const dict = createDictionary(["សួស្តី"]);
      const result = segmentWords("សួស្តី", { dictionary: dict });
      expect(result.tokens[0].value).toBe("សួស្តី");
      expect(result.tokens[0].isKnown).toBe(true);
    });

    it("all strategies produce contiguous offsets", () => {
      const dict = getDefaultDictionary();
      const text = "ក្រោយពីមានការផ្សព្វផ្សាយ";

      for (const strategy of ["fmm", "bmm", "bimm"] as const) {
        const result = segmentWords(text, { dictionary: dict, strategy });
        expect(result.tokens[0].start).toBe(0);
        expect(result.tokens[result.tokens.length - 1].end).toBe(result.normalized.length);
        for (let j = 1; j < result.tokens.length; j++) {
          expect(result.tokens[j].start).toBe(result.tokens[j - 1].end);
        }
      }
    });

    it("all strategies reconstruct the same text", () => {
      const dict = getDefaultDictionary();
      const text = "ខ្ញុំសរសេរភាសាខ្មែរនៅក្នុងប្រទេសកម្ពុជា";

      for (const strategy of ["fmm", "bmm", "bimm"] as const) {
        const result = segmentWords(text, { dictionary: dict, strategy });
        expect(result.tokens.map((t) => t.value).join("")).toBe(result.normalized);
      }
    });
  });
});
