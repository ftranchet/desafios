import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { chance, createRng, pick, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Estimación relámpago" — sin React ni DOM. Decidir rápido
// cuál de dos expresiones vale más. Modos según ADR-007: tres dificultades,
// Tranquilo (sin reloj) y Progresivo (rampa de 10 grados que sube la
// complejidad de las expresiones y achica el tiempo).

export type ExpressionComplexity = 'number' | 'sum' | 'mixed' | 'product';

export interface ModeParams extends Record<string, number | string> {
  complexity: ExpressionComplexity;
  range: number;
  secondsPerRound: number; // 0 = sin límite de tiempo (Tranquilo)
  roundCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { complexity: 'number', range: 50, secondsPerRound: 4, roundCount: 10 },
  medium: { complexity: 'mixed', range: 30, secondsPerRound: 3.5, roundCount: 12 },
  hard: { complexity: 'product', range: 15, secondsPerRound: 2.5, roundCount: 15 },
  // Tranquilo: contenido medio, sin reloj (ADR-007).
  zen: { complexity: 'mixed', range: 30, secondsPerRound: 0, roundCount: 10 },
};

export const PROGRESSIVE_PARAMS: ModeParams = {
  // Metadatos del modo; los parámetros reales salen de stageParams por grado.
  complexity: 'product',
  range: 15,
  secondsPerRound: 4,
  roundCount: 20,
};

const PROGRESSIVE_ROUND_COUNT = 20;
const MIN_SECONDS_PER_ROUND = 2;

/**
 * Parámetros de un grado del progresivo: la complejidad se desbloquea por
 * grado (número → suma → mixto → producto) y el tiempo interpola
 * Fácil→Difícil con extrapolación en 9–10 (ADR-007).
 */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const complexity: ExpressionComplexity =
    stage <= 3 ? 'number' : stage <= 5 ? 'sum' : stage <= 7 ? 'mixed' : 'product';
  const range =
    complexity === 'number' ? 50 : complexity === 'product' ? Math.round(lerp(12, 15, t)) : 30;
  return {
    complexity,
    range,
    secondsPerRound: Math.max(
      MIN_SECONDS_PER_ROUND,
      lerp(MODE_PARAMS.easy.secondsPerRound, MODE_PARAMS.hard.secondsPerRound, t),
    ),
    roundCount: PROGRESSIVE_ROUND_COUNT,
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface Expression {
  label: string;
  value: number;
}

export interface Round {
  left: Expression;
  right: Expression;
  stage: number; // Grado del modo progresivo; 1 en el resto
  seconds: number; // Tiempo para elegir; 0 = sin límite (Tranquilo)
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

function generateRound(params: ModeParams, stage: number, rng: Rng): Round {
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
  return { left, right, stage, seconds: params.secondsPerRound };
}

/** Grado de la ronda i del modo progresivo: sube uno cada dos rondas. */
export function stageForIndex(index: number): number {
  return Math.min(PROGRESSIVE_STAGES, Math.floor(index / 2) + 1);
}

export function generateSession(mode: ModeId, seed: number): Round[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_ROUND_COUNT }, (_, i) => {
      const stage = stageForIndex(i);
      return generateRound(stageParams(stage), stage, rng);
    });
  }
  const params = getModeParams(mode);
  return Array.from({ length: params.roundCount }, () => generateRound(params, 1, rng));
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
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  answers: AnswerRecord[],
  rounds: Round[],
): { score: number; metrics: EstimateMetrics } {
  let score = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let maxStage = 0;
  const responseTimes: number[] = [];

  answers.forEach((answer, i) => {
    if (!answer.correct) {
      currentStreak = 0;
      return;
    }
    currentStreak += 1;
    bestStreak = Math.max(bestStreak, currentStreak);
    const round = rounds[i];
    if (!round) return;
    maxStage = Math.max(maxStage, round.stage);

    if (mode === 'zen') {
      // Tranquilo: sin reloj, sin bono de tiempo — un punto fijo por acierto.
      score += BASE_POINTS;
      return;
    }

    const totalMs = round.seconds * 1000;
    const responseMs = answer.responseMs ?? totalMs;
    responseTimes.push(responseMs);
    const remainingFraction = totalMs > 0 ? Math.max(0, (totalMs - responseMs) / totalMs) : 0;
    const base = BASE_POINTS + Math.round(remainingFraction * MAX_TIME_BONUS);
    // Progresivo: el grado multiplica — llegar lejos vale más (ADR-007).
    const stageMultiplier = 1 + (round.stage - 1) / 9;
    score += Math.round(base * stageMultiplier);
  });

  const correct = answers.filter((a) => a.correct).length;
  const incorrect = answers.length - correct;
  const avgResponseMs =
    responseTimes.length === 0
      ? 0
      : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

  return { score, metrics: { correct, incorrect, bestStreak, avgResponseMs, maxStage } };
}

export function buildResult(
  config: GameConfig,
  answers: AnswerRecord[],
  rounds: Round[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const { score, metrics } = computeScore(config.mode, answers, rounds);
  return {
    gameId: 'quick-estimate',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
