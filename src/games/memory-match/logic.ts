import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Memorama" — sin React ni DOM. Encontrar las parejas de
// cartas iguales dando vuelta de a dos por turno. No hay forma de "perder"
// (siempre se termina el tablero), así que el puntaje premia la eficiencia
// de movimientos en vez de una condición de derrota. Modos según ADR-007:
// tres dificultades (cantidad de pares), Tranquilo (varios tableros sin
// puntaje por eficiencia) y Progresivo (10 grados, un tablero por grado).

export const SYMBOL_COUNT = 12; // símbolos disponibles para armar pares (ver ui.tsx)

export interface ModeParams extends Record<string, number> {
  pairCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { pairCount: 6 },
  medium: { pairCount: 8 },
  hard: { pairCount: 10 },
  // Tranquilo: tamaño medio, varios tableros, sin puntaje por eficiencia (ADR-007).
  zen: { pairCount: 8 },
};

// Progresivo: metadatos del modo (el tamaño real por grado sale de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { pairCount: 6 };

export const ZEN_ROUND_COUNT = 3;
const MAX_PAIR_COUNT = SYMBOL_COUNT;

/** Cantidad de pares de un grado del progresivo: interpola Fácil→Difícil y extrapola en 9-10 (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    pairCount: Math.min(MAX_PAIR_COUNT, Math.round(lerp(easy.pairCount, hard.pairCount, t))),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

/** Un tablero mezclado: `pairCount` símbolos (0..pairCount-1), cada uno dos veces. */
export function generateBoard(rng: Rng, pairCount: number): number[] {
  const cells: number[] = [];
  for (let symbol = 0; symbol < pairCount; symbol += 1) {
    cells.push(symbol, symbol);
  }
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = tmp;
  }
  return cells;
}

export interface RoundSpec {
  board: number[];
  pairCount: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const { pairCount } = stageParams(stage);
      return { board: generateBoard(rng, pairCount), pairCount, stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { pairCount } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    board: generateBoard(rng, pairCount),
    pairCount,
    stage: 1,
  }));
}

export interface RoundProgress {
  matchedCells: boolean[];
  selectedCells: number[]; // 0, 1 o 2 celdas en evaluación
  moves: number;
  matchesFound: number;
  done: boolean;
}

export function createRoundProgress(round: RoundSpec): RoundProgress {
  return {
    matchedCells: round.board.map(() => false),
    selectedCells: [],
    moves: 0,
    matchesFound: 0,
    done: false,
  };
}

/** Selecciona una celda (da vuelta una carta). No hace nada si ya hay 2 en evaluación. */
export function selectCard(progress: RoundProgress, cellIndex: number): RoundProgress {
  if (progress.done) return progress;
  if (progress.matchedCells[cellIndex]) return progress;
  if (progress.selectedCells.includes(cellIndex)) return progress;
  if (progress.selectedCells.length >= 2) return progress;
  return { ...progress, selectedCells: [...progress.selectedCells, cellIndex] };
}

/** Resuelve las 2 cartas seleccionadas: empareja o las vuelve a tapar. La UI llama esto tras una pausa. */
export function resolveSelection(round: RoundSpec, progress: RoundProgress): RoundProgress {
  if (progress.selectedCells.length !== 2) return progress;
  const [a, b] = progress.selectedCells as [number, number];
  const moves = progress.moves + 1;
  const isMatch = round.board[a] === round.board[b];

  if (!isMatch) {
    return { ...progress, selectedCells: [], moves };
  }

  const matchedCells = [...progress.matchedCells];
  matchedCells[a] = true;
  matchedCells[b] = true;
  const matchesFound = progress.matchesFound + 1;
  return {
    ...progress,
    matchedCells,
    selectedCells: [],
    moves,
    matchesFound,
    done: matchesFound === round.pairCount,
  };
}

const BASE_POINTS = 100;
const PAR_MOVES_MULTIPLIER = 1.8; // "buen" puntaje de referencia: ~1.8 movimientos por par
const MIN_EFFICIENCY = 0.3;
const MAX_EFFICIENCY = 1.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPoints(mode: ModeId, round: RoundSpec, moves: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const par = round.pairCount * PAR_MOVES_MULTIPLIER;
  const efficiency = clamp(par / Math.max(moves, round.pairCount), MIN_EFFICIENCY, MAX_EFFICIENCY);
  const sizeWeight = round.pairCount / MODE_PARAMS.easy.pairCount;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * sizeWeight * efficiency * stageMultiplier);
}

export interface MemoryMatchMetrics extends Record<string, number> {
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
    gameId: 'memory-match',
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
