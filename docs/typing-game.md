# Khmer typing games (MonkeyType-style)

This guide explains how to use `khmer-segment` to build a typing game where prompts and user input are in Khmer.

## Why not plain string comparison?

Khmer text must be compared in **grapheme clusters** (or dictionary words), not raw JavaScript string indices. The library provides:

- `compareTyping(target, typed)` — cluster-by-cluster (default) or `unit: 'word'` mode
- `computeTypingMetrics({ correctCharCount, totalTypedCharCount, elapsedMs })` — WPM / CPM / accuracy
- `getCaretBoundaries` + `deleteBackward` — caret-safe editing (see main README)

Import from the root package or the subpath:

```ts
import { compareTyping, computeTypingMetrics } from 'khmer-segment';
// or: import { compareTyping } from 'khmer-segment/typing';
```

## Recommended flow

1. **Normalize** — `compareTyping` defaults to `normalize: true`, matching `normalizeKhmer` so visually equivalent input compares equal.
2. **On each input change** — call `compareTyping(prompt, inputValue)` and use `correctUnits`, `unitStates`, and `mismatchOffset` for highlighting.
3. **Completion** — `isComplete` is true when normalized typed text equals normalized target exactly.
4. **Metrics** — pass `correctPrefixLength` from the comparison as `correctCharCount`, and the current typed length as `totalTypedCharCount`, plus elapsed time.

```ts
const comparison = compareTyping(prompt, typed);
const metrics = computeTypingMetrics({
    correctCharCount: comparison.correctPrefixLength,
    totalTypedCharCount: comparison.normalizedTyped.length,
    elapsedMs: Date.now() - startedAt,
});
```

`compareTyping` is strict at the cluster/word level: if any normalized unit differs, matching stops at that unit and `isComplete` stays `false`.

## Practical UI/UX notes

In real textareas and IME flows, users can produce input that looks correct but does not compare equal byte-for-byte.

- Trim trailing whitespace before compare (`value.replace(/\s+$/u, '')`) so accidental trailing spaces/newlines do not block completion.
- If your prompt accepts known equivalent spellings, fold those variants in app code before calling `compareTyping` (for example with a small `replaceAll(...)` map).

These are app-level choices. The core API intentionally remains strict and deterministic for predictable scoring.

## WPM and accuracy

- **WPM** uses the conventional **five characters per word** on `correctCharCount` (UTF-16 code units in the compare/normalize space).
- **Accuracy** is `100 * correctCharCount / totalTypedCharCount` when `totalTypedCharCount > 0`. Adjust what you pass in if you track keystrokes or errors differently.

## IME / composition events

When using a system keyboard with a composition sequence (e.g. some input methods), the DOM may fire `compositionstart` / `compositionupdate` / `compositionend`. Until composition ends, the `<input>` value can be incomplete. Typical patterns:

- Skip updating game state while `event.nativeEvent.isComposing` is true, **or**
- Ignore `onChange` while composition is active and only commit on `compositionend`.

This is application-level behavior; the library compares final strings you pass in.

## Optional: word-level prompts

Use `compareTyping(prompt, typed, { unit: 'word' })` when the prompt is split on whitespace and you want per-word correctness. Cluster mode is preferred for “natural” Khmer typing feel.

## Optional: ignore punctuation

`ignorePunctuation: true` strips Khmer sentence punctuation, common ASCII punctuation, and zero-width characters before comparison—useful for prompts that omit or vary punctuation.
