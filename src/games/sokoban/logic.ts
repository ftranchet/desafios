import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, pick } from '../../core/random';
import { LEVELS_BY_TIER, type SokobanLevel } from './puzzles';

// Lógica pura de "Empuja cajas" (Sokoban) — sin React ni DOM. Movete en las
// 4 direcciones; si hay una caja en el camino, se empuja un paso más allá
// (si no hay pared ni otra caja bloqueando). Objetivo: todas las cajas sobre
// una celda objetivo. Como Sudoku y Nonograma, generar un nivel al azar y
// garantizar que sea resoluble es difícil (Sokoban es PSPACE-completo en
// general, PRD sección 16): v1 usa un banco de niveles precargados y
// verificados con un solver de BFS (puzzles.ts). Ronda única de pensamiento:
// no declara Progresivo. Empujar una caja a un rincón sin objetivo puede
// dejar el nivel sin solución — por eso hay un botón de reinicio, no un
// detector de puntos muertos.

export type Direction = 'up' | 'down' | 'left' | 'right';

const DELTA: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

export interface LevelDef {
  rows: number;
  cols: number;
  walls: boolean[];
  goals: number[];
  boxesStart: number[];
  playerStart: number;
  parMoves: number;
}

const WALL = '#';
const GOAL = '.';
const BOX = '$';
const BOX_ON_GOAL = '*';
const PLAYER = '@';
const PLAYER_ON_GOAL = '+';

/** Convierte la notación clásica de Sokoban (XSB) en la estructura de datos del juego. */
export function parseLevel(level: SokobanLevel): LevelDef {
  const { map, parMoves } = level;
  const rows = map.length;
  const cols = Math.max(...map.map((row) => row.length));
  const walls: boolean[] = [];
  const goals: number[] = [];
  const boxesStart: number[] = [];
  let playerStart = -1;

  for (let r = 0; r < rows; r += 1) {
    const line = map[r]!.padEnd(cols, ' ');
    for (let c = 0; c < cols; c += 1) {
      const ch = line[c];
      const index = r * cols + c;
      walls.push(ch === WALL);
      if (ch === GOAL || ch === BOX_ON_GOAL || ch === PLAYER_ON_GOAL) goals.push(index);
      if (ch === BOX || ch === BOX_ON_GOAL) boxesStart.push(index);
      if (ch === PLAYER || ch === PLAYER_ON_GOAL) playerStart = index;
    }
  }
  return { rows, cols, walls, goals, boxesStart, playerStart, parMoves };
}

export interface ModeParams extends Record<string, number> {
  boxCount: number; // solo informativo (selección de modo); el nivel real sale del banco
}

// easy/medium/hard equivalen a 1/2/3 cajas.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { boxCount: 1 },
  medium: { boxCount: 2 },
  hard: { boxCount: 3 },
  zen: { boxCount: 2 },
};

export function getModeParams(mode: ModeId): ModeParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

function tierFor(mode: ModeId): 'easy' | 'medium' | 'hard' | 'zen' {
  if (mode === 'easy' || mode === 'medium' || mode === 'hard' || mode === 'zen') return mode;
  throw new Error(`Modo no soportado: ${mode}`);
}

export function selectLevel(mode: ModeId, seed: number): LevelDef {
  const bank = LEVELS_BY_TIER[tierFor(mode)];
  return parseLevel(pick(createRng(seed), bank));
}

function neighborIndex(level: LevelDef, index: number, direction: Direction): number | null {
  const row = Math.floor(index / level.cols);
  const col = index % level.cols;
  const { dr, dc } = DELTA[direction];
  const nextRow = row + dr;
  const nextCol = col + dc;
  if (nextRow < 0 || nextRow >= level.rows || nextCol < 0 || nextCol >= level.cols) return null;
  return nextRow * level.cols + nextCol;
}

function isSolved(level: LevelDef, boxes: readonly number[]): boolean {
  const goalSet = new Set(level.goals);
  return boxes.every((box) => goalSet.has(box));
}

export interface GameState {
  level: LevelDef;
  playerPos: number;
  boxes: number[];
  moves: number;
  done: boolean;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  const level = selectLevel(mode, seed);
  return { level, playerPos: level.playerStart, boxes: [...level.boxesStart], moves: 0, done: false };
}

/** Mueve al jugador una celda; si hay una caja en el camino, la empuja un paso más allá. */
export function move(state: GameState, direction: Direction): GameState {
  if (state.done) return state;
  const { level } = state;
  const target = neighborIndex(level, state.playerPos, direction);
  if (target === null || level.walls[target]) return state;

  const boxIndex = state.boxes.indexOf(target);
  if (boxIndex === -1) {
    return { ...state, playerPos: target, moves: state.moves + 1 };
  }

  const beyond = neighborIndex(level, target, direction);
  if (beyond === null || level.walls[beyond] || state.boxes.includes(beyond)) return state;

  const boxes = [...state.boxes];
  boxes[boxIndex] = beyond;
  const moves = state.moves + 1;
  return { ...state, playerPos: target, boxes, moves, done: isSolved(level, boxes) };
}

/** Reinicia el nivel actual desde cero (empujar una caja a un rincón puede dejarlo sin solución). */
export function resetLevel(state: GameState): GameState {
  const { level } = state;
  return { level, playerPos: level.playerStart, boxes: [...level.boxesStart], moves: 0, done: false };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;
const EASY_BOX_COUNT = MODE_PARAMS.easy.boxCount;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeScore(mode: ModeId, state: GameState): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const { level, moves } = state;
  // parMoves es el óptimo exacto (verificado con BFS, puzzles.ts): nunca se
  // puede hacer mejor, así que la eficiencia se topa en 1.
  const efficiency = clamp(level.parMoves / Math.max(moves, level.parMoves), MIN_EFFICIENCY, 1);
  const sizeWeight = level.boxesStart.length / EASY_BOX_COUNT;
  return Math.round(BASE_POINTS * sizeWeight * efficiency);
}

export interface SokobanMetrics extends Record<string, number> {
  moves: number;
  boxCount: number;
  parMoves: number;
}

export function buildResult(
  config: GameConfig,
  state: GameState,
  durationMs: number,
  completed = true,
): GameResult {
  return {
    gameId: 'sokoban',
    mode: config.mode,
    score: computeScore(config.mode, state),
    completed,
    durationMs,
    metrics: {
      moves: state.moves,
      boxCount: state.level.boxesStart.length,
      parMoves: state.level.parMoves,
    },
    timestamp: new Date().toISOString(),
  };
}
