import type { GameConfig, GameResult } from '../../core/contract';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura del juego "Cifras" — formato numbers round de Countdown.
// Combinar 6 números (grandes + chicos) con + − × ÷ para llegar lo más
// cerca posible de un objetivo de 3 cifras. Sin React ni DOM.

export type Op = '+' | '-' | '*' | '/';

export interface LevelParams extends Record<string, number> {
  largeCount: number; // cuántos de los 6 números son "grandes" (25/50/75/100)
  timeLimitMs: number;
  targetMin: number;
  targetMax: number;
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Fácil',
  2: 'Medio',
  3: 'Difícil',
  4: 'Avanzado',
  5: 'Experto',
};

export const LEVEL_PARAMS: Record<1 | 2 | 3 | 4 | 5, LevelParams> = {
  1: { largeCount: 1, timeLimitMs: 90_000, targetMin: 100, targetMax: 300 },
  2: { largeCount: 1, timeLimitMs: 75_000, targetMin: 100, targetMax: 500 },
  3: { largeCount: 2, timeLimitMs: 60_000, targetMin: 100, targetMax: 700 },
  4: { largeCount: 2, timeLimitMs: 50_000, targetMin: 100, targetMax: 999 },
  5: { largeCount: 3, timeLimitMs: 45_000, targetMin: 100, targetMax: 999 },
};

export function getLevelParams(level: number): LevelParams {
  const params = LEVEL_PARAMS[level as 1 | 2 | 3 | 4 | 5];
  if (!params) throw new Error(`Nivel inválido: ${level}`);
  return params;
}

const LARGE_POOL = [25, 50, 75, 100];
// Dos copias de cada número del 1 al 10, como en el juego original.
const SMALL_POOL = Array.from({ length: 10 }, (_, i) => i + 1).flatMap((n) => [n, n]);

function drawWithoutReplacement(rng: Rng, pool: number[], count: number): number[] {
  const working = [...pool];
  const drawn: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = randomInt(rng, 0, working.length - 1);
    drawn.push(working[index] as number);
    working.splice(index, 1);
  }
  return drawn;
}

export interface Puzzle {
  numbers: number[];
  target: number;
}

export function generatePuzzle(level: number, seed: number): Puzzle {
  const params = getLevelParams(level);
  const rng = createRng(seed);
  const large = drawWithoutReplacement(rng, LARGE_POOL, params.largeCount);
  const small = drawWithoutReplacement(rng, SMALL_POOL, 6 - params.largeCount);
  const numbers = drawWithoutReplacement(rng, [...large, ...small], 6); // mezcla el orden
  const target = randomInt(rng, params.targetMin, params.targetMax);
  return { numbers, target };
}

/**
 * Combina dos números con un operador. Siempre resta/divide el mayor por el
 * menor (el jugador no elige el orden). Devuelve `null` si el resultado no
 * es un entero positivo — la regla estándar del juego original.
 */
export function combine(x: number, y: number, op: Op): number | null {
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b > 0 ? a - b : null;
    case '*':
      return a * b;
    case '/':
      return b !== 0 && a % b === 0 && a / b > 0 ? a / b : null;
  }
}

export function closestToTarget(values: number[], target: number): number {
  const first = values[0];
  if (first === undefined) {
    // En la práctica siempre hay al menos una ficha; el guard evita el TypeError
    // de reduce() sobre un array vacío y satisface noUncheckedIndexedAccess.
    throw new Error('closestToTarget: no se puede elegir de una lista vacía');
  }
  return values.reduce(
    (best, current) => (Math.abs(target - current) < Math.abs(target - best) ? current : best),
    first,
  );
}

export interface CifrasMetrics extends Record<string, number> {
  distance: number;
  exact: number; // 0 | 1 — Record<string, number> no admite boolean
  timeRemainingMs: number;
}

export function computeScore(
  target: number,
  achieved: number,
  timeRemainingMs: number,
  timeLimitMs: number,
): { score: number; metrics: CifrasMetrics } {
  const distance = Math.abs(target - achieved);
  const exact = distance === 0;

  let base = 0;
  if (distance === 0) base = 1000;
  else if (distance <= 5) base = 700;
  else if (distance <= 10) base = 400;
  else if (distance <= 25) base = 150;

  const clampedRemaining = Math.max(0, timeRemainingMs);
  const timeBonus = exact ? Math.round((clampedRemaining / timeLimitMs) * 200) : 0;

  return {
    score: base + timeBonus,
    metrics: { distance, exact: exact ? 1 : 0, timeRemainingMs: Math.round(clampedRemaining) },
  };
}

export function buildResult(
  config: GameConfig,
  target: number,
  achieved: number,
  timeRemainingMs: number,
  durationMs: number,
  completed: boolean,
): GameResult {
  const params = getLevelParams(config.level);
  const { score, metrics } = computeScore(target, achieved, timeRemainingMs, params.timeLimitMs);
  return {
    gameId: 'cifras',
    level: config.level,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
