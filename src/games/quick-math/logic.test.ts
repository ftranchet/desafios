import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  generateQuestion,
  generateSession,
  type AnswerRecord,
} from './logic';
import { createRng } from '../../core/random';

describe('generateQuestion', () => {
  it('genera sumas correctas en nivel 1 (solo suma)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 20; i += 1) {
      const q = generateQuestion(1, rng);
      expect(q.op).toBe('+');
      expect(q.answer).toBe(q.a + q.b);
      expect(q.a).toBeGreaterThanOrEqual(1);
      expect(q.a).toBeLessThanOrEqual(20);
    }
  });

  it('genera restas sin resultado negativo en nivel 2', () => {
    const rng = createRng(2);
    for (let i = 0; i < 50; i += 1) {
      const q = generateQuestion(2, rng);
      if (q.op === '-') {
        expect(q.a).toBeGreaterThanOrEqual(q.b);
        expect(q.answer).toBe(q.a - q.b);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('genera divisiones exactas en nivel 4', () => {
    const rng = createRng(4);
    for (let i = 0; i < 50; i += 1) {
      const q = generateQuestion(4, rng);
      if (q.op === '/') {
        expect(q.a % q.b).toBe(0);
        expect(q.a / q.b).toBe(q.answer);
      }
    }
  });

  it('lanza si el nivel es inválido', () => {
    expect(() => generateQuestion(9, createRng(1))).toThrow();
  });
});

describe('generateSession', () => {
  it('es determinística con la misma semilla', () => {
    const a = generateSession(3, 42);
    const b = generateSession(3, 42);
    expect(a).toEqual(b);
  });

  it('respeta la cantidad de preguntas del nivel', () => {
    expect(generateSession(1, 1)).toHaveLength(10);
    expect(generateSession(5, 1)).toHaveLength(15);
  });
});

describe('computeScore', () => {
  it('da puntos base + bono por tiempo restante en respuestas correctas', () => {
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 0 }, // respondió instantáneo: bono máximo
      { correct: true, responseMs: 10000 }, // usó todo el tiempo: sin bono
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
    const { score, metrics } = computeScore(answers, 10);
    expect(score).toBe(0);
    expect(metrics).toEqual({ correct: 0, incorrect: 2, avgResponseMs: 0 });
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido', () => {
    const answers: AnswerRecord[] = [{ correct: true, responseMs: 2000 }];
    const result = buildResult({ level: 1, seed: 1 }, answers, 4000, true);
    expect(result.gameId).toBe('quick-math');
    expect(result.level).toBe(1);
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(4000);
    expect(result.score).toBeGreaterThan(0);
  });
});
