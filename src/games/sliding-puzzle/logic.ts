import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, pick, type Rng } from '../../core/random';

// Lógica pura de "Rompecabezas deslizante" (estilo 15-puzzle) — sin React ni
// DOM. Deslizá las fichas hacia el hueco hasta ordenarlas 1..n²-1. El tablero
// se arma deslizando fichas al azar desde el estado ordenado (evitando
// deshacer el último movimiento, para no desperdiciar mezcla): así queda
// garantizado que siempre es resoluble, sin necesitar detectar la paridad de
// la permutación (el problema clásico de generar un 15-puzzle al azar).
// Modos según ADR-007: tres dificultades (tamaño de tablero y mezcla),
// Tranquilo (varios tableros sin puntaje por eficiencia) y Progresivo (10
// grados). Sin tensión con RNF-04: incluso un tablero de 6×6 deja celdas muy
// por encima de los 44 px mínimos en un celular angosto, así que el tamaño
// crece libremente en vez de toparse como en Apagá todo o Tabla de Schulte.

export interface ModeParams extends Record<string, number> {
  gridSize: number;
  scrambleMoves: number;
}

// easy/medium/hard equivalen al clásico 8-puzzle / 15-puzzle / 24-puzzle.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { gridSize: 3, scrambleMoves: 20 },
  medium: { gridSize: 4, scrambleMoves: 60 }, // el clásico 15-puzzle, 4×4
  hard: { gridSize: 5, scrambleMoves: 120 },
  // Tranquilo: tamaño medio, mezcla suave, varios tableros (ADR-007).
  zen: { gridSize: 4, scrambleMoves: 40 },
};

// Progresivo: metadatos del modo (los parámetros reales por grado salen de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { gridSize: 3, scrambleMoves: 20 };

export const ZEN_ROUND_COUNT = 3;

/** Parámetros de un grado del progresivo: interpola y extrapola Fácil→Difícil sin techo (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    gridSize: Math.round(lerp(easy.gridSize, hard.gridSize, t)),
    scrambleMoves: Math.round(lerp(easy.scrambleMoves, hard.scrambleMoves, t)),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

function solvedBoard(gridSize: number): number[] {
  const board = Array.from({ length: gridSize * gridSize - 1 }, (_, i) => i + 1);
  board.push(0); // 0 = hueco
  return board;
}

/** Índices ortogonalmente adyacentes a `index` dentro de la grilla. */
function neighborsOf(gridSize: number, index: number): number[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const result: number[] = [];
  if (row > 0) result.push(index - gridSize);
  if (row < gridSize - 1) result.push(index + gridSize);
  if (col > 0) result.push(index - 1);
  if (col < gridSize - 1) result.push(index + 1);
  return result;
}

/** Arma un tablero mezclado deslizando fichas al azar desde el estado ordenado (siempre resoluble). */
export function generateBoard(rng: Rng, gridSize: number, scrambleMoves: number): number[] {
  let board = solvedBoard(gridSize);
  let blankIndex = board.length - 1;
  let previousBlankIndex = -1;

  for (let i = 0; i < scrambleMoves; i += 1) {
    const neighbors = neighborsOf(gridSize, blankIndex);
    // Evita deshacer el movimiento anterior: si no lo hiciera, la mitad de
    // los pasos de mezcla desperdiciarían la vuelta, y scrambleMoves dejaría
    // de servir como referencia razonable de un "buen" puntaje.
    const candidates = neighbors.filter((n) => n !== previousBlankIndex);
    const chosen = pick(rng, candidates.length > 0 ? candidates : neighbors);

    const next = [...board];
    next[blankIndex] = next[chosen]!;
    next[chosen] = 0;
    previousBlankIndex = blankIndex;
    blankIndex = chosen;
    board = next;
  }
  return board;
}

export interface RoundSpec {
  initialBoard: number[];
  gridSize: number;
  scrambleMoves: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const { gridSize, scrambleMoves } = stageParams(stage);
      return { initialBoard: generateBoard(rng, gridSize, scrambleMoves), gridSize, scrambleMoves, stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { gridSize, scrambleMoves } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    initialBoard: generateBoard(rng, gridSize, scrambleMoves),
    gridSize,
    scrambleMoves,
    stage: 1,
  }));
}

function isSolved(board: readonly number[]): boolean {
  return board.every((value, i) => (i === board.length - 1 ? value === 0 : value === i + 1));
}

export interface RoundProgress {
  board: number[];
  moves: number;
  done: boolean;
}

export function createRoundProgress(round: RoundSpec): RoundProgress {
  return { board: [...round.initialBoard], moves: 0, done: isSolved(round.initialBoard) };
}

/** Desliza la ficha en `tileIndex` hacia el hueco, si son adyacentes. Si no, no hace nada. */
export function tapTile(round: RoundSpec, progress: RoundProgress, tileIndex: number): RoundProgress {
  if (progress.done) return progress;
  const blankIndex = progress.board.indexOf(0);
  if (!neighborsOf(round.gridSize, blankIndex).includes(tileIndex)) return progress;

  const board = [...progress.board];
  board[blankIndex] = board[tileIndex]!;
  board[tileIndex] = 0;
  const moves = progress.moves + 1;
  return { board, moves, done: isSolved(board) };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;
const MAX_EFFICIENCY = 1.5;
const EASY_GRID_SIZE = MODE_PARAMS.easy.gridSize;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPoints(mode: ModeId, round: RoundSpec, moves: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  // scrambleMoves es siempre una solución válida (no necesariamente la
  // óptima): sirve como referencia de un "buen" puntaje, no como el mínimo.
  const efficiency = clamp(round.scrambleMoves / Math.max(moves, 1), MIN_EFFICIENCY, MAX_EFFICIENCY);
  const sizeWeight = round.gridSize / EASY_GRID_SIZE;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * sizeWeight * efficiency * stageMultiplier);
}

export interface SlidingPuzzleMetrics extends Record<string, number> {
  completedRounds: number;
  totalRounds: number;
  totalMoves: number;
  maxStage: number;
}

export function buildResult(
  config: GameConfig,
  rounds: RoundSpec[],
  moveCounts: number[], // movimientos usados por ronda completada
  durationMs: number,
  completed = true,
): GameResult {
  let score = 0;
  let maxStage = 0;
  let totalMoves = 0;

  moveCounts.forEach((moves, i) => {
    const round = rounds[i];
    if (!round) return;
    score += roundPoints(config.mode, round, moves);
    totalMoves += moves;
    maxStage = Math.max(maxStage, round.stage);
  });

  return {
    gameId: 'sliding-puzzle',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics: {
      completedRounds: moveCounts.length,
      totalRounds: rounds.length,
      totalMoves,
      maxStage,
    },
    timestamp: new Date().toISOString(),
  };
}
