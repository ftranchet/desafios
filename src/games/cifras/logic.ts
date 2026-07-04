import type { GameConfig, GameResult, ModeId } from '../../core/contract';
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

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior (ADR-007).
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', LevelParams> = {
  easy: { largeCount: 1, timeLimitMs: 90_000, targetMin: 100, targetMax: 300 },
  medium: { largeCount: 2, timeLimitMs: 60_000, targetMin: 100, targetMax: 700 },
  hard: { largeCount: 3, timeLimitMs: 45_000, targetMin: 100, targetMax: 999 },
  // Tranquilo: sin límite de tiempo (timeLimitMs 0), contenido medio (ADR-007).
  zen: { largeCount: 2, timeLimitMs: 0, targetMin: 100, targetMax: 700 },
};

export function getModeParams(mode: ModeId): LevelParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
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

export function generatePuzzle(mode: ModeId, seed: number): Puzzle {
  const params = getModeParams(mode);
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
  // Sin límite de tiempo (Tranquilo) no hay bono: evita además el NaN de 0/0.
  const timeBonus =
    exact && timeLimitMs > 0 ? Math.round((clampedRemaining / timeLimitMs) * 200) : 0;

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
  const params = getModeParams(config.mode);
  const { score, metrics } = computeScore(target, achieved, timeRemainingMs, params.timeLimitMs);
  return {
    gameId: 'cifras',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
