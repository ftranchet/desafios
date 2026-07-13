import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, randomInt } from '../../core/random';

// Lógica pura de "Buscaminas" — sin React ni DOM. Descubrí todas las celdas
// sin minas; una celda descubierta muestra cuántas minas hay en sus 8
// vecinas (0 revela en cascada las vecinas, como el clásico). El primer
// toque siempre es seguro: las minas recién se colocan después de conocerlo,
// evitando esa celda y sus vecinas — así el primer toque nunca termina la
// partida ni deja un tablero trivial. Sin Progresivo, a propósito (ADR-007):
// como Sudoku, Nonograma y Empuja cajas, es una ronda única de pensamiento.
//
// Nota sobre RNF-04: el tamaño de grilla se topa bajo (6×6 a 9×9, no el
// clásico 9×9/16×16/16×30 de escritorio) para que las celdas nunca bajen de
// los 44 px mínimos en un celular angosto; la dificultad sube por densidad de
// minas, no por agrandar la grilla más allá de eso.
//
// Tranquilo (ADR-007, "sin game over"): tocar una mina no termina la sesión
// —se arma un tablero nuevo y se sigue, como el respawn de Serpiente— hasta
// que el jugador toca "Terminar".

export interface ModeParams extends Record<string, number> {
  rows: number;
  cols: number;
  mineCount: number;
}

export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { rows: 6, cols: 6, mineCount: 5 },
  medium: { rows: 8, cols: 8, mineCount: 10 },
  hard: { rows: 9, cols: 9, mineCount: 16 },
  // Tranquilo: densidad suave, sin reloj ni game over (ADR-007).
  zen: { rows: 7, cols: 7, mineCount: 7 },
};

export function getModeParams(mode: ModeId): ModeParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

function neighborsOf(rows: number, cols: number, index: number): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push(nr * cols + nc);
    }
  }
  return result;
}

export type CellStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  mode: ModeId;
  rows: number;
  cols: number;
  mineCount: number;
  seed: number; // para armar un tablero nuevo determinístico (Tranquilo, tras tocar una mina)
  generated: boolean; // las minas recién se colocan en el primer toque
  mines: boolean[];
  neighborCounts: number[]; // -1 en las minas, 0-8 en el resto
  revealed: boolean[];
  flagged: boolean[];
  revealedSafeCount: number;
  status: CellStatus;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  const { rows, cols, mineCount } = getModeParams(mode);
  const total = rows * cols;
  return {
    mode,
    rows,
    cols,
    mineCount,
    seed,
    generated: false,
    mines: new Array(total).fill(false),
    neighborCounts: new Array(total).fill(0),
    revealed: new Array(total).fill(false),
    flagged: new Array(total).fill(false),
    revealedSafeCount: 0,
    status: 'playing',
  };
}

/** Coloca las minas evitando `firstClick` y sus vecinas, para que el primer toque siempre sea seguro. */
function generateBoard(state: GameState, firstClickIndex: number): GameState {
  const { rows, cols, mineCount, seed } = state;
  const total = rows * cols;
  const avoid = new Set([firstClickIndex, ...neighborsOf(rows, cols, firstClickIndex)]);
  const rng = createRng(seed);

  const candidates: number[] = [];
  for (let i = 0; i < total; i += 1) if (!avoid.has(i)) candidates.push(i);
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = tmp;
  }

  const mines = new Array(total).fill(false);
  candidates.slice(0, mineCount).forEach((index) => {
    mines[index] = true;
  });

  const neighborCounts = new Array(total).fill(0);
  for (let i = 0; i < total; i += 1) {
    neighborCounts[i] = mines[i] ? -1 : neighborsOf(rows, cols, i).filter((n) => mines[n]).length;
  }

  return { ...state, generated: true, mines, neighborCounts };
}

function floodReveal(state: GameState, startIndex: number): { revealed: boolean[]; revealedSafeCount: number } {
  const revealed = [...state.revealed];
  let revealedSafeCount = state.revealedSafeCount;
  const stack = [startIndex];

  while (stack.length > 0) {
    const index = stack.pop()!;
    if (revealed[index] || state.flagged[index]) continue;
    revealed[index] = true;
    revealedSafeCount += 1;
    if (state.neighborCounts[index] === 0) {
      for (const neighbor of neighborsOf(state.rows, state.cols, index)) {
        if (!revealed[neighbor] && !state.mines[neighbor]) stack.push(neighbor);
      }
    }
  }
  return { revealed, revealedSafeCount };
}

/** Descubre una celda; si tiene 0 minas vecinas, revela en cascada. */
export function reveal(state: GameState, index: number): GameState {
  if (state.status !== 'playing' || state.flagged[index] || state.revealed[index]) return state;

  const current = state.generated ? state : generateBoard(state, index);

  if (current.mines[index]) {
    if (current.mode === 'zen') {
      // Tranquilo: como el respawn de Serpiente, un tablero nuevo en vez de terminar la sesión.
      return createInitialState('zen', current.seed + 1);
    }
    const revealed = [...current.revealed];
    revealed[index] = true;
    return { ...current, revealed, status: 'lost' };
  }

  const { revealed, revealedSafeCount } = floodReveal(current, index);
  const total = current.rows * current.cols;
  const won = revealedSafeCount === total - current.mineCount;
  return { ...current, revealed, revealedSafeCount, status: won ? 'won' : 'playing' };
}

/** Marca o desmarca una celda con una bandera (no se puede descubrir una celda marcada). */
export function toggleFlag(state: GameState, index: number): GameState {
  if (state.status !== 'playing' || state.revealed[index]) return state;
  const flagged = [...state.flagged];
  flagged[index] = !flagged[index];
  return { ...state, flagged };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;
const MAX_EFFICIENCY = 1.5;
const LOSS_CREDIT_FRACTION = 0.3; // crédito parcial por avance al perder, no cero directo
const EASY_MINE_COUNT = MODE_PARAMS.easy.mineCount;

// Referencia de "buen tiempo" por dificultad — no un mínimo teórico, solo el
// punto donde el bono de velocidad es completo (igual criterio que
// scrambleMoves en Apagá todo: una referencia razonable, no la óptima).
const PAR_SECONDS: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 45,
  medium: 120,
  hard: 240,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeScore(mode: ModeId, state: GameState, durationMs: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)

  const total = state.rows * state.cols - state.mineCount;
  const progressFraction = total > 0 ? state.revealedSafeCount / total : 0;

  if (state.status !== 'won') {
    return Math.round(BASE_POINTS * LOSS_CREDIT_FRACTION * progressFraction);
  }

  const parMs = (PAR_SECONDS[mode as keyof typeof PAR_SECONDS] ?? PAR_SECONDS.medium) * 1000;
  const efficiency = clamp(parMs / Math.max(durationMs, 1), MIN_EFFICIENCY, MAX_EFFICIENCY);
  const sizeWeight = state.mineCount / EASY_MINE_COUNT;
  return Math.round(BASE_POINTS * sizeWeight * efficiency);
}

export interface MinesweeperMetrics extends Record<string, number> {
  revealedSafeCount: number;
  totalSafeCells: number;
  mineCount: number;
  won: number; // 1 o 0 — GameResult.metrics exige valores numéricos
}

export function buildResult(config: GameConfig, state: GameState, durationMs: number): GameResult {
  return {
    gameId: 'minesweeper',
    mode: config.mode,
    score: computeScore(config.mode, state, durationMs),
    completed: true,
    durationMs,
    metrics: {
      revealedSafeCount: state.revealedSafeCount,
      totalSafeCells: state.rows * state.cols - state.mineCount,
      mineCount: state.mineCount,
      won: state.status === 'won' ? 1 : 0,
    },
    timestamp: new Date().toISOString(),
  };
}
