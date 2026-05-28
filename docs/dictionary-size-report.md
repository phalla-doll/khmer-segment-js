# Dictionary Size Report

Date: 2026-05-15T16:24:32.459Z

Run `npm run build` before this report so `dist/dictionary` exists.

| File                      |     Raw |     Gzip |
| ------------------------- | ------: | -------: |
| dist/dictionary/index.js  | 8.08 MB | 704.4 KB |
| dist/dictionary/index.cjs | 8.08 MB | 705.0 KB |

## Load-Time Probe

- ESM import time: 170.57ms

## Compression Gate

Implement a compact internal dictionary format only if a prototype can reduce gzip size by at least 40% while preserving the public dictionary API.
