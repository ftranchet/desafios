import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  generateSession,
  getModeParams,
  isCorrectChoice,
  stageForIndex,
  stageParams,
  type AnswerRecord,
  type Round,
} from './logic';

const SEED = 42;

describe('generateSession: modos fijos', () => {
  it('misma semilla, misma sesión', () => {
    expect(generateSession('medium', SEED)).toEqual(generateSession('medium', SEED));
  });

  it('respeta la cantidad de rondas y nunca hay empate', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const session = generateSession(mode, SEED);
      expect(session).toHaveLength(getModeParams(mode).roundCount);
      for (const r of session) {
        expect(r.left.value).not.toBe(r.right.value);
      }
    }
  });

  it('Tranquilo no tiene reloj: seconds = 0 en todas las rondas', () => {
    for (const r of generateSession('zen', SEED)) {
      expect(r.seconds).toBe(0);
    }
  });

  it('isCorrectChoice elige el valor mayor', () => {
    const round: Round = {
      left: { label: '3', value: 3 },
      right: { label: '5', value: 5 },
      stage: 1,
      seconds: 4,
    };
    expect(isCorrectChoice(round, 'right')).toBe(true);
    expect(isCorrectChoice(round, 'left')).toBe(false);
  });
});

describe('modo progresivo', () => {
  it('el grado sube uno cada dos rondas hasta 10', () => {
    expect(stageForIndex(0)).toBe(1);
    expect(stageForIndex(2)).toBe(2);
    expect(stageForIndex(19)).toBe(10);
  });

  it('la complejidad se desbloquea por grado y el tiempo se achica', () => {
    expect(stageParams(1).complexity).toBe('number');
    expect(stageParams(5).complexity).toBe('sum');
    expect(stageParams(7).complexity).toBe('mixed');
    expect(stageParams(10).complexity).toBe('product');
    expect(stageParams(10).secondsPerRound).toBeLessThan(stageParams(1).secondsPerRound);
    expect(stageParams(10).secondsPerRound).toBeGreaterThanOrEqual(2);
  });

  it('la sesión progresiva es determinística y anota el grado', () => {
    const session = generateSession('progressive', SEED);
    expect(session).toHaveLength(20);
    expect(session.map((r) => r.stage)).toEqual(session.map((_, i) => stageForIndex(i)));
    expect(generateSession('progressive', SEED)).toEqual(session);
  });
});

describe('computeScore', () => {
  const round = (stage: number, seconds: number): Round => ({
    left: { label: '1', value: 1 },
    right: { label: '2', value: 2 },
    stage,
    seconds,
  });

  it('Tranquilo: punto fijo por acierto, sin bono', () => {
    const rounds = [round(1, 0), round(1, 0)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 60_000 },
      { correct: true, responseMs: 5 },
    ];
    expect(computeScore('zen', answers, rounds).score).toBe(200);
  });

  it('progresivo: el grado multiplica y la racha se registra', () => {
    const rounds = [round(1, 4), round(10, 4)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 4000 },
      { correct: true, responseMs: 4000 },
    ];
    const { score, metrics } = computeScore('progressive', answers, rounds);
    expect(score).toBe(100 + 200);
    expect(metrics.maxStage).toBe(10);
    expect(metrics.bestStreak).toBe(2);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con el modo de la configuración', () => {
    const rounds = generateSession('easy', SEED);
    const answers: AnswerRecord[] = rounds.map(() => ({ correct: true, responseMs: 1000 }));
    const result = buildResult({ mode: 'easy', seed: SEED }, answers, rounds, 40_000, true);
    expect(result.gameId).toBe('quick-estimate');
    expect(result.mode).toBe('easy');
    expect(result.metrics.correct).toBe(rounds.length);
  });
});
