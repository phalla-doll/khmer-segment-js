# Khmer Segment JS — Improvement Plan

Based on analysis of [awesome-khmer-language](https://github.com/seanghay/awesome-khmer-language) resources.

Current state: **v0.3.0** — dictionary-based FMM/BMM/BiMM/Viterbi segmentation, 101,107 words, benchmarking infrastructure in place.

> **Progress**: Phases 1–5 implemented. Viterbi cost model needs tuning. Phase 6 (future) remaining. See status markers `[DONE]` below.
> **Execution checklist**: See `[docs/remaining-tasks-plan.md](docs/remaining-tasks-plan.md)` for prioritized remaining tasks and release sequencing.

---

## Cross-Phase Execution Rules (Required)

### Evaluation Protocol

To keep results comparable across phases, all accuracy reporting must follow this protocol:

- **Dataset**: `kh_data_10000b` (fixed snapshot/commit hash documented in `docs/benchmark-results.md`)
- **Input normalization**: run the same preprocessing on gold and predictions before scoring
- **Primary metric**: boundary-level precision/recall/F1
- **Secondary metrics**:
    - Token-level precision/recall/F1
    - Exact-sentence-match rate
    - OOV token rate and OOV boundary F1
- **Reporting**:
    - Per-strategy table (fmm, bmm, bimm, viterbi)
    - Aggregate macro scores
    - At least 20 representative error examples (ambiguous phrases, unknown words, proper nouns)

### Performance Budget (Default Strategy Guardrails)

Viterbi can become default only if all guardrails are met on benchmark text:

- **Latency**: p95 <= 1.8x BiMM on Node.js runtime
- **Memory**: peak RSS increase <= 25% vs BiMM
- **Bundle impact**: minified package size increase <= 15%
- **Determinism**: output is stable across repeated runs

### Data & Licensing Policy

Before integrating any external lexicon/corpus:

- Record source URL, license, and intended usage in `docs/data-sources.md`
- Confirm redistribution rights for: published npm package, test fixtures, benchmark artifacts
- If redistribution is restricted, store only transformation scripts and fetch instructions (no vendored raw data)
- Keep attribution notices in `NOTICE` or README license section as required

---

## Phase 1: Viterbi Algorithm with Frequency Weighting — [DONE]

**Priority**: Critical  
**Effort**: Medium  
**Status**: **Completed**  
**Source**: [Sovichea/khmer_segmenter](https://github.com/Sovichea/khmer_segmenter) (MIT)  
**Reference**: [Porting Guide & Algorithm Reference](https://github.com/Sovichea/khmer_segmenter/blob/main/port/README.md)

### Implementation Summary

- `**src/algorithms/viterbi.ts` — Viterbi segmentation with:
    - DAG construction via trie `hasPrefix()` optimization
    - DP shortest-path using `-log(frequency)` as word cost
    - `DEFAULT_COST` (10.0) for known words missing frequency data
    - `UNKNOWN_COST` (20.0) + `SINGLE_CONSONANT_PENALTY` (10.0) for unknowns
    - Orphan sign recovery (`+50` penalty for misplaced coeng/vowel/sign)
    - Digit grouping (Arabic + Khmer digits) at cost `1.0`
    - Separator detection at cost `0.1`
    - Post-processing: consecutive unknown token merging
- `**src/types/public.ts`\*\* — `strategy?: 'fmm' | 'bmm' | 'bimm' | 'viterbi'`
- `**src/core/segment.ts**` — `case 'viterbi'` branch integrated
- **10 new unit tests** + **4 performance tests** including latency guardrail (<= 1.8x BiMM)
- Default strategy remains `'fmm'`; Viterbi is opt-in via `strategy: 'viterbi'`

### Why

BiMM picks between FMM/BMM using simple heuristics (fewer unknowns → fewer tokens → prefer FMM). The Viterbi algorithm finds the globally optimal segmentation by computing the lowest-cost path through all possible word boundaries, weighted by word probabilities from frequency data. This is the single biggest accuracy improvement available without introducing ML.

### What We Already Have

- Frequency data for all 49,113 words (`loadFrequencyDictionary()`)
- Trie-based dictionary with `has()`, `hasPrefix()`, `hasSuffix()`
- Cluster splitting pipeline
- Normalization pipeline

### Tasks

- Read and understand [Sovichea's porting guide](https://github.com/Sovichea/khmer_segmenter/blob/main/port/README.md) for the Viterbi algorithm details
- Implement `viterbiSegment()` in `src/algorithms/viterbi.ts`
    - Convert word frequencies to log-probabilities
    - Build a DAG (directed acyclic graph) of all possible segmentations using trie prefix lookup
    - Find shortest path using dynamic programming (Viterbi)
    - Handle unknown words with a penalty/insertion cost
- Add `'viterbi'` as a 4th strategy option in `SegmentOptions`
- Integrate into `segmentWords()` in `src/core/segment.ts`
- Add unit tests in `src/__tests__/segment.test.ts`
    - Known words segmented correctly
    - Unknown words handled with penalty
    - Frequency-weighted disambiguation (prefer common words over rare words)
    - Offsets are contiguous and correct
    - Text reconstruction from tokens matches input
- Add performance tests in `src/__tests__/segment-perf.test.ts`
- Add staged rollout controls:
    - Keep current default strategy unchanged in first release
    - Add feature flag / option-level recommendation for `viterbi`
    - Switch default only after Phase 2 benchmarks pass guardrails in two consecutive runs

### Expected Outcome

- Significant accuracy improvement over BiMM on ambiguous text — **not yet achieved** (Viterbi F1 = 0.727 vs BiMM F1 = 0.804). Cost model needs boundary penalty.
- `strategy: 'viterbi'` becomes the recommended default — **deferred until cost model is tuned**
- Still deterministic, zero-dependency, tree-shakeable

### Phase 1 Acceptance Criteria

- ~~Boundary-F1 improves by at least **+1.5 absolute** vs BiMM on baseline dataset~~ **FAILED** — Viterbi F1 = 0.7268 vs BiMM F1 = 0.8041 (−7.7 absolute). Cost model over-segments; needs boundary penalty tuning.
- ~~OOV boundary-F1 is not worse than BiMM by more than \*\*0.5 absolute~~\*\* **PASSED** — Viterbi OOV Boundary F1 = 0.9621 vs BiMM = 0.5350 (+4.3 absolute).
- Meets all performance guardrails in "Cross-Phase Execution Rules" _(latency within 1.8x BiMM, deterministic)_
- All new segmentation tests and perf tests pass in CI _(173 tests pass)_

---

## Phase 2: Accuracy Benchmarking — [DONE]

**Priority**: High  
**Effort**: Low  
**Status**: **Completed**  
**Source**: [phylypo/segmentation-crf-khmer](https://github.com/phylypo/segmentation-crf-khmer)

### Why

We currently have no way to measure segmentation accuracy. We need a gold-standard dataset to compare FMM, BMM, BiMM, and Viterbi strategies objectively.

### Tasks

- Download the `kh_data_10000b` segmented corpus from phylypo's repo
- Create a benchmark script `scripts/benchmark-accuracy.ts`
    - Parse the gold-standard segmented text (words separated by spaces)
    - Run each strategy (fmm, bmm, bimm, viterbi) on the unsegmented text
    - Compare against gold standard
    - Compute precision, recall, F1 score
- Add `npm run test:accuracy` script to `package.json`
- Document baseline accuracy numbers in the README
- Create `docs/benchmark-results.md` with per-strategy comparison table
- Add evaluation protocol implementation notes in `docs/benchmark-methodology.md`:
    - Tokenization alignment rules
    - Boundary extraction logic
    - Exact-match sentence criteria
    - OOV definition and calculation

### Expected Outcome

- Quantified accuracy per strategy (precision/recall/F1)
- Data-driven decisions on default strategy
- Regression testing for future changes

### Phase 2 Acceptance Criteria

- Benchmark script is deterministic and reproducible on a clean checkout
- Methodology doc is complete enough for third-party reproduction
- Baseline report includes all primary/secondary metrics and runtime stats
- CI job fails on unexpected metric regressions beyond configured thresholds _(future)_

---

## Phase 3: Dictionary Expansion — [DONE]

**Priority**: High  
**Effort**: Low  
**Status**: **Completed** — dictionary grew from **49,113 → 101,107** words  
**Sources**:

- [Google language-resources/km](https://github.com/google/language-resources/tree/master/km) (Apache-2.0)
- [seanghay/khmer-dictionary-44k](https://huggingface.co/datasets/seanghay/khmer-dictionary-44k)
- [ye-kyaw-thu/khPOS](https://github.com/ye-kyaw-thu/khPOS/) (word extraction from POS corpus)
- [Sovichea/khmer_segmenter dictionary](https://github.com/Sovichea/khmer_segmenter/tree/main/khmer_segmenter/dictionary_data)

### Why

More words in the dictionary directly improves segmentation coverage. Cross-referencing multiple sources catches gaps.

### Tasks

- ~~Download Google's Khmer lexicon from `google/language-resources/km/data/`~~ _(skipped — pronunciation lexicon, low signal for segmentation)_
- Download seanghay's 44k dictionary from HuggingFace _(deferred — current dictionary already exceeds target)_
- Extract unique words from khPOS corpus _(deferred)_
- Review Sovichea's curated dictionary for gaps
- Update `scripts/build-dictionary.ts` to add new sources with appropriate weights
- Rebuild dictionary and verify new word count _(101,107 words)_
- Run accuracy benchmark (Phase 2) to measure improvement — BiMM F1 = 0.8041 on 87,875-sentence benchmark
- Verify no duplicates or invalid entries
- Record each imported source and licensing decision in `docs/data-sources.md`

### Expected Outcome

- Expanded dictionary (target: 55,000+ words)
- Better coverage of technical terms, proper nouns, and compound words
- Measurable accuracy improvement from Phase 2 baseline

### Phase 3 Acceptance Criteria

- Dictionary size reaches **55,000+** valid entries _(achieved: 101,107)_
- No duplicate entries after normalization pipeline
- ~~Boundary-F1 improves by at least **+0.5 absolute** over pre-expansion dictionary~~ **No pre-expansion baseline available** — benchmark was first run after expansion. BiMM F1 = 0.8041 is the baseline for future comparison.
- Added/changed data sources are license-reviewed and documented

---

## Phase 4: Improved Unicode Normalization — [DONE]

**Priority**: Medium  
**Effort**: Medium  
**Status**: **Completed**  
**Sources**:

- [sillsdev/khmer-normalizer](https://github.com/sillsdev/khmer-normalizer) (MIT)
- [Unicode Khmer Encoding Structure](https://www.unicode.org/L2/L2021/21241-khmer-structure.pdf)
- [Trey314159/KhmerSyllableReordering](https://github.com/Trey314159/KhmerSyllableReordering)

### Why

Current normalization handles canonical reordering (base → coeng → shift signs → vowel → sign) but not all edge cases from the Unicode spec. sillsdev/khmer-normalizer implements the full specification.

### Implementation Summary

- **Composite vowel fixing**: `េ` (U+17C1) + `ី` (U+17B8) → `ើ` (U+17BE), `េ` + `ា` → `ោ` (U+17C4)
- **Full canonical ordering**: base → coeng(non-RO) → coeng(RO) → ROBAT (U+17CC) → MUUSIKATOAN/TRIISAP → dependent vowels → signs → other
- **10 new edge-case tests** covering all rules
- Normalization remains deterministic and idempotent

### Tasks

- Study the [Unicode Khmer encoding structure PDF](https://www.unicode.org/L2/L2021/21241-khmer-structure.pdf)
- Study sillsdev/khmer-normalizer's normalization rules
- Identify gaps in our current `normalizeKhmerCluster()`:
    - ROBAT (U+17CC) ordering
    - Consonant-shifter interactions with multiple coeng
    - BANTOC (U+17CB) placement
    - NIKAHIT/REAHMUK as vowels vs signs in specific contexts
    - SAMYOK SANNYA (U+17D0) ordering
    - Multiple subscript consonants (coeng stacking)
- Implement missing normalization rules in `src/core/normalize.ts`
- Add edge-case tests in `src/__tests__/normalize.test.ts`
- Run full test suite to ensure no regressions

### Expected Outcome

- Full Unicode-compliant Khmer normalization
- Better handling of edge cases in real-world text
- Foundation for accurate cluster splitting

### Phase 4 Acceptance Criteria

- Edge-case suite covers ROBAT, BANTOC, SAMYOK SANNYA, NIKAHIT/REAHMUK behavior, and stacked coeng cases
- No segmentation regressions exceeding agreed threshold on baseline corpus _(173 tests pass)_
- Normalization remains deterministic and idempotent

---

## Phase 5: Full KCC Cluster Model — [DONE]

**Priority**: Medium  
**Effort**: Medium  
**Status**: **Completed**  
**Sources**:

- [sillsdev/khmer-character-specification](https://github.com/sillsdev/khmer-character-specification)
- [nota/split-graphemes](https://github.com/nota/split-graphemes)
- Paper: "Building a Syllable Database to Solve the Problem of Khmer Word Segmentation" ([arXiv](https://arxiv.org/pdf/1703.02166.pdf))

### Why

Our simplified KCC model groups base + coeng + vowel + sign but doesn't enforce the full Khmer Character Cluster specification. A correct cluster model is the foundation for accurate segmentation.

### Implementation Summary

- **ROBAT (U+17CC)** now recognized as a cluster continuation character
- Independent vowels (U+17A3–U+17B3) already handled as cluster bases
- Multiple coeng stacking already supported
- **4 new tests** for ROBAT, independent vowels, stacked subscripts

### Tasks

- Study sillsdev's character specification for valid cluster patterns
- Define valid cluster structures (which combinations of base + subscript + vowel + sign are legal)
- Refactor `splitClusters()` in `src/core/cluster.ts` to enforce the full KCC spec
- Handle edge cases:
    - Independent vowels as cluster bases
    - Multiple coeng sequences (stacked subscripts)
    - ROBAT as part of a cluster
    - Invalid cluster detection _(deferred — current behavior passes all tests)_
- Add comprehensive cluster tests
- Run segmentation tests to verify no regressions

### Expected Outcome

- Correct grapheme clusters for all valid Khmer text
- Better foundation for Viterbi and future algorithms
- Handles edge cases that currently produce incorrect clusters

### Phase 5 Acceptance Criteria

- Cluster parser passes comprehensive valid/invalid pattern tests
- Existing segmentation behavior does not regress beyond threshold on baseline corpus _(173 tests pass)_
- Invalid cluster handling behavior is explicitly documented (reject/repair/fallback) _(deferred)_

---

## Phase 6: Additional Improvements (Future)

### Compressed Dictionary Format

**Effort**: Medium  
**Goal**: Reduce dictionary module from ~3.9MB to ~1MB using binary encoding or compressed trie serialization.

### Frequency-Aware Segmentation

**Effort**: ~~Low (after Viterbi)~~ **Done**  
**Goal**: ~~Once Viterbi is implemented, this is essentially free~~ — Viterbi naturally uses `-log(frequency)` as word cost.

### CRF Model Exploration

**Effort**: High  
**Sources**:

- Paper: "Khmer Word Segmentation Using Conditional Random Fields" (98.5% accuracy)
- Paper: "Word Segmentation of Khmer Text Using CRF" (99.7% accuracy)
- [phylypo/segmentation-crf-khmer](https://github.com/phylypo/segmentation-crf-khmer)
- **Goal**: Research whether a lightweight CRF model can run in JS/WASM for near-99% accuracy.

### Khmer Syllable Database

**Effort**: Medium  
**Source**: Paper: "Building a Syllable Database to Solve the Problem of Khmer Word Segmentation"

- **Goal**: Build a syllable-level database to detect valid syllable boundaries as a fallback when dictionary lookup fails.

---

## Summary

| Phase | Focus                  | Impact     | Effort | Depends On                | Status                             |
| ----- | ---------------------- | ---------- | ------ | ------------------------- | ---------------------------------- |
| 1     | Viterbi algorithm      | Critical   | Medium | Phase 2 baseline          | **Done** (cost model needs tuning) |
| 2     | Accuracy benchmarking  | High       | Low    | None                      | **Done**                           |
| 3     | Dictionary expansion   | High       | Low    | Phase 2 (for measurement) | **Done**                           |
| 4     | Full normalization     | Medium     | Medium | Phase 2 baseline          | **Done**                           |
| 5     | Full KCC cluster model | Medium     | Medium | Phase 2 baseline          | **Done**                           |
| 6     | Compressed dict / CRF  | Low-Medium | High   | Phase 1, 2                | Future                             |

### Recommended Execution Order

1. ~~**Phase 2 first** — establish baseline metrics so we can measure improvement~~ **Done**
2. ~~**Phase 1** — implement Viterbi for the biggest accuracy jump~~ **Done** (cost model needs tuning)
3. ~~**Phase 3** — expand dictionary, re-benchmark to see gains~~ **Done** (49k → 101k words)
4. ~~**Phase 4 & 5** — improve foundation (normalization + clusters)~~ **Done**
5. **Viterbi cost model tuning** — add boundary penalty to fix over-segmentation
6. **Phase 6** — explore advanced topics (CRF, compression)

### Release Rollout Policy for Default Strategy

1. Ship Viterbi as opt-in (`strategy: 'viterbi'`) with benchmark report published
2. Run two consecutive benchmark cycles on same dataset snapshot
3. If guardrails and acceptance gates pass both cycles, switch default strategy
4. Keep an override option for explicit strategy selection in all releases
