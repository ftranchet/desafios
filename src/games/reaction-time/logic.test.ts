import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  createRoundPlans,
  resolveRoundTap,
  type RoundOutcome,
} from './logic';

describe('createRoundPlans', () => {
  it('es determinístico con la misma semilla', () => {
    const a = createRoundPlans('medium', 42);
    const b = createRoundPlans('medium', 42);
    expect(a).toEqual(b);
  });

  it('produce cronogramas distintos con semillas distintas', () => {
    const a = createRoundPlans('medium', 1);
    const b = createRoundPlans('medium', 2);
    expect(a).not.toEqual(b);
  });

  it('respeta la cantidad de rondas y el rango de demora del nivel', () => {
    const plans = createRoundPlans('easy', 7);
    expect(plans).toHaveLength(5);
    for (const plan of plans) {
      expect(plan.delayMs).toBeGreaterThanOrEqual(1000);
      expect(plan.delayMs).toBeLessThanOrEqual(3000);
      expect(plan.isDecoy).toBe(false); // nivel 1 no tiene señuelos
    }
  });

  it('lanza si el nivel es inválido', () => {
    expect(() => createRoundPlans('zen' as never, 1)).toThrow();
  });
});

describe('resolveRoundTap', () => {
  it('marca acierto cuando se toca después del cambio en una ronda objetivo', () => {
    const outcome = resolveRoundTap({ delayMs: 500, isDecoy: false }, 650);
    expect(outcome).toEqual({ isDecoy: false, correct: true, reactionMs: 150 });
  });

  it('marca falso arranque cuando se toca antes del cambio', () => {
    const outcome = resolveRoundTap({ delayMs: 500, isDecoy: false }, 300);
    expect(outcome).toEqual({ isDecoy: false, correct: false, reactionMs: null });
  });

  it('marca error cuando no hay toque en una ronda objetivo (timeout)', () => {
    const outcome = resolveRoundTap({ delayMs: 500, isDecoy: false }, null);
    expect(outcome).toEqual({ isDecoy: false, correct: false, reactionMs: null });
  });

  it('marca acierto cuando se evita un señuelo (sin toque)', () => {
    const outcome = resolveRoundTap({ delayMs: 500, isDecoy: true }, null);
    expect(outcome).toEqual({ isDecoy: true, correct: true, reactionMs: null });
  });

  it('marca error cuando se toca un señuelo', () => {
    const outcome = resolveRoundTap({ delayMs: 500, isDecoy: true }, 600);
    expect(outcome).toEqual({ isDecoy: true, correct: false, reactionMs: 100 });
  });
});

describe('computeScore', () => {
  it('calcula puntaje y métricas con tiempos de reacción conocidos', () => {
    const outcomes: RoundOutcome[] = [
      { isDecoy: false, correct: true, reactionMs: 200 },
      { isDecoy: false, correct: true, reactionMs: 400 },
      { isDecoy: true, correct: true, reactionMs: null },
    ];
    const { score, metrics } = computeScore(outcomes);
    // hitPoints: (1000-200) + (1000-400) = 1400; + decoy avoided 150 = 1550
    expect(score).toBe(1550);
    expect(metrics).toEqual({
      hits: 2,
      misses: 0,
      decoysAvoided: 1,
      decoysFailed: 0,
      avgReactionMs: 300,
      bestReactionMs: 200,
    });
  });

  it('nunca da puntaje negativo', () => {
    const outcomes: RoundOutcome[] = [
      { isDecoy: false, correct: false, reactionMs: null },
      { isDecoy: true, correct: false, reactionMs: 50 },
    ];
    const { score } = computeScore(outcomes);
    expect(score).toBe(0);
  });

  it('da puntaje 0 y métricas en cero sin rondas', () => {
    const { score, metrics } = computeScore([]);
    expect(score).toBe(0);
    expect(metrics.avgReactionMs).toBe(0);
    expect(metrics.bestReactionMs).toBe(0);
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido', () => {
    const outcomes: RoundOutcome[] = [{ isDecoy: false, correct: true, reactionMs: 250 }];
    const result = buildResult({ mode: 'easy', seed: 1 }, outcomes, 5000, true);
    expect(result.gameId).toBe('reaction-time');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.score).toBeGreaterThan(0);
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
