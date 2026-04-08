# Benchmark data

Gold-standard text for accuracy evaluation is not committed (large files).

```bash
npm run download:benchmark
```

This populates `benchmark/data/` with the `kh_data_10000` corpus. Then run:

```bash
npm run test:accuracy
```
