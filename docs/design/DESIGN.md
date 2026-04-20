# Khmer Segmentation Design

## Overview

`khmer-segment` is a framework-agnostic Khmer text processing library focused on
these core jobs:

- normalize Khmer text into a consistent internal form
- split text into Khmer-safe grapheme clusters
- segment clustered text into tokens using dictionary-based matching
- compare typed input to a target for typing-game style UIs (cluster-aware)

The library is designed so the segmentation pipeline stays deterministic,
tree-shakeable, and easy to embed in browser or server code.

## Processing Pipeline

1. Accept the caller's input text.
2. Normalize the text unless `normalize: false` is passed.
3. Split the normalized text into Khmer-aware grapheme clusters.
4. Run a segmentation strategy:
    - Forward Maximum Matching (FMM)
    - Backward Maximum Matching (BMM)
    - Bidirectional Maximum Matching (BiMM)
5. Merge consecutive digit tokens into a single token.
6. Return `original`, `normalized`, and token metadata.

## Normalization

Normalization happens in `src/core/normalize.ts`.

The normalizer:

- strips invisible characters such as ZWS, ZWJ, ZWNJ, word joiner, LRM/RLM, and BOM
- splits the cleaned text into clusters
- reorders Khmer marks inside each Khmer cluster into a stable canonical order

The canonical order used by this library is:

1. base consonant or independent vowel
2. coeng pairs
3. shift signs
4. dependent vowels
5. other signs
6. any remaining characters

This ordering is intentionally practical rather than a complete formal Khmer
Character Cluster implementation.

## Cluster Splitting

Cluster handling lives in `src/core/cluster.ts`.

The splitter groups Khmer grapheme clusters so downstream code does not operate
on naive JavaScript code units. This matters because Khmer words are built from
multi-code-point clusters, and segmentation quality drops quickly if the input
is split into raw characters.

## Dictionary Model

The in-memory dictionary is implemented in `src/dictionary/memory-dictionary.ts`.

Key design choices:

- a forward trie supports prefix lookup for FMM
- a reverse trie supports suffix lookup for BMM
- optional frequency metadata is available for callers and future strategies
- `size` reports unique non-empty dictionary entries

The bundled default dictionary is built from `src/dictionary/data/khmer-words.json`
and exposed separately through `khmer-segment/dictionary` so the core package can
stay small.

## Segmentation Strategies

### FMM

FMM scans left-to-right and greedily picks the longest word that matches the
current cluster sequence.

### BMM

BMM scans right-to-left and greedily picks the longest suffix match.

### BiMM

BiMM runs both FMM and BMM, then chooses the better result using simple
heuristics:

- fewer unknown tokens wins
- if tied, fewer total tokens wins
- if still tied, FMM wins

## Token Offsets

Token offsets are measured against `result.normalized`.

This is an intentional contract: if normalization removes invisible characters,
`SegmentToken.start` and `end` may no longer line up with positions in the
original input string. The returned `original` field preserves the caller's raw
input, while `normalized` is the coordinate space used by token boundaries.

## Performance Notes

The library favors predictable dictionary-based behavior over statistical models.
It is fast enough for UI and application-level use, but performance assertions
are kept separate from the main correctness suite because they can vary across
machines and CI runners.

## Typing game helpers

Typing-oriented APIs live in `src/typing/index.ts` (also importable as `khmer-segment/typing`).

They build on normalization and `splitClusters()` so progress and mismatch offsets align with
how Khmer is typed, not naive JavaScript character indices. Metrics (`computeTypingMetrics`) use
standard five-characters-per-word WPM on the caller-supplied correct character count.

## Text editing helpers

Caret and cluster-safe backspace are implemented in `src/core/caret.ts` (`getCaretBoundaries`,
`deleteBackward`). React adapters are in `khmer-segment/react`.

## Non-Goals

This library does not currently provide:

- statistical or ML-based segmentation
- full ICU-grade line breaking
- a full typing game UI (timer, leaderboards, account system)
- compressed dictionary transport formats
