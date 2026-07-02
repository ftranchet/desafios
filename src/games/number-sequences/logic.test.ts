import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  computeScore,
  generateSequence,
  generateSession,
  type AnswerRecord,
} from './logic';

describe('generateSequence', () => {
  it('genera progresiones aritméticas consistentes en nivel 1', () => {
    const rng = createRng(1);
    for (let i = 0; i < 30; i += 1) {
      const q = generateSequence(1, rng);
      expect(q.patternType).toBe('arithmetic');
      expect(q.terms).toHaveLength(4);
      const step = (q.terms[1] as number) - (q.terms[0] as number);
      for (let t = 1; t < q.terms.length; t += 1) {
        expect((q.terms[t] as number) - (q.terms[t - 1] as number)).toBe(step);
      }
      expect(q.answer).toBe((q.terms[q.terms.length - 1] as number) + step);
    }
  });

  it('genera progresiones geométricas con razón entera en nivel 4', () => {
    const rng = createRng(2);
    for (let i = 0; i < 30; i += 1) {
      const q = generateSequence(4, rng);
      if (q.patternType !== 'geometric') continue;
      const ratio = (q.terms[1] as number) / (q.terms[0] as number);
      for (let t = 1; t < q.terms.length; t += 1) {
        expect((q.terms[t] as number) / (q.terms[t - 1] as number)).toBe(ratio);
      }
      expect(q.answer).toBe((q.terms[q.terms.length - 1] as number) * ratio);
    }
  });

  it('lanza si el nivel es inválido', () => {
    expect(() => generateSequence(9, createRng(1))).toThrow();
  });
});

describe('generateSession', () => {
  it('es determinística con la misma semilla', () => {
    const a = generateSession(3, 42);
    const b = generateSession(3, 42);
    expect(a).toEqual(b);
  });

  it('respeta la cantidad de preguntas del nivel', () => {
    expect(generateSession(1, 1)).toHaveLength(8);
    expect(generateSession(5, 1)).toHaveLength(12);
  });
});

describe('computeScore', () => {
  it('da puntos base + bono por tiempo restante en respuestas correctas', () => {
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 0 },
      { correct: true, responseMs: 10000 },
    ];
    const { score, metrics } = computeScore(answers, 10);
    expect(score).toBe(100 + 50 + 100 + 0);
    expect(metrics).toEqual({ correct: 2, incorrect: 0, avgResponseMs: 5000 });
  });

  it('no suma puntos por respuestas incorrectas o timeouts', () => {
    const answers: AnswerRecord[] = [
      { correct: false, responseMs: 3000 },
      { correct: false, responseMs: null },
    ];
    expect(computeScore(answers, 10).score).toBe(0);
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido', () => {
    const answers: AnswerRecord[] = [{ correct: true, responseMs: 2000 }];
    const result = buildResult({ level: 1, seed: 1 }, answers, 4000, true);
    expect(result.gameId).toBe('number-sequences');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(4000);
    expect(result.score).toBeGreaterThan(0);
  });
});
