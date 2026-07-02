import type { GameConfig, GameResult } from '../../core/contract';
import { chance, createRng, randomInt } from '../../core/random';

// Lógica pura del juego "Tiempo de reacción" — sin React ni DOM (PRD sección 4.2.3).
// Tocar en cuanto la pantalla cambie a un color objetivo; si aparece un color
// señuelo, no hay que tocar. Mide milisegundos de reacción.

export interface LevelParams {
  rounds: number;
  minDelayMs: number;
  maxDelayMs: number;
  decoyChance: number;
  [key: string]: number; // index signature para encajar con DifficultyLevel['params']
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Fácil',
  2: 'Medio',
  3: 'Difícil',
  4: 'Avanzado',
  5: 'Experto',
};

export const LEVEL_PARAMS: Record<1 | 2 | 3 | 4 | 5, LevelParams> = {
  1: { rounds: 5, minDelayMs: 1000, maxDelayMs: 3000, decoyChance: 0 },
  2: { rounds: 6, minDelayMs: 800, maxDelayMs: 2500, decoyChance: 0 },
  3: { rounds: 7, minDelayMs: 600, maxDelayMs: 2200, decoyChance: 0.2 },
  4: { rounds: 8, minDelayMs: 500, maxDelayMs: 2000, decoyChance: 0.35 },
  5: { rounds: 10, minDelayMs: 400, maxDelayMs: 1800, decoyChance: 0.5 },
};

export function getLevelParams(level: number): LevelParams {
  const params = LEVEL_PARAMS[level as 1 | 2 | 3 | 4 | 5];
  if (!params) throw new Error(`Nivel inválido: ${level}`);
  return params;
}

export interface RoundPlan {
  delayMs: number; // Tiempo de espera antes de que cambie el color
  isDecoy: boolean; // true = el cambio es un color señuelo que no hay que tocar
}

export function createRoundPlans(level: number, seed: number): RoundPlan[] {
  const params = getLevelParams(level);
  const rng = createRng(seed);
  const plans: RoundPlan[] = [];
  for (let i = 0; i < params.rounds; i += 1) {
    plans.push({
      delayMs: randomInt(rng, params.minDelayMs, params.maxDelayMs),
      isDecoy: chance(rng, params.decoyChance),
    });
  }
  return plans;
}

export interface RoundOutcome {
  isDecoy: boolean;
  correct: boolean;
  reactionMs: number | null;
}

/**
 * Resuelve una ronda de forma pura.
 * `tapAtMs`: instante del toque relativo al inicio de la ronda, o `null` si no
 * hubo toque (venció el tiempo de la ronda).
 */
export function resolveRoundTap(plan: RoundPlan, tapAtMs: number | null): RoundOutcome {
  if (tapAtMs === null) {
    // Sin toque: correcto si era señuelo (había que ignorarlo), incorrecto si no.
    return { isDecoy: plan.isDecoy, correct: plan.isDecoy, reactionMs: null };
  }

  if (tapAtMs < plan.delayMs) {
    // Falso arranque: tocó antes de que el color cambiara.
    return { isDecoy: plan.isDecoy, correct: false, reactionMs: null };
  }

  const reactionMs = tapAtMs - plan.delayMs;
  return { isDecoy: plan.isDecoy, correct: !plan.isDecoy, reactionMs };
}

const POINTS_PER_HIT_BASE = 1000;
const POINTS_PER_DECOY_AVOIDED = 150;
const PENALTY_PER_MISS = 100;
const PENALTY_PER_DECOY_FAILED = 150;

export interface ReactionTimeMetrics extends Record<string, number> {
  hits: number;
  misses: number;
  decoysAvoided: number;
  decoysFailed: number;
  avgReactionMs: number;
  bestReactionMs: number;
}

export function computeScore(outcomes: RoundOutcome[]): {
  score: number;
  metrics: ReactionTimeMetrics;
} {
  const hitReactionTimes = outcomes
    .filter((o) => !o.isDecoy && o.correct && o.reactionMs !== null)
    .map((o) => o.reactionMs as number);

  const hits = hitReactionTimes.length;
  const misses = outcomes.filter((o) => !o.isDecoy && !o.correct).length;
  const decoysAvoided = outcomes.filter((o) => o.isDecoy && o.correct).length;
  const decoysFailed = outcomes.filter((o) => o.isDecoy && !o.correct).length;

  const hitPoints = hitReactionTimes.reduce(
    (sum, ms) => sum + Math.max(0, POINTS_PER_HIT_BASE - ms),
    0,
  );
  const rawScore =
    hitPoints +
    decoysAvoided * POINTS_PER_DECOY_AVOIDED -
    misses * PENALTY_PER_MISS -
    decoysFailed * PENALTY_PER_DECOY_FAILED;

  const avgReactionMs =
    hits === 0 ? 0 : Math.round(hitReactionTimes.reduce((a, b) => a + b, 0) / hits);
  const bestReactionMs = hits === 0 ? 0 : Math.min(...hitReactionTimes);

  return {
    score: Math.max(0, Math.round(rawScore)),
    metrics: { hits, misses, decoysAvoided, decoysFailed, avgReactionMs, bestReactionMs },
  };
}

export function buildResult(
  config: GameConfig,
  outcomes: RoundOutcome[],
  durationMs: number,
  completed: boolean,
): GameResult {
  const { score, metrics } = computeScore(outcomes);
  return {
    gameId: 'reaction-time',
    level: config.level,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
