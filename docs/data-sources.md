# Data Sources

This document records all external data sources used in the khmer-segment dictionary.

## Active Sources

### 1. SIL International Khmer Line-Break Dictionary (`silnrsi/khmerlbdict`)

- **URL**: https://github.com/silnrsi/khmerlbdict
- **License**: MIT / LGPL (SIL International)
- **Files Used**: `seafreq.txt`, `KHSV.txt`, `KHOV.txt`, `DFD.txt`, `HC.txt`, `TD.txt`, `villages.txt`, `places.txt`, `names.txt`
- **Usage**: Primary frequency-weighted word source
- **Redistribution**: Word lists are included via build script (downloaded at build time)

### 2. Royal Academy of Cambodia Word List

- **File**: `scripts/royal-academy.txt`
- **License**: Public domain / open data
- **Usage**: Curated Khmer word list (25,255 words)
- **Redistribution**: Vendored in repository

### 3. Sovichea Khmer Segmenter Dictionary (`Sovichea/khmer_segmenter`)

- **URL**: https://github.com/Sovichea/khmer_segmenter
- **License**: MIT (Copyright 2026 Sovichea Tep)
- **File Used**: `khmer_dictionary_words.txt`
- **Usage**: Comprehensive curated Khmer word list (~82,700 words)
- **Redistribution**: Downloaded at build time, not vendored

## Benchmark Data

### kh_data_10000b (phylypo/segmentation-crf-khmer)

- **URL**: https://github.com/phylypo/segmentation-crf-khmer
- **License**: GitHub public repository (no explicit license file)
- **Usage**: Gold-standard segmented corpus for accuracy benchmarking
- **Redistribution**: Downloaded at benchmark time, not included in npm package

## Removed / Considered Sources

### Google language-resources/km

- **URL**: https://github.com/google/language-resources/tree/master/km
- **License**: Apache-2.0 (repo) / CC-BY-4.0 (lexicon.tsv)
- **Status**: Repository archived Nov 2022. File is a pronunciation lexicon (TSV with phonemic transcriptions), not a pure word list. Contains many transliterated foreign names. Low yield for segmentation purposes.
- **Decision**: Not integrated due to low signal-to-noise ratio.
