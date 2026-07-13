import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Apagá todo" (estilo Lights Out) — sin React ni DOM. Tocar
// una celda invierte su estado y el de sus vecinas ortogonales; el objetivo
// es apagar toda la grilla. La grilla se arma presionando celdas al azar
// desde el estado apagado (regla del juego: cada toque es su propia
// inversa), así queda garantizado que siempre tiene solución — resolverlo
// no requiere un solver, alcanza con volver a tocar esas mismas celdas.
// Modos según ADR-007: tres dificultades (tamaño de grilla y mezcla), y
// Tranquilo/Progresivo. El tamaño de grilla se topa en el de Difícil por los
// objetivos táctiles (RNF-04), igual que en Tabla de Schulte: los grados 9-10
// extrapolan con más mezcla en vez de una grilla más grande.

export interface ModeParams extends Record<string, number> {
  gridSize: number;
  scrambleMoves: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { gridSize: 4, scrambleMoves: 6 },
  medium: { gridSize: 5, scrambleMoves: 10 }, // la grilla clásica de Lights Out, 5×5
  hard: { gridSize: 6, scrambleMoves: 15 },
  // Tranquilo: grilla media, mezcla suave, varias rondas (ADR-007).
  zen: { gridSize: 5, scrambleMoves: 8 },
};

// Progresivo: metadatos del modo (los parámetros reales por grado salen de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { gridSize: 4, scrambleMoves: 6 };

export const ZEN_ROUND_COUNT = 3;

/**
 * Parámetros de un grado del progresivo: el tamaño de grilla interpola
 * Fácil→Difícil y se topa ahí (no extrapola en 9-10 como el resto de
 * ADR-007) — una grilla más grande bajaría las celdas de los 44 px mínimos
 * en un celular de 360 px. Los grados 9-10 extrapolan con más mezcla.
 */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    gridSize: Math.round(lerp(easy.gridSize, hard.gridSize, Math.min(1, t))),
    scrambleMoves: Math.round(lerp(easy.scrambleMoves, hard.scrambleMoves, t)),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

/** Invierte una celda y sus vecinas ortogonales (arriba/abajo/izquierda/derecha). */
export function pressCell(grid: boolean[], gridSize: number, index: number): boolean[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const next = [...grid];
  const toggle = (r: number, c: number) => {
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return;
    const i = r * gridSize + c;
    next[i] = !next[i];
  };
  toggle(row, col);
  toggle(row - 1, col);
  toggle(row + 1, col);
  toggle(row, col - 1);
  toggle(row, col + 1);
  return next;
}

/** Arma una grilla mezclada presionando celdas al azar desde el estado apagado (siempre resoluble). */
export function generateGrid(rng: Rng, gridSize: number, scrambleMoves: number): boolean[] {
  let grid: boolean[] = new Array(gridSize * gridSize).fill(false);
  for (let i = 0; i < scrambleMoves; i += 1) {
    grid = pressCell(grid, gridSize, randomInt(rng, 0, gridSize * gridSize - 1));
  }
  if (grid.every((cell) => !cell)) {
    // La mezcla se canceló sola (raro, pero posible): un toque más para que
    // el puzzle no arranque ya resuelto.
    grid = pressCell(grid, gridSize, randomInt(rng, 0, gridSize * gridSize - 1));
  }
  return grid;
}

export interface RoundSpec {
  initialGrid: boolean[];
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
      return {
        initialGrid: generateGrid(rng, gridSize, scrambleMoves),
        gridSize,
        scrambleMoves,
        stage,
      };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { gridSize, scrambleMoves } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    initialGrid: generateGrid(rng, gridSize, scrambleMoves),
    gridSize,
    scrambleMoves,
    stage: 1,
  }));
}

export interface RoundProgress {
  grid: boolean[];
  presses: number;
  done: boolean;
}

export function createRoundProgress(round: RoundSpec): RoundProgress {
  return { grid: [...round.initialGrid], presses: 0, done: false };
}

/** Procesa un toque sobre una celda de la grilla actual. */
export function pressCellInRound(
  round: RoundSpec,
  progress: RoundProgress,
  index: number,
): RoundProgress {
  if (progress.done) return progress;
  const grid = pressCell(progress.grid, round.gridSize, index);
  const presses = progress.presses + 1;
  return { grid, presses, done: grid.every((cell) => !cell) };
}

const BASE_POINTS = 100;
const MIN_EFFICIENCY = 0.3;
const MAX_EFFICIENCY = 1.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPoints(mode: ModeId, round: RoundSpec, presses: number): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  // scrambleMoves es siempre una solución válida (no necesariamente la
  // óptima): sirve como referencia de un "buen" puntaje, no como el mínimo.
  const efficiency = clamp(
    round.scrambleMoves / Math.max(presses, 1),
    MIN_EFFICIENCY,
    MAX_EFFICIENCY,
  );
  const sizeWeight = round.gridSize / MODE_PARAMS.easy.gridSize;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  return Math.round(BASE_POINTS * sizeWeight * efficiency * stageMultiplier);
}

export interface LightsOutMetrics extends Record<string, number> {
  completedRounds: number;
  totalRounds: number;
  totalPresses: number;
  maxStage: number;
}

export function buildResult(
  config: GameConfig,
  rounds: RoundSpec[],
  pressCounts: number[], // toques usados por ronda completada
  durationMs: number,
  completed = true,
): GameResult {
  let score = 0;
  let maxStage = 0;
  let totalPresses = 0;

  pressCounts.forEach((presses, i) => {
    const round = rounds[i];
    if (!round) return;
    score += roundPoints(config.mode, round, presses);
    totalPresses += presses;
    maxStage = Math.max(maxStage, round.stage);
  });

  return {
    gameId: 'lights-out',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics: {
      completedRounds: pressCounts.length,
      totalRounds: rounds.length,
      totalPresses,
      maxStage,
    },
    timestamp: new Date().toISOString(),
  };
}
