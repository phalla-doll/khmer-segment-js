# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `viterbiBoundaryPenalty` option in `SegmentOptions` for tuning Viterbi transition cost.
- Accuracy regression tooling: `docs/benchmark-baseline.json`, `scripts/check-benchmark-regression.ts`, and `npm run test:accuracy:check`.
- Viterbi boundary-penalty sweep tooling: `scripts/benchmark-viterbi-penalty.ts` and generated sweep reports.

### Changed

- Viterbi now applies a default per-boundary penalty (`0.75`) to reduce over-segmentation.
- Accuracy benchmark script now also writes `docs/benchmark-results.json` for machine-readable regression checks.
- CI now runs accuracy benchmark regression checks in addition to build/test/lint/format/perf steps.

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
