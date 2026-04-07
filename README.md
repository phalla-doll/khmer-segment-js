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
    isKhmerText,
    normalizeKhmer,
    splitClusters,
    countClusters,
    createDictionary,
    segmentWords,
} from 'khmer-segment';

// Detect Khmer text
containsKhmer('Hello សួស្តី'); // true
isKhmerText('សួស្តីអ្នក'); // true

// Normalize Unicode ordering
const text = normalizeKhmer('សួស្តីអ្នក');

// Split into grapheme clusters (not naive chars)
const clusters = splitClusters('សួស្តី'); // ["សួ", "ស្តី"]
countClusters('សួស្តី'); // 2

// Segment words with a dictionary
const dict = createDictionary(['សួស្តី', 'អ្នក', 'ទាំងអស់គ្នា']);
const result = segmentWords('សួស្តីអ្នកទាំងអស់គ្នា', { dictionary: dict });

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

| Function              | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `isKhmerChar(char)`   | Returns `true` if the character is a Khmer code point     |
| `containsKhmer(text)` | Returns `true` if the text contains any Khmer characters  |
| `isKhmerText(text)`   | Returns `true` if all non-whitespace characters are Khmer |

### Normalization

| Function                         | Description                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `normalizeKhmer(text)`           | Reorders Khmer characters into canonical order (base → coeng → shift signs → vowel → sign) |
| `normalizeKhmerCluster(cluster)` | Normalizes a single cluster                                                                |

### Cluster Utilities

| Function                     | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `splitClusters(text)`        | Splits text into Khmer-safe grapheme clusters     |
| `countClusters(text)`        | Returns the number of clusters in the text        |
| `getClusterBoundaries(text)` | Returns `{ start, end }` offsets for each cluster |

### Segmentation

| Function                       | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| `segmentWords(text, options?)` | Segments text into word tokens using dictionary-based matching |

#### `SegmentOptions`

```ts
interface SegmentOptions {
    strategy?: 'fmm' | 'bmm' | 'bimm'; // default: "fmm"
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
    start: number; // zero-based offset into result.normalized
    end: number; // exclusive offset into result.normalized
    isKnown: boolean;
}
```

When normalization is enabled, token offsets always refer to `result.normalized`. Invisible characters such as ZWS/ZWJ/BOM may be stripped during normalization, so offsets may not line up with the original input string.

### Dictionary

| Function                                | Description                                      |
| --------------------------------------- | ------------------------------------------------ |
| `createDictionary(words, frequencies?)` | Creates an in-memory dictionary from a word list |

```ts
const dict = createDictionary(['សួស្តី', 'អ្នក', 'ខ្មែរ']);

dict.has('សួស្តី'); // true
dict.hasPrefix!('សួ'); // true (trie-based O(k) lookup)
dict.hasSuffix!('ី'); // true
dict.size; // 3 unique words
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

A pre-built Khmer dictionary with **49,113 words** sourced from [khmerlbdict](https://github.com/silnrsi/khmerlbdict) (MIT) and the Royal Academy of Cambodia's Khmer Dictionary. Includes frequency data for future frequency-aware segmentation.

```ts
import {
    getDefaultDictionary,
    loadFrequencyDictionary,
} from 'khmer-segment/dictionary';
import { segmentWords } from 'khmer-segment';

const dict = getDefaultDictionary();

console.log(dict.size); // 49113
console.log(dict.has('កម្ពុជា')); // true

const result = segmentWords('សួស្តីអ្នកទាំងអស់គ្នា', { dictionary: dict });

const freqData = loadFrequencyDictionary();
console.log(freqData.words.length); // 49113
console.log(freqData.frequencies.get('ជា')); // 701541
```

This is a **separate import** — the core `khmer-segment` package stays small (~11KB). The dictionary module is ~3.9MB. Only import the dictionary when you need it.

`loadFrequencyDictionary()` builds its return value from cached dictionary data, but each call returns fresh arrays and a fresh `Map`. You can safely extend or mutate the returned data without affecting later calls.

---

## How It Works

### Segmentation Pipeline

```
input text
  → normalize (reorder Unicode marks into canonical order)
  → split into clusters (not naive chars)
  → run segmentation algorithm (FMM, BMM, or BiMM)
  → group consecutive digits into single tokens
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

Scans left-to-right, greedily matching the **longest** word at each position using trie-based prefix lookup. Falls back to single unknown tokens when no match is found.

### BMM (Backward Maximum Matching)

Same idea as FMM, but scans right-to-left. Can produce different segmentation on ambiguous input where FMM greedily matches from the left.

### BiMM (Bidirectional Maximum Matching)

Runs both FMM and BMM, then picks the better result using heuristics: fewer unknown tokens wins; if tied, fewer total tokens (longer matches) wins; if still tied, FMM is preferred. This generally produces better results than either FMM or BMM alone.

### Digit Grouping

Consecutive Khmer digit clusters (and ASCII digits) are automatically merged into a single token after segmentation, so `១៨៤` or `184` becomes one token instead of three separate tokens.

---

## No Dictionary Provided

When no dictionary is passed to `segmentWords()`, it returns each cluster as an unknown token:

```ts
const result = segmentWords('កខគ');
// tokens: [
//   { value: "ក", isKnown: false },
//   { value: "ខ", isKnown: false },
//   { value: "គ", isKnown: false },
// ]
```

---

## Dictionary Strategy

The library ships a **separate optional dictionary** via `khmer-segment/dictionary` with 49,113 Khmer words. This keeps the core package small (~11KB).

Options:

- Use the pre-built default: `getDefaultDictionary()` from `khmer-segment/dictionary`
- Provide your own word list via `createDictionary(words)`
- Load a JSON file at runtime
- Combine both: spread default words + your custom words
- Implement the `KhmerDictionary` interface for custom backends

```ts
// Option 1: Use the built-in dictionary
import { getDefaultDictionary } from 'khmer-segment/dictionary';
const dict = getDefaultDictionary();

// Option 2: Custom word list only
import { createDictionary } from 'khmer-segment';
const dict = createDictionary(['សួស្តី', 'អ្នក']);

// Option 3: Combine default + custom words
import { loadFrequencyDictionary } from 'khmer-segment/dictionary';
import { createDictionary } from 'khmer-segment';
const { words, frequencies } = loadFrequencyDictionary();
const dict = createDictionary([...words, 'custom_word'], frequencies);
```

---

## Framework Compatibility

| Environment         | Support |
| ------------------- | ------- |
| Node.js (ESM + CJS) | Yes     |
| Browser (ESM)       | Yes     |
| Next.js             | Yes     |
| React               | Yes     |
| Angular             | Yes     |
| Vue                 | Yes     |

No framework-specific code in the core. Tree-shakeable with `sideEffects: false`.

---

## Limitations

- No frequency-aware segmentation yet
- Normalization covers canonical reordering (base → coeng → shift signs → vowel → sign), not all edge cases
- No caret/backspace helpers yet
- Dictionary-based approaches have an inherent accuracy ceiling compared to statistical/ML methods (e.g. CRF achieves ~99.7% accuracy vs ~95–97% for dictionary-based matching)
- `splitClusters` uses a simplified Khmer Character Cluster (KCC) model — it groups base + coeng + vowel + sign but does not enforce the full KCC specification

---

## Roadmap

### v0.1.0

- `isKhmerChar`, `containsKhmer`, `isKhmerText`
- `normalizeKhmer`, `normalizeKhmerCluster`
- `splitClusters`, `countClusters`, `getClusterBoundaries`
- `createDictionary` (trie-based in-memory)
- `segmentWords` with FMM
- Default dictionary (34K+ words, separate import)

### v0.2.1

- BMM (Backward Maximum Matching) algorithm
- BiMM (Bidirectional Maximum Matching) algorithm
- Digit grouping (consecutive Khmer digits merged into single tokens)
- Fixed normalization for MUUSIKATOAN (៉) and TRIISAP (៊) — shift signs now placed before vowels
- Fixed Unicode range constants (NIKAHIT, REAHMUK, YUUKEALAKHMOU are signs, not vowels)
- Rebuilt dictionary with 49,113 words (merged from 10 sources)

### v0.2.2 (current)

- Clarified that token offsets are measured against `result.normalized`
- Expanded Vitest coverage across normalization, dictionary, and segmentation behavior
- Made `loadFrequencyDictionary()` safe to reuse across calls without shared-state pollution
- Corrected custom dictionary `size` to report unique non-empty words
- Added changelog, CI checks, and stricter prepublish formatting verification

### v0.3.0

- `deleteBackward(text, cursorIndex)` — cluster-safe backspace
- `getCaretBoundaries(text)` — caret-safe navigation
- Frequency-aware segmentation
- Compressed dictionary format

### Future

- `khmer-segment/react` — `useKhmerSegments`, `useKhmerTyping`
- `khmer-segment/angular` — injectable service, pipe
- Compressed dictionary format
- ICU-style line-breaking helpers

---

## Development

```bash
npm install       # install dependencies
npm run build     # build with tsup (ESM + CJS + types)
npm test          # run vitest
npm run test:perf # optional performance-focused checks
npm run test:watch  # watch mode
npm run lint      # TypeScript type check
```

---

## Testing

### Automated Tests

```bash
npm test              # run the main Vitest correctness suite
npm run test:perf     # optional performance-focused checks
npm run test:watch    # watch mode — re-runs on changes
npm run lint          # TypeScript type check
```

### Manual Testing (Playground)

An interactive playground is available for live manual testing of all library functions.

```bash
cd playground
npm install
npm run dev
```

Open the URL shown (typically **[http://localhost:5173](http://localhost:5173)**) in your browser.

Features:

- Live Khmer text input with instant results
- Editable dictionary (add/remove words on the fly)
- Strategy selector (FMM / BMM / BiMM)
- Normalize toggle (On/Off)
- Detection, normalization, cluster splitting, and segmentation panels
- JSON output with copy button

---

## References & Further Reading

- **[Word Segmentation of Khmer Text Using Conditional Random Fields](https://medium.com/@phylypo/segmentation-of-khmer-text-using-conditional-random-fields-3a2d4d73956a)** — Phylypo Tum (2019). Comprehensive overview of Khmer segmentation approaches from dictionary-based to CRF, achieving 99.7% accuracy with Linear Chain CRF.
- **[Khmer Word Segmentation Using Conditional Random Fields](https://www.niptict.edu.kh/khmer-word-segmentation-tool/)** — Vichea Chea, Ye Kyaw Thu, et al. (2015). The prior state-of-the-art CRF model for Khmer segmentation (98.5% accuracy, 5-tag system).
- **[Benchmark dataset and Python notebooks](https://github.com/phylypo/segmentation-crf-khmer)** — 10K+ segmented Khmer news articles useful for evaluating segmentation quality.
- **[khmerlbdict](https://github.com/silnrsi/khmerlbdict)** — Source of the default dictionary used by this library (MIT license). Merged with Royal Academy of Cambodia's Khmer Dictionary for a total of 49,113 words.

---

## License

MIT
