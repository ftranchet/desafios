import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';

// Lógica pura de "Torres de Hanoi" — sin React ni DOM. Sin aleatoriedad: el
// puzzle es siempre la misma torre ordenada en el primer poste, así que no
// hay nada que sembrar con semilla (regla PRD 4.2.4 aplica a la aleatoriedad,
// y acá no la hay). No hay forma de "perder" — el puntaje premia la
// eficiencia de movimientos contra el óptimo matemático (2^discos - 1).
// Modos según ADR-007: tres dificultades (cantidad de discos), Tranquilo
// (varios puzzles sin puntaje por eficiencia) y Progresivo (10 grados).

export interface ModeParams extends Record<string, number> {
  diskCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { diskCount: 3 },
  medium: { diskCount: 4 },
  hard: { diskCount: 5 },
  // Tranquilo: tamaño medio, varios puzzles, sin puntaje por eficiencia (ADR-007).
  zen: { diskCount: 4 },
};

// Progresivo: metadatos del modo (el tamaño real por grado sale de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { diskCount: 3 };

export const ZEN_ROUND_COUNT = 3;
const MAX_DISK_COUNT = 8; // más discos no rompe nada visual (los postes solo se hacen más altos)
const MIN_DISK_COUNT = 3;

/** Cantidad de discos de un grado del progresivo: interpola Fácil→Difícil y extrapola en 9-10 (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    diskCount: Math.min(
      MAX_DISK_COUNT,
      Math.max(MIN_DISK_COUNT, Math.round(lerp(easy.diskCount, hard.diskCount, t))),
    ),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface RoundSpec {
  diskCount: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId): RoundSpec[] {
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      return { ...stageParams(stage), stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { diskCount } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({ diskCount, stage: 1 }));
}

// Un poste es un arreglo de tamaños de disco, de la base a la punta (el
// último elemento es el disco visible arriba de la torre).
export type Peg = number[];

export interface HanoiState {
  pegs: [Peg, Peg, Peg];
  selectedPeg: number | null;
  moves: number;
  done: boolean;
}

export function createHanoiState(diskCount: number): HanoiState {
  const tower = Array.from({ length: diskCount }, (_, i) => diskCount - i); // [n, n-1, ..., 1]
  return { pegs: [tower, [], []], selectedPeg: null, moves: 0, done: false };
}

export interface TapResult {
  state: HanoiState;
  illegalMove: boolean; // true si se intentó soltar un disco sobre uno más chico
}

/** Procesa un toque sobre un poste: primero elige el origen, después el destino. */
export function tapPeg(state: HanoiState, pegIndex: number): TapResult {
  if (state.done) return { state, illegalMove: false };

  if (state.selectedPeg === null) {
    if (state.pegs[pegIndex]!.length === 0) return { state, illegalMove: false };
    return { state: { ...state, selectedPeg: pegIndex }, illegalMove: false };
  }

  if (state.selectedPeg === pegIndex) {
    return { state: { ...state, selectedPeg: null }, illegalMove: false };
  }

  const fromPeg = state.pegs[state.selectedPeg]!;
  const disk = fromPeg[fromPeg.length - 1]!;
  const toPeg = state.pegs[pegIndex]!;
  const topOfTarget = toPeg[toPeg.length - 1];
  const legal = topOfTarget === undefined || disk < topOfTarget;

  if (!legal) {
    return { state: { ...state, selectedPeg: null }, illegalMove: true };
  }

  const diskCount = state.pegs[0].length + state.pegs[1].length + state.pegs[2].length;
  const newPegs = state.pegs.map((peg, i) => {
    if (i === state.selectedPeg) return peg.slice(0, -1);
    if (i === pegIndex) return [...peg, disk];
    return peg;
  }) as [Peg, Peg, Peg];

  return {
    state: {
      pegs: newPegs,
      selectedPeg: null,
      moves: state.moves + 1,
      done: newPegs[2].length === diskCount,
    },
    illegalMove: false,
  };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Movimientos óptimos para resolver una torre de `diskCount` discos (2^n - 1). */
export function optimalMoves(diskCount: number): number {
  return 2 ** diskCount - 1;
}

function roundPoints(mode: ModeId, round: RoundSpec, moves: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const optimal = optimalMoves(round.diskCount);
  const efficiency = clamp(optimal / Math.max(moves, optimal), MIN_EFFICIENCY, 1);
  const sizeWeight = round.diskCount / MODE_PARAMS.easy.diskCount;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * sizeWeight * efficiency * stageMultiplier);
}

export interface HanoiMetrics extends Record<string, number> {
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
    gameId: 'hanoi-towers',
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
