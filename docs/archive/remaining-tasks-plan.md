# Remaining Tasks Plan (Post-Phase 1-5)

This plan covers all remaining work after the completed v0.3.0 improvement streams (benchmarking, docs refresh, plan updates, CI perf step).

## Scope and Release Strategy

- v0.3.0 goal: ship completed improvements safely without changing default segmentation strategy.
- v0.4.0 goal: improve Viterbi cost model until it consistently beats BiMM, then switch the default strategy.
- Deferred research work (compression, CRF, syllable DB) stays out of critical-path release work.

## Priority 1: v0.3.0 Release Readiness (Immediate)

### 1) Version and release metadata

- [x] Bump package version from `0.2.2` to `0.3.0` in `package.json`.
- [x] Add or update release notes/changelog section for v0.3.0 highlights:
    - Viterbi strategy available as opt-in (`strategy: 'viterbi'`)
    - Dictionary expansion to 101,107 words
    - Unicode normalization + KCC model improvements
    - Accuracy benchmark baseline and current strategy comparison

### 2) Final validation gate

- [x] Run build and quality checks:
    - `npm run build`
    - `npm test`
    - `npm run lint`
    - `npm run format:check`
- [x] Run perf suite before release (`npm run test:perf`) and record outcome.
- [x] Re-run accuracy benchmark once (`npm run test:accuracy`) to confirm no accidental regressions since the previous run.

### 3) Publish checklist

- [x] Verify `README.md` and `docs/benchmark-results.md` are aligned with current benchmark output.
- [x] Confirm benchmark dataset notes and reproducibility details remain accurate.
- [ ] Tag and publish v0.3.0 after all checks pass.

## Priority 2: v0.4.0 Core Objective (Highest Impact)

### 4) Tune Viterbi cost model to reduce over-segmentation

Primary target: `src/algorithms/viterbi.ts`

- [x] Add a configurable per-boundary penalty to the DP transition cost.
- [x] Keep existing unknown-word penalties and orphan-sign handling, but rebalance if needed after introducing boundary cost.
- [x] Add targeted unit tests for known over-segmentation patterns (for example, words currently split into short frequent fragments).

Suggested experiment matrix (start point):

- Boundary penalty candidates: `0.25`, `0.5`, `0.75`, `1.0`, `1.25`, `1.5`
- Evaluate each candidate on:
    - Boundary P/R/F1
    - Token P/R/F1
    - Exact-sentence-match rate
    - OOV boundary F1
    - Runtime and memory vs BiMM

Current sweep summary (2026-04-08):

- Best tested candidate by Boundary F1 in this sweep: `1.5` (Viterbi Boundary F1 `0.7464`)
- Current default penalty in code/docs: `0.75` (Viterbi Boundary F1 `0.7348`)
- BiMM Boundary F1 baseline remains `0.8041`
- Result: improvement over prior Viterbi baseline is real, but acceptance gate for default switch is still not met.

### 5) Acceptance gate for default strategy switch

Default switch from `fmm` to `viterbi` in `src/core/segment.ts` is allowed only after:

- [ ] Viterbi boundary F1 exceeds BiMM by at least `+1.5` absolute on the benchmark dataset.
- [x] OOV boundary F1 is not worse than BiMM by more than `0.5` absolute.
- [x] Performance guardrails pass:
    - p95 latency <= `1.8x` BiMM
    - peak RSS increase <= `25%`
    - deterministic output across runs
- [ ] Results are stable across at least 2 consecutive benchmark cycles.

If all conditions pass:

- [ ] Switch default strategy to `viterbi` in `src/core/segment.ts`.
- [ ] Update README docs and migration notes for default change.
- [ ] Publish as v0.4.0.

## Priority 3: CI and Regression Automation

### 6) Accuracy regression policy in CI (deferred but important)

- [x] Define explicit metric thresholds and allowed variance.
- [x] Add CI job that compares current benchmark metrics with a baseline artifact.
- [x] Make CI fail only on meaningful regressions (to avoid flaky failures).

Note: This is intentionally deferred because metric-baseline management and reproducibility details are non-trivial.

## Priority 4: Future Work (Non-blocking)

### 7) Dictionary and model evolution

- [ ] Compressed dictionary format to reduce package size (~3.9MB target toward ~1MB).
- [ ] Explore lightweight CRF approach (JS/WASM feasibility and deployment cost).
- [ ] Build Khmer syllable database fallback for unknown-word segmentation.

### 8) Deferred backlog items

- [ ] Invalid cluster detection behavior in `src/core/cluster.ts` (reject/repair/fallback policy).
- [ ] Optional ingestion of additional external dictionaries/corpora when licensing and quality justify it.

## Suggested Timeline

- Week 1: finish v0.3.0 release readiness + publish.
- Weeks 2-3: Viterbi boundary-penalty implementation, tuning runs, and test hardening.
- Week 4: validate acceptance gates and decide on v0.4.0 default strategy switch readiness.
- Later milestone: CI regression thresholds + Phase 6 research tracks.

## Definition of Done by Version

### v0.3.0 done when

- Version bumped and tagged.
- All quality/perf/accuracy checks pass.
- Release notes published with benchmark context and Viterbi opt-in status.

### v0.4.0 done when

- Tuned Viterbi meets accuracy and performance gates in consecutive runs.
- Default strategy switched to Viterbi.
- Docs and benchmarks updated to reflect new default behavior.
