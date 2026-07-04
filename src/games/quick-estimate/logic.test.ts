import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  computeScore,
  generateRound,
  generateSession,
  isCorrectChoice,
  type AnswerRecord,
} from './logic';

describe('generateRound', () => {
  it('nunca genera un empate', () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i += 1) {
      const round = generateRound('medium', rng);
      expect(round.left.value).not.toBe(round.right.value);
    }
  });

  it('respeta la magnitud del nivel 1 (comparar números crudos)', () => {
    const rng = createRng(2);
    for (let i = 0; i < 20; i += 1) {
      const round = generateRound('easy', rng);
      expect(round.left.value).toBeGreaterThanOrEqual(1);
      expect(round.left.value).toBeLessThanOrEqual(50);
      expect(round.right.value).toBeGreaterThanOrEqual(1);
      expect(round.right.value).toBeLessThanOrEqual(50);
    }
  });

  it('lanza si el nivel es inválido', () => {
    expect(() => generateRound('zen' as never, createRng(1))).toThrow();
  });
});

describe('generateSession', () => {
  it('es determinística con la misma semilla', () => {
    const a = generateSession('medium', 42);
    const b = generateSession('medium', 42);
    expect(a).toEqual(b);
  });

  it('respeta la cantidad de rondas del nivel', () => {
    expect(generateSession('easy', 1)).toHaveLength(10);
    expect(generateSession('hard', 1)).toHaveLength(15);
  });
});

describe('isCorrectChoice', () => {
  it('identifica el lado de mayor valor', () => {
    const round = { left: { label: '3', value: 3 }, right: { label: '9', value: 9 } };
    expect(isCorrectChoice(round, 'right')).toBe(true);
    expect(isCorrectChoice(round, 'left')).toBe(false);
  });
});

describe('computeScore', () => {
  it('da puntos base + bono por tiempo y calcula la racha más larga', () => {
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 0 },
      { correct: true, responseMs: 0 },
      { correct: false, responseMs: 1000 },
      { correct: true, responseMs: 0 },
    ];
    const { score, metrics } = computeScore(answers, 4);
    expect(score).toBe(3 * (100 + 50));
    expect(metrics.correct).toBe(3);
    expect(metrics.incorrect).toBe(1);
    expect(metrics.bestStreak).toBe(2);
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido', () => {
    const answers: AnswerRecord[] = [{ correct: true, responseMs: 500 }];
    const result = buildResult({ mode: 'easy', seed: 1 }, answers, 3000, true);
    expect(result.gameId).toBe('quick-estimate');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(3000);
    expect(result.score).toBeGreaterThan(0);
  });
});
