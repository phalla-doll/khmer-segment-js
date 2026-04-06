import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "src", "dictionary", "data");
const OUTPUT = join(DATA_DIR, "khmer-words.json");

const SOURCES: { file: string; weight: number }[] = [
  { file: "seafreq.txt", weight: 1 },
  { file: "KHSV.txt", weight: 1 },
  { file: "KHOV.txt", weight: 20 },
  { file: "DFD.txt", weight: 50 },
  { file: "HC.txt", weight: 1 },
  { file: "TD.txt", weight: 1 },
  { file: "villages.txt", weight: 10 },
  { file: "places.txt", weight: 10 },
  { file: "names.txt", weight: 5 },
];

const BASE_URL =
  "https://raw.githubusercontent.com/silnrsi/khmerlbdict/master/src";

async function downloadFile(name: string): Promise<string> {
  const url = `${BASE_URL}/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${name}: ${res.status}`);
  return await res.text();
}

function parseLines(
  content: string,
  weight: number
): Map<string, number> {
  const result = new Map<string, number>();
  const DEFAULT_FREQ = 1;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tabIdx = trimmed.indexOf("\t");
    let word: string;
    let freq: number;
    if (tabIdx === -1) {
      word = trimmed;
      freq = DEFAULT_FREQ;
    } else {
      word = trimmed.slice(0, tabIdx).trim();
      const freqStr = trimmed.slice(tabIdx + 1).trim();
      freq = parseInt(freqStr, 10);
      if (isNaN(freq)) continue;
    }
    if (!word) continue;
    const weighted = freq * weight;
    result.set(word, (result.get(word) ?? 0) + weighted);
  }
  return result;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const merged = new Map<string, number>();

  for (const { file, weight } of SOURCES) {
    console.log(`Downloading ${file}...`);
    const content = await downloadFile(file);
    console.log(`  Parsing ${file} (weight: ${weight})...`);
    const words = parseLines(content, weight);
    console.log(`  Found ${words.size} unique words`);
    for (const [word, freq] of words) {
      merged.set(word, (merged.get(word) ?? 0) + freq);
    }
  }

  console.log(`\nTotal unique words: ${merged.size}`);

  const entries = [...merged.entries()]
    .map(([word, freq]) => ({ word, freq }))
    .sort((a, b) => b.freq - a.freq);

  const json = JSON.stringify(entries, null, 2);
  writeFileSync(OUTPUT, json, "utf-8");

  const sizeKB = Math.round(Buffer.byteLength(json, "utf-8") / 1024);
  console.log(`Written to ${OUTPUT}`);
  console.log(`File size: ${sizeKB} KB`);
  console.log(`Top 10 words:`);
  entries.slice(0, 10).forEach((e) => console.log(`  ${e.word}: ${e.freq}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
