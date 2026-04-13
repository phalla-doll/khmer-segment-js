# Contributing to khmer-segment

Thanks for your interest in contributing.

This guide covers the expected local workflow, pull request checklist, and data/licensing notes for this repository.

## Prerequisites

- Node.js `>=18.0.0`
- npm (project uses `package-lock.json`)

## Local Setup

```bash
npm ci
```

If you prefer, `npm install` also works for local development.

## Development Commands

```bash
npm run build
npm test
npm run lint
npm run format:check
```

Helpful optional commands:

```bash
npm run test:watch
npm run test:perf
npm run test:accuracy
npm run test:accuracy:check
npm run playground:dev
```

## Pull Request Checklist

Before opening or updating a PR, run:

```bash
npm run build && npm test && npm run lint && npm run format:check
```

This matches the repository `prepublishOnly` gate and the blocking CI checks.

- Keep changes focused and include tests for behavior changes.
- Update docs when public API or behavior changes.
- Add a changelog entry under `## [Unreleased]` in `CHANGELOG.md` for user-facing changes.

## CI Expectations

GitHub Actions currently runs:

- Blocking checks on push/PR:
  - `build`
  - `test`
  - `lint`
  - `format:check`
- Non-blocking perf job on push/PR:
  - `test:perf` (`continue-on-error: true`)
- Manual/scheduled benchmark regression job:
  - `download:benchmark`
  - `test:accuracy:check`

## Testing Guidance

- Use `npm test` for correctness during normal feature work.
- Run `npm run test:perf` when changing algorithmic hot paths.
- Run `npm run test:accuracy:check` when changes can affect segmentation quality.
- Accuracy data is downloaded on demand (see `benchmark/README.md`).

## Documentation

Canonical references:

- `README.md`
- `docs/README.md`
- `docs/design/DESIGN.md`
- `docs/benchmark-methodology.md`
- `docs/benchmark-results.md`
- `docs/data-sources.md`

When behavior, benchmarks, or source data change, update the relevant docs in the same PR.

## Data and Licensing Policy

If your contribution adds or changes dictionary/corpus data sources:

- Document the source in `docs/data-sources.md`:
  - URL or origin
  - license
  - what files are used
  - redistribution policy
- Confirm redistribution rights before vendoring data.
- Prefer reproducible fetch/build scripts when raw data should not be committed.

## Issues and Questions

- Bug reports / feature requests: https://github.com/phalla-doll/khmer-segment-js/issues
- For usage details, start with `README.md` and `docs/README.md`.

## License

By contributing, you agree that your contributions are licensed under the MIT License in `LICENSE`.
