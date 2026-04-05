Great name.

Here’s a clean architecture for **`khmer-segment`** as a publishable TypeScript npm package.

## Goal

A framework-agnostic core package for Khmer text processing that works in:

* Next.js
* Angular
* React
* Vue
* Node.js
* browser apps

Focus the first version on:

* Khmer detection
* normalization
* cluster splitting
* optional word segmentation
* typing-safe comparison utilities

---

## Package direction

Start with **one package first**:

`khmer-segment`

Later, if it grows, split into:

* `khmer-segment`
* `khmer-segment/react`
* `khmer-segment/angular`

For now, keep everything in one repo and one package.

---

## Suggested feature modules

### 1. Unicode + detection

Basic helpers to identify Khmer text and code points.

Examples:

* `isKhmerChar(char)`
* `isKhmerText(text)`
* `containsKhmer(text)`

### 2. Normalization

Normalize Khmer Unicode ordering before any matching/segmentation.

Examples:

* `normalizeKhmer(text)`
* `normalizeKhmerCluster(cluster)`

### 3. Cluster utilities

Split text into Khmer-safe units instead of naive JS characters.

Examples:

* `splitClusters(text)`
* `getClusterAt(text, index)`
* `countClusters(text)`

### 4. Segmentation

Dictionary-based segmentation with pluggable corpus.

Examples:

* `segmentWords(text, options?)`
* `tokenize(text, options?)`

### 5. Typing helpers

Useful for MonkeyType-like apps.

Examples:

* `compareTyping(expected, actual)`
* `deleteBackward(text, cursorIndex)`
* `getCaretBoundaries(text)`

### 6. Dictionary tools

Allow users to inject custom wordlists instead of bundling huge defaults.

Examples:

* `createDictionary(words)`
* `loadDictionary(data)`
* `hasWord(word)`

---

## Recommended folder structure

```txt
khmer-segment/
├─ src/
│  ├─ index.ts
│  ├─ constants/
│  │  ├─ unicode.ts
│  │  ├─ char-categories.ts
│  │  └─ defaults.ts
│  ├─ core/
│  │  ├─ detect.ts
│  │  ├─ normalize.ts
│  │  ├─ cluster.ts
│  │  ├─ segment.ts
│  │  ├─ tokenize.ts
│  │  ├─ compare.ts
│  │  ├─ caret.ts
│  │  └─ delete.ts
│  ├─ dictionary/
│  │  ├─ types.ts
│  │  ├─ create-dictionary.ts
│  │  ├─ memory-dictionary.ts
│  │  └─ lookup.ts
│  ├─ algorithms/
│  │  ├─ fmm.ts
│  │  ├─ bmm.ts
│  │  └─ bimm.ts
│  ├─ utils/
│  │  ├─ string.ts
│  │  ├─ assert.ts
│  │  └─ ranges.ts
│  ├─ types/
│  │  ├─ cluster.ts
│  │  ├─ segment.ts
│  │  ├─ typing.ts
│  │  └─ public.ts
│  └─ __tests__/
│     ├─ detect.test.ts
│     ├─ normalize.test.ts
│     ├─ cluster.test.ts
│     ├─ segment.test.ts
│     └─ compare.test.ts
├─ data/
│  ├─ sample-dictionary.json
│  └─ sample-texts.json
├─ scripts/
│  ├─ build-dictionary.ts
│  └─ validate-data.ts
├─ examples/
│  ├─ nextjs-demo/
│  ├─ angular-demo/
│  └─ node-demo/
├─ package.json
├─ tsconfig.json
├─ tsup.config.ts
├─ vitest.config.ts
├─ README.md
├─ LICENSE
├─ .npmignore
└─ .gitignore
```

---

## Module responsibilities

### `core/detect.ts`

Responsible for Khmer presence and script checks.

```ts
export function isKhmerChar(char: string): boolean
export function containsKhmer(text: string): boolean
export function isKhmerText(text: string): boolean
```

### `core/normalize.ts`

Responsible for Khmer character-order normalization.

```ts
export function normalizeKhmer(text: string): string
export function normalizeKhmerCluster(cluster: string): string
```

### `core/cluster.ts`

Responsible for Khmer cluster parsing.

```ts
export function splitClusters(text: string): string[]
export function countClusters(text: string): number
export function getClusterBoundaries(text: string): Array<{ start: number; end: number }>
```

### `core/segment.ts`

Public segmentation API.

```ts
export function segmentWords(
  text: string,
  options?: SegmentOptions
): SegmentResult
```

### `algorithms/fmm.ts`, `bmm.ts`, `bimm.ts`

Keep algorithm implementations isolated so you can switch later.

### `dictionary/`

Abstraction layer for dictionary storage and lookup.

This is important because later you may support:

* in-memory dictionary
* compressed dictionary
* remote-loaded dictionary

---

## Public API design

Keep the API small and stable.

```ts
export {
  containsKhmer,
  isKhmerChar,
  isKhmerText,
} from "./core/detect";

export {
  normalizeKhmer,
  normalizeKhmerCluster,
} from "./core/normalize";

export {
  splitClusters,
  countClusters,
  getClusterBoundaries,
} from "./core/cluster";

export {
  segmentWords,
} from "./core/segment";

export {
  compareTyping,
} from "./core/compare";

export {
  deleteBackward,
} from "./core/delete";

export {
  createDictionary,
} from "./dictionary/create-dictionary";

export type {
  SegmentOptions,
  SegmentResult,
  SegmentToken,
  TypingComparisonResult,
  KhmerDictionary,
} from "./types/public";
```

---

## Suggested TypeScript types

### `types/public.ts`

```ts
export interface SegmentToken {
  value: string;
  start: number;
  end: number;
  isKnown: boolean;
}

export interface SegmentOptions {
  strategy?: "fmm" | "bmm" | "bimm";
  dictionary?: KhmerDictionary;
  normalize?: boolean;
}

export interface SegmentResult {
  original: string;
  normalized: string;
  tokens: SegmentToken[];
}

export interface TypingDiffItem {
  expected?: string;
  actual?: string;
  correct: boolean;
}

export interface TypingComparisonResult {
  expectedClusters: string[];
  actualClusters: string[];
  diff: TypingDiffItem[];
  accuracy: number;
}

export interface KhmerDictionary {
  has(word: string): boolean;
  hasPrefix?(value: string): boolean;
  hasSuffix?(value: string): boolean;
}
```

---

## Suggested internal layering

Use this rule:

* `core/` can call `algorithms/`, `dictionary/`, `utils/`
* `algorithms/` can call `dictionary/`, `utils/`, `constants/`
* `dictionary/` should not depend on `core/`
* `types/` depends on nothing

This keeps the package clean.

---

## Build setup

Use **tsup**. It is simple and good for libraries.

### `package.json`

```json
{
  "name": "khmer-segment",
  "version": "0.1.0",
  "description": "Khmer text segmentation, normalization, and cluster utilities for JavaScript and TypeScript.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": [
    "dist"
  ],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test && npm run lint"
  },
  "keywords": [
    "khmer",
    "unicode",
    "segmentation",
    "nlp",
    "typescript",
    "javascript"
  ],
  "author": "Phalla Doll",
  "license": "MIT",
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

---

## `tsup.config.ts`

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020"
});
```

---

## Example implementation flow

### segmentation pipeline

1. receive text
2. detect Khmer
3. normalize text
4. split into clusters
5. run selected algorithm
6. return structured tokens

That means your `segmentWords()` becomes your stable entry point, while internals can change later.

---

## Suggested MVP scope

### v0.1.0

* `containsKhmer`
* `normalizeKhmer`
* `splitClusters`
* `countClusters`
* `createDictionary`
* `segmentWords` with `fmm`
* basic tests

### v0.2.0

* `bmm` and `bimm`
* typing comparison helpers
* better token metadata
* small demo app

### v0.3.0

* backspace/caret-safe helpers
* frequency-aware segmentation
* optional bundled mini dictionary

---

## Dictionary strategy

Do not ship a huge dictionary inside the library by default.

Better options:

* ship with **no default dictionary**
* optionally offer:

  * `khmer-segment/dictionaries/basic`
  * separate JSON download
  * user-provided dictionary

This keeps bundle size small for Next.js and Angular apps.

Example:

```ts
import { createDictionary, segmentWords } from "khmer-segment";
import words from "./khmer-words.json";

const dict = createDictionary(words);

const result = segmentWords("សួស្តីអ្នកទាំងអស់គ្នា", {
  dictionary: dict,
  strategy: "bimm",
});
```

---

## README structure

Your README should include:

* what the package does
* install
* quick start
* core APIs
* dictionary setup
* framework compatibility
* limitations
* roadmap

---

## Example README quick start

```ts
import { createDictionary, normalizeKhmer, splitClusters, segmentWords } from "khmer-segment";

const dictionary = createDictionary([
  "សួស្តី",
  "អ្នក",
  "ទាំងអស់គ្នា"
]);

const text = normalizeKhmer("សួស្តីអ្នកទាំងអស់គ្នា");
const clusters = splitClusters(text);
const result = segmentWords(text, { dictionary });

console.log(clusters);
console.log(result.tokens);
```

---

## Testing priorities

Most important tests:

* Unicode normalization correctness
* cluster splitting correctness
* segmentation with known dictionary
* segmentation with unknown words
* mixed Khmer + Latin text
* punctuation and spaces
* edge cases with visually same but differently ordered Khmer characters

That part matters a lot for trust.

---

## Good future extensions

Later you can add:

* `khmer-segment/react`

  * `useKhmerSegments`
  * `useKhmerTyping`
* `khmer-segment/angular`

  * injectable service
  * pipe for segmentation
* ICU-style line-breaking helpers
* editor plugins
* input method helpers

---

## My recommendation

For the first publishable version, keep it focused:

* **core TypeScript package**
* **small public API**
* **no framework lock-in**
* **dictionary injection**
* **strong tests**

That gives you something real, useful, and easy to maintain.

Next best step is to draft:
**actual starter files** for `package.json`, `src/index.ts`, types, and first function stubs.
