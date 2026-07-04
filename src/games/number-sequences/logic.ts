import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, pick, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Secuencias numéricas" — sin React ni DOM. Detectar el
// patrón (aritmético → geométrico → combinado, PRD sección 7) e indicar el
// siguiente término, contra un temporizador por pregunta.

export type PatternType = 'arithmetic' | 'geometric' | 'combined';

export interface LevelParams {
  patternTypes: PatternType[];
  termCount: number;
  secondsPerQuestion: number;
  questionCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior (ADR-007).
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard', LevelParams> = {
  easy: { patternTypes: ['arithmetic'], termCount: 4, secondsPerQuestion: 12, questionCount: 8 },
  medium: {
    patternTypes: ['arithmetic', 'geometric'],
    termCount: 5,
    secondsPerQuestion: 10,
    questionCount: 10,
  },
  hard: {
    patternTypes: ['arithmetic', 'geometric', 'combined'],
    termCount: 6,
    secondsPerQuestion: 8,
    questionCount: 12,
  },
};

export function getModeParams(mode: ModeId): LevelParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface SequenceQuestion {
  terms: number[];
  answer: number;
  patternType: PatternType;
}

function generateArithmetic(termCount: number, rng: Rng): SequenceQuestion {
  const start = randomInt(rng, -10, 10);
  let step = randomInt(rng, -8, 8);
  if (step === 0) step = 1;
  const terms = Array.from({ length: termCount }, (_, i) => start + i * step);
  return { terms, answer: start + termCount * step, patternType: 'arithmetic' };
}

function generateGeometric(termCount: number, rng: Rng): SequenceQuestion {
  const start = randomInt(rng, 2, 6);
  const ratio = randomInt(rng, 2, 3);
  const terms: number[] = [];
  let value = start;
  for (let i = 0; i < termCount; i += 1) {
    terms.push(value);
    value *= ratio;
  }
  return { terms, answer: value, patternType: 'geometric' };
}

function generateCombined(termCount: number, rng: Rng): SequenceQuestion {
  const stepA = randomInt(rng, 1, 6);
  const stepB = -randomInt(rng, 1, 6);
  const start = randomInt(rng, -5, 15);
  const terms: number[] = [start];
  let value = start;
  for (let i = 1; i < termCount; i += 1) {
    value += i % 2 === 1 ? stepA : stepB;
    terms.push(value);
  }
  const nextStep = termCount % 2 === 1 ? stepA : stepB;
  return { terms, answer: value + nextStep, patternType: 'combined' };
}

export function generateSequence(mode: ModeId, rng: Rng): SequenceQuestion {
  const params = getModeParams(mode);
  const patternType = pick(rng, params.patternTypes);
  switch (patternType) {
    case 'arithmetic':
      return generateArithmetic(params.termCount, rng);
    case 'geometric':
      return generateGeometric(params.termCount, rng);
    case 'combined':
      return generateCombined(params.termCount, rng);
  }
}

export function generateSession(mode: ModeId, seed: number): SequenceQuestion[] {
  const params = getModeParams(mode);
  const rng = createRng(seed);
  const questions: SequenceQuestion[] = [];
  for (let i = 0; i < params.questionCount; i += 1) {
    questions.push(generateSequence(mode, rng));
  }
  return questions;
}

export interface AnswerRecord {
  correct: boolean;
  responseMs: number | null; // null = venció el tiempo sin responder
}

const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

export interface SequenceMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  avgResponseMs: number;
}

export function computeScore(
  answers: AnswerRecord[],
  secondsPerQuestion: number,
): { score: number; metrics: SequenceMetrics } {
  const totalMs = secondsPerQuestion * 1000;
  let score = 0;
  const responseTimes: number[] = [];

  for (const answer of answers) {
    if (!answer.correct) continue;
    const responseMs = answer.responseMs ?? totalMs;
    responseTimes.push(responseMs);
    const remainingFraction = Math.max(0, (totalMs - responseMs) / totalMs);
    score += BASE_POINTS + Math.round(remainingFraction * MAX_TIME_BONUS);
  }

  const correct = answers.filter((a) => a.correct).length;
  const incorrect = answers.length - correct;
  const avgResponseMs =
    responseTimes.length === 0
      ? 0
      : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

  return { score, metrics: { correct, incorrect, avgResponseMs } };
}

export function buildResult(
  config: GameConfig,
  answers: AnswerRecord[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const params = getModeParams(config.mode);
  const { score, metrics } = computeScore(answers, params.secondsPerQuestion);
  return {
    gameId: 'number-sequences',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
