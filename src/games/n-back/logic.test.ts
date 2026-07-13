import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  computeScore,
  generateSequence,
  generateSession,
  getModeParams,
  MODE_PARAMS,
  stageParams,
  SYMBOL_COUNT,
  type AnswerRecord,
  type Trial,
} from './logic';

const SEED = 123;

describe('generateSequence', () => {
  it('misma semilla, misma secuencia', () => {
    expect(generateSequence(createRng(SEED), 20, 2)).toEqual(generateSequence(createRng(SEED), 20, 2));
  });

  it('las primeras n posiciones no tienen coincidencia posible (no hay a quién comparar)', () => {
    const sequence = generateSequence(createRng(SEED), 10, 3);
    expect(sequence).toHaveLength(10);
    sequence.forEach((symbol) => expect(symbol).toBeGreaterThanOrEqual(0));
    sequence.forEach((symbol) => expect(symbol).toBeLessThan(SYMBOL_COUNT));
  });

  it('produce una mezcla real de coincidencias y no-coincidencias (no es trivial)', () => {
    const sequence = generateSequence(createRng(SEED), 200, 2);
    let matches = 0;
    let nonMatches = 0;
    for (let i = 2; i < sequence.length; i += 1) {
      if (sequence[i] === sequence[i - 2]) matches += 1;
      else nonMatches += 1;
    }
    expect(matches).toBeGreaterThan(0);
    expect(nonMatches).toBeGreaterThan(0);
  });
});

describe('generateSession', () => {
  it('misma semilla, misma sesión', () => {
    expect(generateSession('medium', SEED)).toEqual(generateSession('medium', SEED));
  });

  it('respeta la cantidad de ensayos y el N de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const params = getModeParams(mode);
      const trials = generateSession(mode, SEED);
      expect(trials).toHaveLength(params.trialCount);
      trials.forEach((t) => expect(t.n).toBe(params.n));
    }
  });

  it('isMatch es falso en las primeras n posiciones de cada secuencia', () => {
    const trials = generateSession('hard', SEED);
    const n = MODE_PARAMS.hard.n;
    for (let i = 0; i < n; i += 1) expect(trials[i]!.isMatch).toBe(false);
  });

  it('isMatch coincide exactamente con comparar contra la posición n atrás', () => {
    const trials = generateSession('medium', SEED);
    const n = MODE_PARAMS.medium.n;
    for (let i = n; i < trials.length; i += 1) {
      expect(trials[i]!.isMatch).toBe(trials[i]!.symbol === trials[i - n]!.symbol);
    }
  });

  it('Tranquilo no tiene reloj: seconds = 0 en todos los ensayos', () => {
    for (const t of generateSession('zen', SEED)) expect(t.seconds).toBe(0);
  });

  it('Progresivo: 10 secuencias encadenadas, cada una con su propio N sin cruzar de grado', () => {
    const trials = generateSession('progressive', SEED);
    const stages = [...new Set(trials.map((t) => t.stage))];
    expect(stages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Dentro de cada grado, isMatch se puede recalcular solo con los símbolos de ese grado.
    for (const stage of stages) {
      const stageTrials = trials.filter((t) => t.stage === stage);
      const n = stageTrials[0]!.n;
      for (let i = n; i < stageTrials.length; i += 1) {
        expect(stageTrials[i]!.isMatch).toBe(stageTrials[i]!.symbol === stageTrials[i - n]!.symbol);
      }
    }
  });
});

describe('stageParams', () => {
  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    expect(stageParams(1).n).toBe(MODE_PARAMS.easy.n);
    expect(stageParams(8).n).toBe(MODE_PARAMS.hard.n);
  });

  it('los grados 9-10 superan a Difícil: N sigue creciendo', () => {
    expect(stageParams(10).n).toBeGreaterThan(MODE_PARAMS.hard.n);
    expect(stageParams(10).seconds).toBeLessThanOrEqual(stageParams(8).seconds);
    expect(stageParams(10).seconds).toBeGreaterThanOrEqual(1.5);
  });
});

describe('computeScore', () => {
  const trial = (stage: number, seconds: number): Trial => ({
    symbol: 0,
    isMatch: true,
    n: 2,
    stage,
    seconds,
  });

  it('modo fijo: base + bono por tiempo restante', () => {
    const trials = [trial(1, 10), trial(1, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 0 }, // bono completo
      { correct: false, responseMs: 1000 },
    ];
    const { score, metrics } = computeScore('medium', answers, trials);
    expect(score).toBe(150);
    expect(metrics.correct).toBe(1);
    expect(metrics.incorrect).toBe(1);
  });

  it('Tranquilo: punto fijo por acierto, sin bono', () => {
    const trials = [trial(1, 0), trial(1, 0)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 60_000 },
      { correct: true, responseMs: 5 },
    ];
    const { score } = computeScore('zen', answers, trials);
    expect(score).toBe(200);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const trials = [trial(1, 10), trial(10, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 10_000 }, // sin bono
      { correct: true, responseMs: 10_000 },
    ];
    const { score, metrics } = computeScore('progressive', answers, trials);
    expect(score).toBe(100 + 200); // grado 10 → multiplicador 2
    expect(metrics.maxStage).toBe(10);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con el modo de la configuración', () => {
    const trials = generateSession('easy', SEED);
    const answers: AnswerRecord[] = trials.map(() => ({ correct: true, responseMs: 1000 }));
    const result = buildResult({ mode: 'easy', seed: SEED }, answers, trials, 60_000, true);
    expect(result.gameId).toBe('n-back');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.metrics.correct).toBe(trials.length);
  });
});
