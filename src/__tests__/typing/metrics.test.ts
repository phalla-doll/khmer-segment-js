import { describe, it, expect } from 'vitest';
import { computeTypingMetrics } from '../../typing/index';

describe('computeTypingMetrics', () => {
    it('computes WPM from 5 chars per word', () => {
        const m = computeTypingMetrics({
            correctCharCount: 25,
            totalTypedCharCount: 25,
            elapsedMs: 60000,
        });
        expect(m.wpm).toBe(5);
        expect(m.cpm).toBe(25);
        expect(m.accuracy).toBe(100);
        expect(m.correctChars).toBe(25);
    });

    it('returns 0 WPM when elapsed is 0', () => {
        const m = computeTypingMetrics({
            correctCharCount: 10,
            totalTypedCharCount: 10,
            elapsedMs: 0,
        });
        expect(m.wpm).toBe(0);
        expect(m.cpm).toBe(0);
    });

    it('computes accuracy when typed includes mistakes', () => {
        const m = computeTypingMetrics({
            correctCharCount: 8,
            totalTypedCharCount: 10,
            elapsedMs: 60000,
        });
        expect(m.accuracy).toBe(80);
    });

    it('uses 100% accuracy when nothing typed', () => {
        const m = computeTypingMetrics({
            correctCharCount: 0,
            totalTypedCharCount: 0,
            elapsedMs: 1000,
        });
        expect(m.accuracy).toBe(100);
    });

    it('rejects invalid inputs', () => {
        expect(() =>
            computeTypingMetrics({
                correctCharCount: -1,
                totalTypedCharCount: 1,
                elapsedMs: 1,
            })
        ).toThrow(TypeError);
        expect(() =>
            computeTypingMetrics({
                correctCharCount: 1,
                totalTypedCharCount: -1,
                elapsedMs: 1,
            })
        ).toThrow(TypeError);
        expect(() =>
            computeTypingMetrics({
                correctCharCount: 1,
                totalTypedCharCount: 1,
                elapsedMs: -1,
            })
        ).toThrow(TypeError);
    });
});
