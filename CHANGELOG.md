# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2]

### Changed

- Clarified that `SegmentToken.start` and `end` are offsets into `result.normalized`.
- Made `loadFrequencyDictionary()` return fresh arrays and a fresh `Map` from cached source data, so callers can safely mutate their local copy without affecting later calls.
- Corrected custom dictionary `size` to report unique non-empty words when duplicate inputs are provided.
- Separated optional performance checks from the main Vitest correctness suite.
- Added a minimal CI workflow for build, test, lint, and formatting checks.

## [0.2.1]

Current published baseline before the next release hardening work.
