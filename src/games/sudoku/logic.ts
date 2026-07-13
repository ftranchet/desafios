import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, pick } from '../../core/random';
import { PUZZLES_BY_TIER, type SudokuPuzzle } from './puzzles';

// Lógica pura de "Sudoku" — sin React ni DOM. El clásico 9×9: completar la
// grilla sin repetir dígito en ninguna fila, columna ni caja de 3×3. Generar
// puzzles con solución única en vivo es difícil de garantizar (PRD sección
// 16), así que v1 usa un banco precargado y verificado (puzzles.ts) en vez
// de un generador propio — mismo patrón que el diccionario de Palabra del
// día. Ronda única de pensamiento, como Cifras: no declara Progresivo.

export type Tier = 'easy' | 'medium' | 'hard' | 'zen';

export interface ModeParams extends Record<string, number> {
  givens: number; // cantidad aproximada de celdas reveladas (la palanca de dificultad)
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<Tier, ModeParams> = {
  easy: { givens: 40 },
  medium: { givens: 32 },
  hard: { givens: 25 },
  // Tranquilo: dificultad suave, sin puntaje por eficiencia (ADR-007).
  zen: { givens: 36 },
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

export function selectPuzzle(mode: ModeId, seed: number): SudokuPuzzle {
  const bank = PUZZLES_BY_TIER[tierFor(mode)];
  return pick(createRng(seed), bank);
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
  const { puzzle, solution } = selectPuzzle(mode, seed);
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
const EASY_CELLS_TO_FILL = 81 - MODE_PARAMS.easy.givens;

function computeScore(mode: ModeId, state: GameState): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const cellsToFill = state.puzzle.filter((v) => v === 0).length;
  const sizeWeight = cellsToFill / EASY_CELLS_TO_FILL;
  const efficiency = Math.max(MIN_EFFICIENCY, 1 - state.mistakes * MISTAKE_PENALTY);
  return Math.round(BASE_POINTS * sizeWeight * efficiency);
}

export interface SudokuMetrics extends Record<string, number> {
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
  const cellsFilled = state.board.filter((v) => v !== null).length - (81 - cellsToFill);
  return {
    gameId: 'sudoku',
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
