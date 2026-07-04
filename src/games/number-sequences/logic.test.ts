import { describe, expect, it } from 'vitest';
import {
  buildResult,
  computeScore,
  generateSession,
  getModeParams,
  stageForIndex,
  stageParams,
  type AnswerRecord,
  type SequenceQuestion,
} from './logic';

const SEED = 42;

describe('generateSession: modos fijos', () => {
  it('misma semilla, misma sesión', () => {
    expect(generateSession('medium', SEED)).toEqual(generateSession('medium', SEED));
  });

  it('respeta la cantidad de preguntas y los patrones de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const params = getModeParams(mode);
      const session = generateSession(mode, SEED);
      expect(session).toHaveLength(params.questionCount);
      for (const q of session) {
        expect(params.patternTypes).toContain(q.patternType);
        expect(q.terms).toHaveLength(params.termCount);
      }
    }
  });

  it('las aritméticas tienen paso constante y respuesta correcta', () => {
    for (const q of generateSession('easy', SEED)) {
      const step = q.terms[1]! - q.terms[0]!;
      for (let i = 1; i < q.terms.length; i += 1) {
        expect(q.terms[i]! - q.terms[i - 1]!).toBe(step);
      }
      expect(q.answer).toBe(q.terms[q.terms.length - 1]! + step);
    }
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
    expect(stageForIndex(2)).toBe(2);
    expect(stageForIndex(19)).toBe(10);
  });

  it('los patrones se desbloquean por grado y el tiempo se achica', () => {
    expect(stageParams(1).patternTypes).toEqual(['arithmetic']);
    expect(stageParams(5).patternTypes).toEqual(['arithmetic', 'geometric']);
    expect(stageParams(10).patternTypes).toEqual(['arithmetic', 'geometric', 'combined']);
    expect(stageParams(10).secondsPerQuestion).toBeLessThan(stageParams(1).secondsPerQuestion);
    expect(stageParams(10).secondsPerQuestion).toBeGreaterThanOrEqual(4);
  });

  it('la sesión progresiva es determinística y anota el grado', () => {
    const session = generateSession('progressive', SEED);
    expect(session).toHaveLength(20);
    expect(session.map((q) => q.stage)).toEqual(session.map((_, i) => stageForIndex(i)));
    expect(generateSession('progressive', SEED)).toEqual(session);
  });
});

describe('computeScore', () => {
  const question = (stage: number, seconds: number): SequenceQuestion => ({
    terms: [1, 2, 3],
    answer: 4,
    patternType: 'arithmetic',
    stage,
    seconds,
  });

  it('Tranquilo: punto fijo por acierto, sin bono', () => {
    const questions = [question(1, 0), question(1, 0)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 60_000 },
      { correct: true, responseMs: 5 },
    ];
    expect(computeScore('zen', answers, questions).score).toBe(200);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const questions = [question(1, 10), question(10, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 10_000 },
      { correct: true, responseMs: 10_000 },
    ];
    const { score, metrics } = computeScore('progressive', answers, questions);
    expect(score).toBe(100 + 200);
    expect(metrics.maxStage).toBe(10);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con el modo de la configuración', () => {
    const questions = generateSession('easy', SEED);
    const answers: AnswerRecord[] = questions.map(() => ({ correct: true, responseMs: 1000 }));
    const result = buildResult({ mode: 'easy', seed: SEED }, answers, questions, 60_000, true);
    expect(result.gameId).toBe('number-sequences');
    expect(result.mode).toBe('easy');
    expect(result.metrics.correct).toBe(questions.length);
  });
});
