import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  COLOR_NAMES,
  generateSession,
  getModeParams,
  stageForIndex,
  stageParams,
  type AnswerRecord,
  type Question,
} from './logic';

const SEED = 42;

describe('generateSession: modos fijos', () => {
  it('misma semilla, misma sesión', () => {
    expect(generateSession('medium', SEED)).toEqual(generateSession('medium', SEED));
  });

  it('respeta la cantidad de preguntas de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const session = generateSession(mode, SEED);
      expect(session).toHaveLength(getModeParams(mode).questionCount);
    }
  });

  it('word e ink son siempre colores válidos, y congruent refleja si coinciden', () => {
    for (const q of generateSession('hard', SEED)) {
      expect(COLOR_NAMES).toContain(q.word);
      expect(COLOR_NAMES).toContain(q.ink);
      expect(q.congruent).toBe(q.word === q.ink);
    }
  });

  it('Fácil tiene mucho menos conflicto que Difícil (en una muestra grande)', () => {
    const easySessions = Array.from({ length: 50 }, (_, i) => generateSession('easy', i)).flat();
    const hardSessions = Array.from({ length: 50 }, (_, i) => generateSession('hard', i)).flat();
    const easyIncongruentRate =
      easySessions.filter((q) => !q.congruent).length / easySessions.length;
    const hardIncongruentRate =
      hardSessions.filter((q) => !q.congruent).length / hardSessions.length;
    expect(hardIncongruentRate).toBeGreaterThan(easyIncongruentRate);
  });

  it('Tranquilo no tiene reloj: seconds = 0 en todas las preguntas', () => {
    for (const q of generateSession('zen', SEED)) {
      expect(q.seconds).toBe(0);
    }
  });
});

describe('modo progresivo', () => {
  it('el grado sube uno cada dos preguntas hasta 10', () => {
    expect(stageForIndex(0)).toBe(1);
    expect(stageForIndex(1)).toBe(1);
    expect(stageForIndex(2)).toBe(2);
    expect(stageForIndex(18)).toBe(10);
    expect(stageForIndex(19)).toBe(10);
  });

  it('los parámetros escalan del grado 1 al 10 (y 9-10 superan al Difícil)', () => {
    const first = stageParams(1);
    const mid = stageParams(8);
    const last = stageParams(10);
    expect(first.incongruentChance).toBeCloseTo(getModeParams('easy').incongruentChance);
    // El grado 8 equivale al Difícil; el 10 lo supera (extrapolación ADR-007).
    expect(mid.incongruentChance).toBeCloseTo(getModeParams('hard').incongruentChance);
    expect(last.incongruentChance).toBeGreaterThan(mid.incongruentChance);
    expect(last.incongruentChance).toBeLessThanOrEqual(1);
    expect(last.seconds).toBeLessThanOrEqual(mid.seconds);
    expect(last.seconds).toBeGreaterThanOrEqual(2);
  });

  it('la sesión progresiva es determinística y anota el grado por pregunta', () => {
    const session = generateSession('progressive', SEED);
    expect(session).toHaveLength(20);
    expect(session.map((q) => q.stage)).toEqual(session.map((_, i) => stageForIndex(i)));
    expect(generateSession('progressive', SEED)).toEqual(session);
  });
});

describe('computeScore', () => {
  const question = (stage: number, seconds: number): Question => ({
    word: 'amarillo',
    ink: 'amarillo',
    congruent: true,
    stage,
    seconds,
  });

  it('modo fijo: base + bono por tiempo restante', () => {
    const questions = [question(1, 10), question(1, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 0 }, // bono completo
      { correct: false, responseMs: 1000 },
    ];
    const { score, metrics } = computeScore('medium', answers, questions);
    expect(score).toBe(150);
    expect(metrics.correct).toBe(1);
    expect(metrics.incorrect).toBe(1);
  });

  it('Tranquilo: punto fijo por acierto, sin bono', () => {
    const questions = [question(1, 0), question(1, 0)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 60_000 },
      { correct: true, responseMs: 5 },
    ];
    const { score } = computeScore('zen', answers, questions);
    expect(score).toBe(200);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const questions = [question(1, 10), question(10, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 10_000 }, // sin bono
      { correct: true, responseMs: 10_000 },
    ];
    const { score, metrics } = computeScore('progressive', answers, questions);
    expect(score).toBe(100 + 200); // grado 10 → multiplicador 2
    expect(metrics.maxStage).toBe(10);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con el modo de la configuración', () => {
    const questions = generateSession('easy', SEED);
    const answers: AnswerRecord[] = questions.map(() => ({ correct: true, responseMs: 1000 }));
    const result = buildResult({ mode: 'easy', seed: SEED }, answers, questions, 60_000, true);
    expect(result.gameId).toBe('stroop');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.metrics.correct).toBe(questions.length);
  });
});
