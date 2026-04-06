# khmer-segment

A framework-agnostic Khmer text processing library for JavaScript and TypeScript.

Works in **Next.js**, **Angular**, **React**, **Vue**, **Node.js**, and the **browser**.

Zero external dependencies. Tree-shakeable. Pure functions.

---

## Install

```bash
npm install khmer-segment
```

---

## Quick Start

```ts
import {
  containsKhmer,
  normalizeKhmer,
  splitClusters,
  countClusters,
  createDictionary,
  segmentWords,
} from "khmer-segment";

// Detect Khmer text
containsKhmer("Hello សួស្តី"); // true
isKhmerText("សួស្តីអ្នក");      // true

// Normalize Unicode ordering
const text = normalizeKhmer("សួស្តីអ្នក");

// Split into grapheme clusters (not naive chars)
const clusters = splitClusters("សួស្តី"); // ["សួ", "ស្តី"]
countClusters("សួស្តី"); // 2

// Segment words with a dictionary
const dict = createDictionary(["សួស្តី", "អ្នក", "ទាំងអស់គ្នា"]);
const result = segmentWords("សួស្តីអ្នកទាំងអស់គ្នា", { dictionary: dict });

console.log(result.tokens);
// [
//   { value: "សួស្តី", start: 0, end: 6, isKnown: true },
//   { value: "អ្នក", start: 6, end: 9, isKnown: true },
//   { value: "ទាំងអស់គ្នា", start: 9, end: 19, isKnown: true },
// ]
```

---

## API Reference

### Detection

| Function | Description |
|---|---|
| `isKhmerChar(char)` | Returns `true` if the character is a Khmer code point |
| `containsKhmer(text)` | Returns `true` if the text contains any Khmer characters |
| `isKhmerText(text)` | Returns `true` if all non-whitespace characters are Khmer |

### Normalization

| Function | Description |
|---|---|
| `normalizeKhmer(text)` | Reorders Khmer characters into canonical order (base → coeng → vowel → sign) |
| `normalizeKhmerCluster(cluster)` | Normalizes a single cluster |

### Cluster Utilities

| Function | Description |
|---|---|
| `splitClusters(text)` | Splits text into Khmer-safe grapheme clusters |
| `countClusters(text)` | Returns the number of clusters in the text |
| `getClusterBoundaries(text)` | Returns `{ start, end }` offsets for each cluster |

### Segmentation

| Function | Description |
|---|---|
| `segmentWords(text, options?)` | Segments text into word tokens using dictionary-based matching |

#### `SegmentOptions`

```ts
interface SegmentOptions {
  strategy?: "fmm" | "bmm" | "bimm"; // default: "fmm"
  dictionary?: KhmerDictionary;
  normalize?: boolean; // default: true
}
```

#### `SegmentResult`

```ts
interface SegmentResult {
  original: string;
  normalized: string;
  tokens: SegmentToken[];
}

interface SegmentToken {
  value: string;
  start: number;
  end: number;
  isKnown: boolean;
}
```

### Dictionary

| Function | Description |
|---|---|
| `createDictionary(words, frequencies?)` | Creates an in-memory dictionary from a word list |

```ts
const dict = createDictionary(["សួស្តី", "អ្នក", "ខ្មែរ"]);

dict.has("សួស្តី");        // true
dict.hasPrefix!("សួ");     // true (trie-based O(k) lookup)
dict.hasSuffix!("ី");       // true
dict.size;                   // 3
```

#### `KhmerDictionary` interface

```ts
interface KhmerDictionary {
  has(word: string): boolean;
  hasPrefix?(value: string): boolean;
  hasSuffix?(value: string): boolean;
  getFrequency?(word: string): number | undefined;
  size: number;
}
```

You can implement this interface for custom dictionary backends (remote, compressed, etc.).

### Default Dictionary (`khmer-segment/dictionary`)

A pre-built Khmer dictionary with **34,000+ words** sourced from [khmerlbdict](https://github.com/silnrsi/khmerlbdict) (MIT). Includes frequency data for future frequency-aware segmentation.

```ts
import { getDefaultDictionary, loadFrequencyDictionary } from "khmer-segment/dictionary";
import { segmentWords } from "khmer-segment";

const dict = getDefaultDictionary();

console.log(dict.size);            // 34398
console.log(dict.has("កម្ពុជា"));  // true

const result = segmentWords("សួស្តីអ្នកទាំងអស់គ្នា", { dictionary: dict });

const freqData = loadFrequencyDictionary();
console.log(freqData.words.length);           // 34398
console.log(freqData.frequencies.get("ជា"));  // 701541
```

This is a **separate import** — the core `khmer-segment` package stays small (~8KB). Only import the dictionary when you need it.

---

## How It Works

### Segmentation Pipeline

```
input text
  → normalize (reorder Unicode marks)
  → split into clusters (not naive chars)
  → run FMM algorithm (greedy longest match)
  → return structured tokens
```

### Cluster Splitting

Khmer characters combine into grapheme clusters. A naive `text.split("")` breaks them incorrectly.

```
"ស្តី" → naive split: ["ស", "្", "ត", "ី"] (4 pieces, broken)
"ស្តី" → splitClusters: ["ស្តី"] (1 cluster, correct)
```

A cluster starts with a **base** (consonant or independent vowel) and accumulates:
- `្` (coeng) + consonant → subscript pair
- dependent vowels
- diacritic signs

### FMM (Forward Maximum Matching)

Scans left-to-right, greedily matching the **longest** word at each position using trie-based prefix lookup. Falls back to single unknown tokens when no match is found. This is a baseline approach — bidirectional (BiMM) and frequency-aware methods generally produce better results.

---

## No Dictionary Provided

When no dictionary is passed to `segmentWords()`, it returns each cluster as an unknown token:

```ts
const result = segmentWords("កខគ");
// tokens: [
//   { value: "ក", isKnown: false },
//   { value: "ខ", isKnown: false },
//   { value: "គ", isKnown: false },
// ]
```

---

## Dictionary Strategy

The library ships a **separate optional dictionary** via `khmer-segment/dictionary` with 34,000+ Khmer words. This keeps the core package small (~8KB).

Options:
- Use the pre-built default: `getDefaultDictionary()` from `khmer-segment/dictionary`
- Provide your own word list via `createDictionary(words)`
- Load a JSON file at runtime
- Combine both: spread default words + your custom words
- Implement the `KhmerDictionary` interface for custom backends

```ts
// Option 1: Use the built-in dictionary
import { getDefaultDictionary } from "khmer-segment/dictionary";
const dict = getDefaultDictionary();

// Option 2: Custom word list only
import { createDictionary } from "khmer-segment";
const dict = createDictionary(["សួស្តី", "អ្នក"]);

// Option 3: Combine default + custom words
import { loadFrequencyDictionary } from "khmer-segment/dictionary";
import { createDictionary } from "khmer-segment";
const { words, frequencies } = loadFrequencyDictionary();
const dict = createDictionary([...words, "custom_word"], frequencies);
```

---

## Framework Compatibility

| Environment | Support |
|---|---|
| Node.js (ESM + CJS) | Yes |
| Browser (ESM) | Yes |
| Next.js | Yes |
| React | Yes |
| Angular | Yes |
| Vue | Yes |

No framework-specific code in the core. Tree-shakeable with `sideEffects: false`.

---

## Limitations

- FMM only (BMM and BiMM coming in v0.2)
- No frequency-aware segmentation yet
- Normalization covers basic reordering (base → coeng → vowel → sign), not all edge cases
- No caret/backspace helpers yet
- Dictionary-based approaches have an inherent accuracy ceiling compared to statistical/ML methods (e.g. CRF achieves ~99.7% accuracy vs ~95–97% for dictionary-based matching)
- `splitClusters` uses a simplified Khmer Character Cluster (KCC) model — it groups base + coeng + vowel + sign but does not enforce the full KCC specification

---

## Roadmap

### v0.1.0 (current)

- [x] `isKhmerChar`, `containsKhmer`, `isKhmerText`
- [x] `normalizeKhmer`, `normalizeKhmerCluster`
- [x] `splitClusters`, `countClusters`, `getClusterBoundaries`
- [x] `createDictionary` (trie-based in-memory)
- [x] `segmentWords` with FMM
- [x] 98 tests
- [x] Default dictionary (34K+ words, separate import)

### v0.2.0 (next)

- [ ] BMM (Backward Maximum Matching) algorithm
- [ ] BiMM (Bidirectional Maximum Matching) algorithm
- [ ] `compareTyping(expected, actual)` for MonkeyType-like apps
- [ ] Better token metadata (`isKhmer`, `clusterCount`)

### v0.3.0

- [ ] `deleteBackward(text, cursorIndex)` — cluster-safe backspace
- [ ] `getCaretBoundaries(text)` — caret-safe navigation
- [ ] Frequency-aware segmentation
- [ ] Compressed dictionary format

### Future

- [ ] `khmer-segment/react` — `useKhmerSegments`, `useKhmerTyping`
- [ ] `khmer-segment/angular` — injectable service, pipe
- [ ] Compressed dictionary format
- [ ] ICU-style line-breaking helpers

---

## Development

```bash
npm install       # install dependencies
npm run build     # build with tsup (ESM + CJS + types)
npm test          # run vitest
npm run test:watch  # watch mode
npm run lint      # TypeScript type check
```

---

## Testing

### Automated Tests

```bash
npm test              # run 98 tests with vitest
npm run test:watch    # watch mode — re-runs on changes
npm run lint          # TypeScript type check
```

### Manual Testing (Playground)

An interactive playground is available for live manual testing of all library functions.

```bash
npm run build
python3 -m http.server 3457
```

Open **http://localhost:3457/playground/index.html** in your browser.

Features:
- Live Khmer text input with instant results
- Editable dictionary (add/remove words on the fly)
- Strategy selector (FMM) and normalize toggle
- Detection, normalization, cluster splitting, and segmentation panels
- JSON output with copy button

---

## References & Further Reading

- **[Word Segmentation of Khmer Text Using Conditional Random Fields](https://medium.com/@phylypo/segmentation-of-khmer-text-using-conditional-random-fields-3a2d4d73956a)** — Phylypo Tum (2019). Comprehensive overview of Khmer segmentation approaches from dictionary-based to CRF, achieving 99.7% accuracy with Linear Chain CRF.
- **[Khmer Word Segmentation Using Conditional Random Fields](https://www.niptict.edu.kh/khmer-word-segmentation-tool/)** — Vichea Chea, Ye Kyaw Thu, et al. (2015). The prior state-of-the-art CRF model for Khmer segmentation (98.5% accuracy, 5-tag system).
- **[Benchmark dataset and Python notebooks](https://github.com/phylypo/segmentation-crf-khmer)** — 10K+ segmented Khmer news articles useful for evaluating segmentation quality.
- **[khmerlbdict](https://github.com/silnrsi/khmerlbdict)** — Source of the default dictionary used by this library (MIT license, 34K+ words).

---

## License

MIT
