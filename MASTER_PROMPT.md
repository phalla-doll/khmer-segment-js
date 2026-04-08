You are a senior TypeScript library author.

I am building an npm package called **khmer-segment**, a framework-agnostic Khmer text processing library.

The README already defines:

- architecture
- folder structure
- module responsibilities
- public API
- roadmap

Your job is to help me START implementation in a practical, production-ready way.

## Goals

- Follow the existing architecture strictly
- Keep everything framework-agnostic (no React/Angular inside core)
- Write clean, typed, testable TypeScript
- Focus on correctness over optimization

## Step-by-step execution plan

1. Bootstrap the project
  - Generate initial files:
  - src/index.ts
  - tsconfig.json
  - tsup.config.ts
  - vitest.config.ts
    - Ensure it builds and exports correctly
2. Implement core v0.1 features ONLY:
  - containsKhmer(text)
    - isKhmerChar(char)
    - normalizeKhmer(text) (basic version, not perfect)
    - splitClusters(text) (important: do NOT use naive char split)
    - countClusters(text)
3. Create minimal internal constants:
  - Khmer Unicode range
    - basic character categories (consonant, vowel, diacritic)
4. Write unit tests for ALL functions
  - include edge cases:
  - mixed Khmer + Latin
  - empty string
  - combining characters
  - visually identical but different unicode order
5. Keep segmentation (FMM/BMM/BiMM) as TODO for now
  - only stub the API:
    segmentWords(text, options)
6. DO NOT over-engineer
  - no dictionary yet
    - no performance optimization yet
    - no advanced normalization yet

## Important constraints

- No external dependencies unless absolutely necessary
- Everything must be tree-shakeable
- Use pure functions (no classes unless justified)
- Code should work in both Node and browser

## Output format

- Show file-by-file implementation
- Keep each file complete and copy-paste ready
- Add short explanation ONLY when necessary
- Prioritize code over explanation

Start with:

1. Project bootstrap files
2. constants/unicode.ts
3. core/detect.ts
4. core/cluster.ts (basic but correct)
5. tests

Do NOT jump ahead.

Let’s build this step by step like a real library.