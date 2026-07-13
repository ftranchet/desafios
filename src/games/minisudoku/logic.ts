import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, type Rng } from '../../core/random';

// Lógica pura de "Minisudoku" — sin React ni DOM. Sudoku 6×6, cajas de 2×3:
// completar la grilla sin repetir dígito 1-6 en fila, columna ni caja.
// Nombre original (PRD 11.2): inspirado en el "Mini Sudoku" de LinkedIn —
// "Sudoku" en sí es un término genérico, no hace falta evitarlo (como el
// Sudoku 9×9 de este catálogo). A diferencia de ese Sudoku 9×9 (banco
// curado: verificar solución única en vivo a 9×9 es caro, PRD sección 16),
// una grilla de 36 celdas es lo bastante chica para generar y verificar
// unicidad en vivo con un solver de backtracking — mismo criterio que el
// verificador de unicidad de Nonograma agregado en la auditoría de julio.
// Ronda única de pensamiento, como Sudoku: no declara Progresivo.

export const SIZE = 6;
export const BOX_ROWS = 2;
export const BOX_COLS = 3;
const CELL_COUNT = SIZE * SIZE;

export type Tier = 'easy' | 'medium' | 'hard' | 'zen';

export interface ModeParams extends Record<string, number> {
  givens: number; // cantidad aproximada de celdas reveladas (la palanca de dificultad)
}

export const MODE_PARAMS: Record<Tier, ModeParams> = {
  easy: { givens: 20 },
  medium: { givens: 16 },
  hard: { givens: 12 },
  // Tranquilo: dificultad suave, sin puntaje por eficiencia (ADR-007).
  zen: { givens: 18 },
};

export function getModeParams(mode: ModeId): ModeParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

function tierFor(mode: ModeId): Tier {
  if (mode === 'easy' || mode === 'medium' || mode === 'hard' || mode === 'zen') return mode;
  throw new Error(`Modo no soportado: ${mode}`);
}

function isValidPlacement(board: (number | null)[], index: number, digit: number): boolean {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  for (let i = 0; i < SIZE; i += 1) {
    if (board[row * SIZE + i] === digit) return false;
    if (board[i * SIZE + col] === digit) return false;
  }
  const boxRowStart = Math.floor(row / BOX_ROWS) * BOX_ROWS;
  const boxColStart = Math.floor(col / BOX_COLS) * BOX_COLS;
  for (let r = 0; r < BOX_ROWS; r += 1) {
    for (let c = 0; c < BOX_COLS; c += 1) {
      if (board[(boxRowStart + r) * SIZE + (boxColStart + c)] === digit) return false;
    }
  }
  return true;
}

/** Cuenta soluciones hasta `limit` (2 alcanza para saber si una grilla es única). */
export function countSolutions(given: readonly (number | null)[], limit = 2): number {
  const board = given.slice();
  let count = 0;

  function backtrack(pos: number): void {
    if (count >= limit) return;
    if (pos === CELL_COUNT) {
      count += 1;
      return;
    }
    if (board[pos] !== null) {
      backtrack(pos + 1);
      return;
    }
    for (let digit = 1; digit <= SIZE; digit += 1) {
      if (isValidPlacement(board, pos, digit)) {
        board[pos] = digit;
        backtrack(pos + 1);
        board[pos] = null;
        if (count >= limit) return;
      }
    }
  }
  backtrack(0);
  return count;
}

function shuffledDigits(rng: Rng): number[] {
  const digits = [1, 2, 3, 4, 5, 6];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j]!, digits[i]!];
  }
  return digits;
}

function generateSolution(rng: Rng): number[] {
  const board: (number | null)[] = new Array(CELL_COUNT).fill(null);

  function backtrack(pos: number): boolean {
    if (pos === CELL_COUNT) return true;
    for (const digit of shuffledDigits(rng)) {
      if (isValidPlacement(board, pos, digit)) {
        board[pos] = digit;
        if (backtrack(pos + 1)) return true;
        board[pos] = null;
      }
    }
    return false;
  }

  backtrack(0);
  return board as number[];
}

export interface MinisudokuPuzzle {
  puzzle: readonly number[]; // 0 = celda vacía
  solution: readonly number[];
}

/**
 * Genera un Minisudoku en vivo: arma una solución completa y quita celdas de
 * a una (orden al azar), conservando cada remoción solo si la grilla sigue
 * teniendo solución única — nunca llega a un puzzle ambiguo. `givens` es un
 * techo aproximado (PRD sección 16 aplicado en chico): si el algoritmo no
 * encuentra más remociones seguras antes de llegar al número exacto, se
 * queda con el mínimo que sí pudo verificar.
 */
export function generateMinisudoku(mode: ModeId, seed: number): MinisudokuPuzzle {
  const rng = createRng(seed);
  const solution = generateSolution(rng);
  const puzzle: (number | null)[] = solution.slice();

  const order = Array.from({ length: CELL_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  const targetGivens = getModeParams(mode).givens;
  let currentGivens = CELL_COUNT;
  for (const index of order) {
    if (currentGivens <= targetGivens) break;
    const previous = puzzle[index]!;
    puzzle[index] = null;
    if (countSolutions(puzzle, 2) === 1) {
      currentGivens -= 1;
    } else {
      puzzle[index] = previous;
    }
  }

  return {
    puzzle: puzzle.map((v) => v ?? 0),
    solution,
  };
}

export interface GameState {
  mode: ModeId;
  puzzle: readonly number[]; // celdas dadas (0 = vacía), inmutable durante la partida
  solution: readonly number[];
  board: (number | null)[]; // dadas + lo que completó el jugador
  mistakes: number;
  done: boolean;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  tierFor(mode);
  const { puzzle, solution } = generateMinisudoku(mode, seed);
  const board: (number | null)[] = puzzle.map((v) => (v === 0 ? null : v));
  return { mode, puzzle, solution, board, mistakes: 0, done: false };
}

export function isGivenCell(state: GameState, index: number): boolean {
  return state.puzzle[index] !== 0;
}

/** Completa o borra una celda editable. Ignora celdas dadas y toques que no cambian nada. */
export function setCell(state: GameState, index: number, digit: number | null): GameState {
  if (state.done || isGivenCell(state, index)) return state;
  if (state.board[index] === digit) return state;

  const board = [...state.board];
  board[index] = digit;
  const wasWrong = digit !== null && digit !== state.solution[index];
  const mistakes = state.mistakes + (wasWrong ? 1 : 0);
  const done = board.every((value, i) => value === state.solution[i]);

  return { ...state, board, mistakes, done };
}

const BASE_POINTS = 100;
const MISTAKE_PENALTY = 0.05; // cada error resta 5% del puntaje de la ronda
const MIN_EFFICIENCY = 0.2;
const EASY_CELLS_TO_FILL = CELL_COUNT - MODE_PARAMS.easy.givens;

function computeScore(mode: ModeId, state: GameState): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const cellsToFill = state.puzzle.filter((v) => v === 0).length;
  const sizeWeight = cellsToFill / EASY_CELLS_TO_FILL;
  const efficiency = Math.max(MIN_EFFICIENCY, 1 - state.mistakes * MISTAKE_PENALTY);
  return Math.round(BASE_POINTS * sizeWeight * efficiency);
}

export interface MinisudokuMetrics extends Record<string, number> {
  mistakes: number;
  cellsToFill: number;
  cellsFilled: number;
}

export function buildResult(
  config: GameConfig,
  state: GameState,
  durationMs: number,
  completed = true,
): GameResult {
  const cellsToFill = state.puzzle.filter((v) => v === 0).length;
  const cellsFilled = state.board.filter((v) => v !== null).length - (CELL_COUNT - cellsToFill);
  return {
    gameId: 'minisudoku',
    mode: config.mode,
    score: computeScore(config.mode, state),
    completed,
    durationMs,
    metrics: {
      mistakes: state.mistakes,
      cellsToFill,
      cellsFilled,
    },
    timestamp: new Date().toISOString(),
  };
}
