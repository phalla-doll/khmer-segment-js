# Viterbi Boundary Penalty Sweep (Extended)

Date: 2026-04-08

Dataset: kh_data_10000b (87,875 sentences), dictionary: 101,107 words

BiMM baseline: Boundary F1 = 0.8041, Token F1 = 0.6327, OOV Boundary F1 = 0.4186

| Penalty | Viterbi Boundary F1 | Viterbi Token F1 | Viterbi OOV Boundary F1 | Viterbi Time (ms) | BiMM Time (ms) | Viterbi/BiMM Time |
| ------- | ------------------- | ---------------- | ----------------------- | ----------------- | -------------- | ----------------- |
| 0.25    | 0.7330              | 0.4336           | 0.8857                  | 23467             | 16010          | 1.47x             |
| 0.50    | 0.7361              | 0.4400           | 0.8855                  | 24635             | 16157          | 1.52x             |
| 0.75    | 0.7396              | 0.4435           | 0.8858                  | 22907             | 15408          | 1.49x             |
| 1.00    | 0.7441              | 0.4520           | 0.8865                  | 23541             | 15564          | 1.51x             |
| 1.25    | 0.7471              | 0.4593           | 0.8873                  | 23198             | 15897          | 1.46x             |
| 1.50    | 0.7513              | 0.4673           | 0.8873                  | 25779             | 16938          | 1.52x             |
| 2.00    | 0.7557              | 0.4741           | 0.8874                  | 23840             | 19110          | 1.25x             |
| 3.00    | 0.7696              | 0.4996           | 0.8875                  | 21814             | 15059          | 1.45x             |
| 4.00    | 0.7845              | 0.5219           | 0.8875                  | 20159             | 14548          | 1.39x             |
| 5.00    | 0.7967              | 0.5456           | 0.8875                  | 21915             | 14725          | 1.49x             |
| 6.00    | 0.8117              | 0.5769           | 0.8875                  | 23469             | 15537          | 1.51x             |
| 7.50    | 0.8291              | 0.6118           | 0.8875                  | 22059             | 15352          | 1.44x             |
| 8.00    | 0.8340              | 0.6222           | 0.8875                  | 22538             | 15487          | 1.46x             |
| 9.00    | 0.8467              | 0.6502           | 0.8874                  | 23273             | 15848          | 1.47x             |
| 10.00   | 0.8572              | 0.6744           | 0.8874                  | 21867             | 15624          | 1.40x             |

## Analysis

- Best Viterbi Boundary F1: **0.8572** at penalty=10.0
- Best Viterbi Token F1: **0.6744** at penalty=10.0 (surpasses BiMM's 0.6327)
- BiMM Boundary F1: **0.8041**
- Delta (Boundary F1): **+0.0531** (Viterbi wins by +5.3% absolute)
- OOV Boundary F1: Viterbi maintains **0.8875** across all penalties (vs BiMM's 0.4186 — Viterbi is +46.9% better on OOV)
- Latency: Viterbi is consistently ~1.4-1.5x BiMM (within the 1.8x guardrail)
- Viterbi crosses BiMM Boundary F1 at penalty ≈ 5.5-6.0
- Viterbi crosses BiMM Token F1 at penalty ≈ 8.5-9.0

### Go/No-Go Decision: **GO**

At penalty=10.0, Viterbi exceeds BiMM by **+5.3% absolute** on Boundary F1 (0.8572 vs 0.8041), surpasses BiMM Token F1 (0.6744 vs 0.6327), maintains vastly superior OOV Boundary F1 (0.8875 vs 0.4186), and stays within the 1.8x latency guardrail (1.40x).

### Crossover Points

| Metric                     | Penalty Threshold | Notes                          |
| -------------------------- | ----------------- | ------------------------------ |
| Viterbi Boundary F1 ≥ BiMM | ~5.5-6.0          | Viterbi becomes competitive    |
| Viterbi Token F1 ≥ BiMM    | ~8.5-9.0          | Viterbi matches on all metrics |
| Optimal (both metrics)     | 10.0              | Best overall accuracy          |
