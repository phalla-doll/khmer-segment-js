# Benchmark Methodology

## Overview

This document describes the evaluation methodology used to measure Khmer word segmentation accuracy across different strategies (FMM, BMM, BiMM, Viterbi).

## Dataset

- **Source**: `kh_data_10000b` from [phylypo/segmentation-crf-khmer](https://github.com/phylypo/segmentation-crf-khmer)
- **Format**: One sentence per line, words separated by spaces
- **Download**: `npm run download:benchmark`

## Tokenization Alignment Rules

1. Gold-standard text is split by whitespace to produce reference tokens
2. Predicted text is the concatenation of gold tokens (removing spaces)
3. Each strategy segments the unsegmented text
4. No additional normalization is applied beyond the library's built-in normalization

## Boundary Extraction Logic

- Boundaries are positions between characters where word breaks occur
- For a sequence of tokens `[t1, t2, ..., tn]`, boundaries are at cumulative lengths
- Example: `"ខ្ញុំសរសេរ"` → tokens `["ខ្ញុំ", "សរសេរ"]` → boundaries `{5, 10}`

## Metrics

### Primary Metrics

- **Boundary-level Precision/Recall/F1**: Compares predicted word boundary positions against gold boundary positions

### Secondary Metrics

- **Token-level Precision/Recall/F1**: Compares predicted tokens against gold tokens (order-independent bag-of-words comparison)
- **Exact-sentence-match rate**: Percentage of sentences where all predicted tokens exactly match gold tokens
- **OOV token rate**: Fraction of predicted tokens not found in the dictionary
- **OOV boundary F1**: F1 score specifically for boundaries involving unknown words

## OOV Definition

A token is considered OOV (Out-of-Vocabulary) if `token.isKnown === false`.

## Reproduction

```bash
npm run download:benchmark
npm run test:accuracy
```

Results are written to `docs/benchmark-results.md`.
