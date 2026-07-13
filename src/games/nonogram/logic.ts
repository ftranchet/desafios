import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, pick } from '../../core/random';
import { IMAGES_BY_TIER, type NonogramImage } from './puzzles';

// Lógica pura de "Nonograma" (Picross) — sin React ni DOM. Pintar celdas
// según pistas numéricas de fila y columna hasta revelar el dibujo. Como
// Sudoku, garantizar solución única generando en vivo es difícil (PRD
// sección 16): v1 usa un banco de imágenes precargadas y verificadas con un
// solver de propagación + backtracking (puzzles.ts). Ronda única de
// pensamiento, como Cifras y Sudoku: no declara Progresivo.

export type Tier = 'easy' | 'medium' | 'hard' | 'zen';

export interface ModeParams extends Record<string, number> {
  cellCount: number; // filas × columnas — la palanca de dificultad
}

export const MODE_PARAMS: Record<Tier, ModeParams> = {
  easy: { cellCount: 25 }, // 5x5
  medium: { cellCount: 64 }, // 8x8
  hard: { cellCount: 100 }, // 10x10
  zen: { cellCount: 36 }, // 6x6, dificultad suave (ADR-007)
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

export function selectImage(mode: ModeId, seed: number): NonogramImage {
  const bank = IMAGES_BY_TIER[tierFor(mode)];
  return pick(createRng(seed), bank);
}

/** Pistas de una línea (fila o columna): largos de las rachas consecutivas de celdas pintadas. */
export function cluesForLine(line: readonly number[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell === 1) {
      run += 1;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues;
}

export interface Clues {
  rowClues: number[][];
  colClues: number[][];
}

export function computeClues(image: readonly number[], rows: number, cols: number): Clues {
  const rowClues: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    rowClues.push(cluesForLine(image.slice(r * cols, r * cols + cols)));
  }
  const colClues: number[][] = [];
  for (let c = 0; c < cols; c += 1) {
    const col: number[] = [];
    for (let r = 0; r < rows; r += 1) col.push(image[r * cols + c]!);
    colClues.push(cluesForLine(col));
  }
  return { rowClues, colClues };
}

export interface Puzzle extends NonogramImage, Clues {}

export interface GameState {
  puzzle: Puzzle;
  board: number[]; // rows*cols, estado actual (0 vacía, 1 pintada)
  taps: number;
  done: boolean;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  const image = selectImage(mode, seed);
  const clues = computeClues(image.image, image.rows, image.cols);
  return {
    puzzle: { ...image, ...clues },
    board: new Array(image.rows * image.cols).fill(0),
    taps: 0,
    done: false,
  };
}

/** Pinta o despinta una celda. */
export function toggleCell(state: GameState, index: number): GameState {
  if (state.done) return state;
  const board = [...state.board];
  board[index] = board[index] ? 0 : 1;
  const taps = state.taps + 1;
  const done = board.every((value, i) => value === state.puzzle.image[i]);
  return { ...state, board, taps, done };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;
const EASY_CELL_COUNT = MODE_PARAMS.easy.cellCount;

function computeScore(mode: ModeId, state: GameState): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const filledCount = state.puzzle.image.filter((v) => v === 1).length;
  const efficiency = Math.max(MIN_EFFICIENCY, filledCount / Math.max(state.taps, filledCount));
  const sizeWeight = state.puzzle.image.length / EASY_CELL_COUNT;
  return Math.round(BASE_POINTS * sizeWeight * efficiency);
}

export interface NonogramMetrics extends Record<string, number> {
  taps: number;
  cellCount: number;
  filledCount: number;
}

export function buildResult(
  config: GameConfig,
  state: GameState,
  durationMs: number,
  completed = true,
): GameResult {
  return {
    gameId: 'nonogram',
    mode: config.mode,
    score: computeScore(config.mode, state),
    completed,
    durationMs,
    metrics: {
      taps: state.taps,
      cellCount: state.puzzle.image.length,
      filledCount: state.puzzle.image.filter((v) => v === 1).length,
    },
    timestamp: new Date().toISOString(),
  };
}
