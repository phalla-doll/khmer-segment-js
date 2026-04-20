# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Playground typing demo no longer treats trailing textarea whitespace as a mismatch, so completion is not blocked by accidental trailing space/newline.
- Playground typing demo now folds the common Khmer greeting variant `សួស្ដី` to `សួស្តី` for this fixed prompt demo, preventing false early mismatch highlighting.

### Changed

- Typing docs now clarify strict `compareTyping` completion semantics and recommend app-level preprocessing (trailing-whitespace trim and optional known-variant folding) where desired.

## [0.8.1] - 2026-04-20

### Fixed

- README roadmap version entries are ordered correctly in ascending order, with `v0.8.0 (current)` positioned after `v0.7.0`.

## [0.8.0] - 2026-04-20

### Added

- Typing game support APIs: `compareTyping`, `computeTypingMetrics`, `getCorrectPrefixLength`, and `getFirstMismatchIndex` with Khmer-aware cluster comparison (default), optional `unit: 'word'`, and optional punctuation stripping (`src/typing/index.ts`).
- Subpath export `khmer-segment/typing` (ESM/CJS/types) alongside root re-exports.
- Documentation guide [`docs/typing-game.md`](docs/typing-game.md) and README “Typing game support” section.
- Playground “Typing game demo” panel demonstrating live comparison and metrics.
- Unit tests in [`src/__tests__/typing/`](src/__tests__/typing/).

### Changed

- [`docs/design/DESIGN.md`](docs/design/DESIGN.md): document typing helpers; caret/backspace helpers removed from the non-goals list (they are shipped in core).

## [0.7.0] - 2026-04-13

### Added

- `khmer-segment/angular` subpath export with Angular adapters:
    - `KhmerSegmentService` (`@Injectable({ providedIn: 'root' })`) as a full-core facade.
    - `KhmerNormalizePipe` (`khmerNormalize`) as a standalone normalization pipe.
- Angular adapter unit tests for service parity with core helpers and pipe behavior.
- README Angular integration docs with DI + standalone-pipe usage snippets.

### Changed

- Package exports and build config now include `./angular` output (`dist/angular/index.{js,cjs,d.ts}`).
- Added optional Angular peer dependency metadata:
    - `peerDependencies.@angular/core: >=17`
    - `peerDependenciesMeta.@angular/core.optional: true`
- Enabled TypeScript decorator support in project compiler options for Angular adapter sources.

## [0.6.2] - 2026-04-13

### Added

- `getFrequencyDictionaryView()` in `khmer-segment/dictionary` for callers that need a stable readonly frequency dataset without per-call cloning.
- Runtime input guards for string-based public APIs (`segmentWords`, `normalizeKhmer`, `containsKhmer`, `isKhmerText`) with actionable `TypeError` messages.
- Runtime dictionary-shape validation in `segmentWords()` for custom dictionary integrations.
- Documentation index at `docs/README.md` to distinguish canonical references from historical planning docs.

### Changed

- CI pipeline now tests Node 18/20/22 for blocking checks, runs perf tests as a separate non-blocking job on push/PR, and runs accuracy benchmark regression only on scheduled/manual workflows.
- Accuracy-related npm scripts now use pinned local `tsx` (added as a dev dependency) instead of `npx tsx`.
- Benchmark download script now includes stronger failure diagnostics, existing-archive fallback handling, and unzip/tooling validation.
- Performance checks now favor relative latency comparisons (Viterbi vs BiMM) to reduce environment-specific flake.
- `countClusters()` now performs a direct counting pass without allocating an intermediate cluster array.
- BMM suffix probing avoids repeated full-string reversals by reusing reversed cluster fragments when available.
- Viterbi dictionary probing avoids repeated `slice().join('')` allocations in the main DP loop.
- React hooks now track full options object references (`segmentOptions`, `caretOptions`) in memo dependencies for safer behavior as options evolve.
- README testing/CI notes now document blocking vs non-blocking benchmark behavior and hook reference-stability guidance.

## [0.6.1] - 2026-04-09

### Changed

- Reordered README roadmap entries into ascending version order to improve release-history readability.

## [0.6.0] - 2026-04-09

### Added

- `khmer-segment/react` subpath export with two controlled-input hooks:
    - `useKhmerSegments` for memoized segmentation results.
    - `useKhmerTyping` for caret-safe snapping and backspace behavior.
- React hook test coverage for segmentation updates, caret boundaries, delete behavior, normalization mode, and mixed Khmer/Latin/digit inputs.
- README React integration docs with usage snippets and controlled input wiring guidance.

### Changed

- Package exports and build config now include `./react` output (`dist/react/index.{js,cjs,d.ts}`).
- Added optional React peer dependency metadata:
    - `peerDependencies.react: >=18`
    - `peerDependenciesMeta.react.optional: true`
- Updated locked Vite dependency to a non-vulnerable version via `npm audit fix` to clear high-severity advisories in the dev toolchain.

## [0.5.0] - 2026-04-09

### Added

- **Runtime validation** for `strategy` option: `segmentWords()` now throws `TypeError` with actionable messages for invalid or non-string strategy values instead of silently falling back to FMM.
- **ESLint** static analysis integrated into `npm run lint` (runs alongside `tsc --noEmit`). Configured with `@typescript-eslint` rules: `no-non-null-assertion` (warn), `no-explicit-any` (warn), `consistent-type-imports` (error).
- **`engines.node`** field in `package.json` declaring `>=18.0.0` compatibility.
- **Performance gate policy** documented in `docs/benchmark-methodology.md` — describes warmup + median measurement strategy and CI blocking behavior.
- **Regression tests** for Viterbi cluster edge cases: robat sequences, coeng/subscript stacking, mixed Khmer + digits + separators, unknown-word spans, independent vowel clusters.
- **Validation tests** for runtime option checking: valid strategies, invalid strings, non-string values, null, omitted strategy.

### Changed

- **Viterbi algorithm consolidated** — removed 6 duplicated inline character classification functions. `viterbi.ts` now uses `isClusterBase`, `isConsonant`, `isDigit` from `char-categories.ts` and shares cluster-walking logic with `cluster.ts`. Removed unused `DagEdge` interface, `buildCharOffsets` function, and `foundDict` variable.
- **Performance tests rewritten** with warmup (3 iterations) + median-of-7 measurement strategy. Replaced fixed wall-clock assertions with median-based checks to reduce CI flakiness.
- **CI performance gate** now blocks on failure (`continue-on-error` removed).
- **`npm run lint`** now runs both `tsc --noEmit` and `eslint src/`.
- **Non-null assertions reduced** in hot code paths (`cluster.ts`, `detect.ts`, `normalize.ts`, `viterbi.ts`, `char-categories.ts`, `group-digits.ts`) — replaced with safe `cpAt()` helper function.
- Switch statement in `segment.ts` now has explicit `case 'fmm'` instead of relying on `default`.

### Removed

- **`TypingDiffItem`** and **`TypingComparisonResult`** types removed from `src/types/public.ts` and public exports — were defined but never implemented or used.

## [0.4.0] - 2026-04-08

### Added

- `getCaretBoundaries(text, options?)` — returns valid caret positions based on Khmer cluster boundaries.
- `deleteBackward(text, cursorIndex, options?)` — cluster-safe backspace for text editors.
- `CaretOptions` and `DeleteResult` types exported from the public API.
- Caret boundary visualization in the interactive playground.
- Viterbi strategy button in the playground.

### Changed

- **Default strategy switched from `fmm` to `viterbi`**. Viterbi with penalty=10.0 achieves Boundary F1 = 0.8572 (+5.3% over BiMM), Token F1 = 0.6744 (+4.2% over BiMM).
- **Default Viterbi boundary penalty changed from 0.75 to 10.0** based on extended penalty sweep results.
- Playground now shows Viterbi as the default strategy.
- Updated playground dictionary description from 49K to 101K words.

## [0.3.3] - 2026-04-08

### Added

- `viterbiBoundaryPenalty` option in `SegmentOptions` for tuning Viterbi transition cost.
- Accuracy regression tooling: `docs/benchmark-baseline.json`, `scripts/check-benchmark-regression.ts`, and `npm run test:accuracy:check`.
- Viterbi boundary-penalty sweep tooling: `scripts/benchmark-viterbi-penalty.ts` and generated sweep reports.
- Extended Viterbi boundary penalty sweep to range [0.25–10.0] (previously [0.25–1.5]).
- Sweep reports now include Viterbi Token F1 column.

### Changed

- Viterbi now applies a default per-boundary penalty (`0.75`) to reduce over-segmentation.
- Accuracy benchmark script now also writes `docs/benchmark-results.json` for machine-readable regression checks.
- CI now runs accuracy benchmark regression checks in addition to build/test/lint/format/perf steps.
- Viterbi with penalty=10.0 achieves Boundary F1=0.8572 (+5.3% over BiMM) and Token F1=0.6744 (+4.2% over BiMM) while maintaining OOV Boundary F1 advantage (0.8875 vs BiMM's 0.4186).
- Go/no-go decision: Viterbi qualifies as default strategy at penalty ≥ 6.0. Default switch planned for v0.4.0.

## [0.3.2] - 2026-04-08

### Changed

- Khmer sentence punctuation (`។`, `៕`, `៖`; U+17D4–U+17D6) is emitted with `isKnown: true` for all segmentation strategies and when no dictionary is provided. Viterbi marks only these Khmer separators as known; other separators remain unchanged.

## [0.3.1] - 2026-04-08

### Changed

- Decimal digit spans (Khmer `០–៩`, U+17E0–U+17E9, and ASCII `0–9`) are emitted with `isKnown: true` after digit grouping and in the Viterbi strategy. Code or metrics that treat `!isKnown` as dictionary-only out-of-vocabulary will no longer count those numeric tokens as unknown.

## [0.3.0]

### Added

- Viterbi (DP-based) segmentation strategy available as opt-in via `strategy: 'viterbi'`.
- Dictionary expanded to 101,107 words.
- Accuracy benchmark suite with boundary/token/exact-match metrics across all strategies.
- Performance benchmark suite for latency and memory profiling.
- `docs/benchmark-results.md` with reproducible baseline results for FMM, BMM, BiMM, and Viterbi strategies.

### Changed

- Improved Unicode normalization pipeline for Khmer text.
- Enhanced Khmer character classification (KCC) model for better cluster detection.
- BiMM remains the best-performing strategy by Boundary F1 (0.8041) and Token F1 (0.6327).
- Viterbi strategy is experimental — known over-segmentation due to missing boundary penalty in cost model (targeted for v0.4.0).

## [0.2.2]

### Changed

- Clarified that `SegmentToken.start` and `end` are offsets into `result.normalized`.
- Made `loadFrequencyDictionary()` return fresh arrays and a fresh `Map` from cached source data, so callers can safely mutate their local copy without affecting later calls.
- Corrected custom dictionary `size` to report unique non-empty words when duplicate inputs are provided.
- Separated optional performance checks from the main Vitest correctness suite.
- Added a minimal CI workflow for build, test, lint, and formatting checks.

## [0.2.1]

Current published baseline before the next release hardening work.
