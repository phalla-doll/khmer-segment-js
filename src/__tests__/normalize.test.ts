import { describe, it, expect } from "vitest";
import {
  normalizeKhmer,
  normalizeKhmerCluster,
} from "../core/normalize";

describe("normalizeKhmerCluster", () => {
  it("returns single character unchanged", () => {
    expect(normalizeKhmerCluster("ក")).toBe("ក");
  });

  it("returns already-canonical cluster unchanged", () => {
    const input = "ក្លី";
    expect(normalizeKhmerCluster(input)).toBe(input);
  });

  it("reorders misplaced vowel before coeng pair", () => {
    const consonant = "\u1780";
    const vowelI = "\u17B7";
    const coeng = "\u17D2";
    const consonantKa = "\u1780";

    const canonical = consonant + coeng + consonantKa + vowelI;
    const reordered = consonant + vowelI + coeng + consonantKa;

    expect(normalizeKhmerCluster(reordered)).toBe(canonical);
  });

  it("reorders misplaced sign before vowel", () => {
    const consonant = "\u1780";
    const vowelA = "\u17B6";
    const bantoc = "\u17CB";

    const canonical = consonant + vowelA + bantoc;
    const reordered = consonant + bantoc + vowelA;

    expect(normalizeKhmerCluster(reordered)).toBe(canonical);
  });

  it("handles coeng pair without following consonant", () => {
    const consonant = "\u1780";
    const coeng = "\u17D2";
    const input = consonant + coeng;

    expect(normalizeKhmerCluster(input)).toBe(input);
  });
});

describe("normalizeKhmer", () => {
  it("returns empty string unchanged", () => {
    expect(normalizeKhmer("")).toBe("");
  });

  it("returns Latin text unchanged", () => {
    expect(normalizeKhmer("Hello")).toBe("Hello");
  });

  it("returns already-normalized Khmer unchanged", () => {
    const input = "សួស្តី";
    expect(normalizeKhmer(input)).toBe(input);
  });

  it("normalizes mixed text leaving Latin unchanged", () => {
    const result = normalizeKhmer("Hello");
    expect(result).toBe("Hello");
  });

  it("normalizes clusters with reordered marks", () => {
    const consonant = "\u1780";
    const bantoc = "\u17CB";
    const vowelA = "\u17B6";

    const canonical = consonant + vowelA + bantoc;
    const reordered = consonant + bantoc + vowelA;

    expect(normalizeKhmer(reordered)).toBe(canonical);
  });

  it("handles Khmer text with spaces", () => {
    const result = normalizeKhmer("ក ខ");
    expect(result).toBe("ក ខ");
  });

  it("strips zero-width space (U+200B) between Khmer clusters", () => {
    const input = "ស\u200Bប្តា\u200Bហ៍";
    expect(normalizeKhmer(input)).toBe("សប្តាហ៍");
  });

  it("strips multiple invisible characters", () => {
    const input = "ក\u200B\u200C\uFEFFខ";
    expect(normalizeKhmer(input)).toBe("កខ");
  });

  it("preserves regular spaces while stripping invisible chars", () => {
    const input = "ក\u200B ខ";
    expect(normalizeKhmer(input)).toBe("ក ខ");
  });

  it("strips invisible chars from mixed Khmer and Latin text", () => {
    const input = "ក\u200Bhello\u200Dខ";
    expect(normalizeKhmer(input)).toBe("កhelloខ");
  });
});
