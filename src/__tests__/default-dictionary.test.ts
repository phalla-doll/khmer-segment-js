import { describe, it, expect } from "vitest";
import { getDefaultDictionary } from "../dictionary/default-dictionary";
import { loadFrequencyDictionary } from "../dictionary/load-frequency-dictionary";
import { segmentWords } from "../core/segment";
import { createDictionary } from "../dictionary/create-dictionary";

describe("getDefaultDictionary", () => {
  it("returns a valid dictionary", () => {
    const dict = getDefaultDictionary();
    expect(dict).toBeDefined();
    expect(dict.size).toBeGreaterThan(30000);
  });

  it("finds common Khmer words", () => {
    const dict = getDefaultDictionary();
    expect(dict.has("សួស្តី")).toBe(true);
    expect(dict.has("កម្ពុជា")).toBe(true);
    expect(dict.has("អ្នក")).toBe(true);
    expect(dict.has("បាន")).toBe(true);
    expect(dict.has("ខ្មែរ")).toBe(true);
    expect(dict.has("ភាសាខ្មែរ")).toBe(true);
  });

  it("returns false for non-Khmer or unknown strings", () => {
    const dict = getDefaultDictionary();
    expect(dict.has("hello")).toBe(false);
    expect(dict.has("")).toBe(false);
    expect(dict.has("xyzabc")).toBe(false);
  });

  it("returns the same cached instance on repeated calls", () => {
    const a = getDefaultDictionary();
    const b = getDefaultDictionary();
    expect(a).toBe(b);
  });

  it("supports hasPrefix", () => {
    const dict = getDefaultDictionary();
    expect(dict.hasPrefix!("កម្ពុ")).toBe(true);
    expect(dict.hasPrefix!("សួ")).toBe(true);
  });

  it("supports hasSuffix", () => {
    const dict = getDefaultDictionary();
    expect(dict.hasSuffix!("ជា")).toBe(true);
  });

  it("supports getFrequency", () => {
    const dict = getDefaultDictionary();
    const freq = dict.getFrequency!("ជា");
    expect(freq).toBeDefined();
    expect(typeof freq).toBe("number");
    expect(freq!).toBeGreaterThan(0);
  });

  it("getFrequency returns undefined for unknown words", () => {
    const dict = getDefaultDictionary();
    expect(dict.getFrequency!("hello")).toBeUndefined();
  });
});

describe("loadFrequencyDictionary", () => {
  it("returns words, entries, and frequencies", () => {
    const data = loadFrequencyDictionary();
    expect(data.words.length).toBeGreaterThan(30000);
    expect(data.entries.length).toBe(data.words.length);
    expect(data.frequencies.size).toBe(data.words.length);
  });

  it("entries are sorted by frequency descending", () => {
    const data = loadFrequencyDictionary();
    for (let i = 1; i < Math.min(data.entries.length, 100); i++) {
      expect(data.entries[i].freq).toBeLessThanOrEqual(data.entries[i - 1].freq);
    }
  });

  it("frequencies map matches entries", () => {
    const data = loadFrequencyDictionary();
    const first = data.entries[0];
    expect(data.frequencies.get(first.word)).toBe(first.freq);
  });

  it("returns the same cached instance on repeated calls", () => {
    const a = loadFrequencyDictionary();
    const b = loadFrequencyDictionary();
    expect(a).toBe(b);
  });
});

describe("segmentWords with default dictionary", () => {
  it("segments common text with high known-word ratio", () => {
    const dict = getDefaultDictionary();
    const result = segmentWords("សួស្តីអ្នក", { dictionary: dict });
    expect(result.tokens.length).toBeGreaterThanOrEqual(2);
    const knownCount = result.tokens.filter((t) => t.isKnown).length;
    expect(knownCount).toBeGreaterThanOrEqual(2);
  });

  it("segments a full sentence", () => {
    const dict = getDefaultDictionary();
    const result = segmentWords("ខ្ញុំសរសេរភាសាខ្មែរ", { dictionary: dict });
    expect(result.tokens.length).toBeGreaterThan(0);
    const knownRatio = result.tokens.filter((t) => t.isKnown).length / result.tokens.length;
    expect(knownRatio).toBeGreaterThan(0.5);
  });

  it("uses default dictionary with createDictionary for custom words", () => {
    const freqData = loadFrequencyDictionary();
    const dict = createDictionary([...freqData.words, "ពិសេសណាស់"], freqData.frequencies);
    expect(dict.has("ពិសេសណាស់")).toBe(true);
    expect(dict.has("កម្ពុជា")).toBe(true);
  });
});
