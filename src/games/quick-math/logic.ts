import type { GameConfig, GameResult } from '../../core/contract';
import { createRng, pick, randomInt } from '../../core/random';

// Lógica pura del juego "Aritmética contra reloj" — sin React ni DOM.
// Responder operaciones antes de que se acabe el tiempo de cada pregunta.

export type Operation = '+' | '-' | '*' | '/';

export interface LevelParams {
  operations: Operation[];
  addSubMin: number;
  addSubMax: number;
  mulDivMax: number; // factores de multiplicación/división van de 2 a este valor
  secondsPerQuestion: number;
  questionCount: number;
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Fácil',
  2: 'Medio',
  3: 'Difícil',
  4: 'Avanzado',
  5: 'Experto',
};

export const LEVEL_PARAMS: Record<1 | 2 | 3 | 4 | 5, LevelParams> = {
  1: {
    operations: ['+'],
    addSubMin: 1,
    addSubMax: 20,
    mulDivMax: 6,
    secondsPerQuestion: 10,
    questionCount: 10,
  },
  2: {
    operations: ['+', '-'],
    addSubMin: 1,
    addSubMax: 30,
    mulDivMax: 8,
    secondsPerQuestion: 9,
    questionCount: 10,
  },
  3: {
    operations: ['+', '-', '*'],
    addSubMin: 1,
    addSubMax: 50,
    mulDivMax: 12,
    secondsPerQuestion: 8,
    questionCount: 12,
  },
  4: {
    operations: ['+', '-', '*', '/'],
    addSubMin: 1,
    addSubMax: 60,
    mulDivMax: 12,
    secondsPerQuestion: 7,
    questionCount: 12,
  },
  5: {
    operations: ['+', '-', '*', '/'],
    addSubMin: 10,
    addSubMax: 99,
    mulDivMax: 12,
    secondsPerQuestion: 6,
    questionCount: 15,
  },
};

export function getLevelParams(level: number): LevelParams {
  const params = LEVEL_PARAMS[level as 1 | 2 | 3 | 4 | 5];
  if (!params) throw new Error(`Nivel inválido: ${level}`);
  return params;
}

export interface Question {
  a: number;
  b: number;
  op: Operation;
  answer: number;
}

export function generateQuestion(level: number, rng: () => number): Question {
  const params = getLevelParams(level);
  const op = pick(rng, params.operations);

  switch (op) {
    case '+': {
      const a = randomInt(rng, params.addSubMin, params.addSubMax);
      const b = randomInt(rng, params.addSubMin, params.addSubMax);
      return { a, b, op, answer: a + b };
    }
    case '-': {
      const x = randomInt(rng, params.addSubMin, params.addSubMax);
      const y = randomInt(rng, params.addSubMin, params.addSubMax);
      const a = Math.max(x, y);
      const b = Math.min(x, y);
      return { a, b, op, answer: a - b };
    }
    case '*': {
      const a = randomInt(rng, 2, params.mulDivMax);
      const b = randomInt(rng, 2, params.mulDivMax);
      return { a, b, op, answer: a * b };
    }
    case '/': {
      const b = randomInt(rng, 2, params.mulDivMax);
      const answer = randomInt(rng, 2, params.mulDivMax);
      return { a: b * answer, b, op, answer };
    }
  }
}

export function generateSession(level: number, seed: number): Question[] {
  const params = getLevelParams(level);
  const rng = createRng(seed);
  const questions: Question[] = [];
  for (let i = 0; i < params.questionCount; i += 1) {
    questions.push(generateQuestion(level, rng));
  }
  return questions;
}

export interface AnswerRecord {
  correct: boolean;
  responseMs: number | null; // null = venció el tiempo sin responder
}

const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

export interface QuickMathMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  avgResponseMs: number;
}

export function computeScore(
  answers: AnswerRecord[],
  secondsPerQuestion: number,
): { score: number; metrics: QuickMathMetrics } {
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
  const params = getLevelParams(config.level);
  const { score, metrics } = computeScore(answers, params.secondsPerQuestion);
  return {
    gameId: 'quick-math',
    level: config.level,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
