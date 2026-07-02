import type { GameConfig, GameResult } from '../../core/contract';
import { chance, createRng, pick, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Estimación relámpago" — sin React ni DOM. Decidir rápido
// cuál de dos expresiones vale más, contra un temporizador por ronda.

export type ExpressionComplexity = 'number' | 'sum' | 'mixed' | 'product';

export interface LevelParams extends Record<string, number | string> {
  complexity: ExpressionComplexity;
  range: number;
  secondsPerRound: number;
  roundCount: number;
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Fácil',
  2: 'Medio',
  3: 'Difícil',
  4: 'Avanzado',
  5: 'Experto',
};

export const LEVEL_PARAMS: Record<1 | 2 | 3 | 4 | 5, LevelParams> = {
  1: { complexity: 'number', range: 50, secondsPerRound: 4, roundCount: 10 },
  2: { complexity: 'sum', range: 30, secondsPerRound: 4, roundCount: 10 },
  3: { complexity: 'mixed', range: 30, secondsPerRound: 3.5, roundCount: 12 },
  4: { complexity: 'product', range: 12, secondsPerRound: 3, roundCount: 12 },
  5: { complexity: 'product', range: 15, secondsPerRound: 2.5, roundCount: 15 },
};

export function getLevelParams(level: number): LevelParams {
  const params = LEVEL_PARAMS[level as 1 | 2 | 3 | 4 | 5];
  if (!params) throw new Error(`Nivel inválido: ${level}`);
  return params;
}

export interface Expression {
  label: string;
  value: number;
}

export interface Round {
  left: Expression;
  right: Expression;
}

function generateExpression(complexity: ExpressionComplexity, range: number, rng: Rng): Expression {
  switch (complexity) {
    case 'number': {
      const value = randomInt(rng, 1, range);
      return { label: String(value), value };
    }
    case 'sum': {
      const a = randomInt(rng, 1, range);
      const b = randomInt(rng, 1, range);
      return { label: `${a} + ${b}`, value: a + b };
    }
    case 'mixed': {
      const op = pick(rng, ['+', '-'] as const);
      const a = randomInt(rng, 1, range);
      const b = randomInt(rng, 1, range);
      if (op === '+') return { label: `${a} + ${b}`, value: a + b };
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      return { label: `${hi} − ${lo}`, value: hi - lo };
    }
    case 'product': {
      if (chance(rng, 0.5)) {
        const a = randomInt(rng, 2, range);
        const b = randomInt(rng, 2, range);
        return { label: `${a} × ${b}`, value: a * b };
      }
      const a = randomInt(rng, 1, range * 3);
      const b = randomInt(rng, 1, range * 3);
      return { label: `${a} + ${b}`, value: a + b };
    }
  }
}

export function generateRound(level: number, rng: Rng): Round {
  const params = getLevelParams(level);
  const left = generateExpression(params.complexity, params.range, rng);
  let right = generateExpression(params.complexity, params.range, rng);
  let attempts = 0;
  while (left.value === right.value && attempts < 20) {
    right = generateExpression(params.complexity, params.range, rng);
    attempts += 1;
  }
  if (left.value === right.value) {
    // Extremadamente improbable, pero garantiza que nunca haya empate.
    right = { label: `${right.label} + 1`, value: right.value + 1 };
  }
  return { left, right };
}

export function generateSession(level: number, seed: number): Round[] {
  const params = getLevelParams(level);
  const rng = createRng(seed);
  const rounds: Round[] = [];
  for (let i = 0; i < params.roundCount; i += 1) {
    rounds.push(generateRound(level, rng));
  }
  return rounds;
}

export function isCorrectChoice(round: Round, choice: 'left' | 'right'): boolean {
  const chosen = choice === 'left' ? round.left.value : round.right.value;
  const other = choice === 'left' ? round.right.value : round.left.value;
  return chosen > other;
}

export interface AnswerRecord {
  correct: boolean;
  responseMs: number | null; // null = venció el tiempo sin elegir
}

const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

export interface EstimateMetrics extends Record<string, number> {
  correct: number;
  incorrect: number;
  bestStreak: number;
  avgResponseMs: number;
}

export function computeScore(
  answers: AnswerRecord[],
  secondsPerRound: number,
): { score: number; metrics: EstimateMetrics } {
  const totalMs = secondsPerRound * 1000;
  let score = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const responseTimes: number[] = [];

  for (const answer of answers) {
    if (!answer.correct) {
      currentStreak = 0;
      continue;
    }
    currentStreak += 1;
    bestStreak = Math.max(bestStreak, currentStreak);
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

  return { score, metrics: { correct, incorrect, bestStreak, avgResponseMs } };
}

export function buildResult(
  config: GameConfig,
  answers: AnswerRecord[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const params = getLevelParams(config.level);
  const { score, metrics } = computeScore(answers, params.secondsPerRound);
  return {
    gameId: 'quick-estimate',
    level: config.level,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
