import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Tabla de Schulte" — sin React ni DOM. Una grilla mezclada
// de números 1..N a tocar en orden ascendente, lo más rápido posible. Modos
// según ADR-007: tres dificultades (tamaño de la grilla), Tranquilo (varias
// grillas sin cronómetro visible ni puntaje por tiempo) y Progresivo (10
// grados: una grilla por grado, cada vez más grande — no hay forma de
// "perder" una grilla, así que la sesión es una rampa de longitud fija,
// como Secuencias numéricas, no una supervivencia).

export interface ModeParams extends Record<string, number> {
  gridSize: number; // lado de la grilla: gridSize² números
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { gridSize: 4 },
  medium: { gridSize: 5 }, // la grilla clásica de Schulte, 5×5
  hard: { gridSize: 6 },
  // Tranquilo: grilla clásica, varias rondas sin presión de tiempo (ADR-007).
  zen: { gridSize: 5 },
};

// Progresivo: metadatos del modo (el tamaño real por grado sale de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { gridSize: 4 };

export const ZEN_ROUND_COUNT = 3;

/**
 * Tamaño de grilla de un grado del progresivo: interpola Fácil→Difícil y se
 * topa ahí (no extrapola en 9-10 como el resto de ADR-007) — una grilla más
 * grande que la de Difícil bajaría las celdas de los 44 px mínimos (RNF-04)
 * en un celular de 360 px. Los grados 9-10 extrapolan en cambio con un ritmo
 * de referencia más exigente (parMsPerCellForStage): la grilla no crece más,
 * pero hay que ir más rápido para puntuar igual de bien.
 */
export function stageParams(stage: number): ModeParams {
  const t = Math.min(1, progressiveT(stage));
  const { easy, hard } = MODE_PARAMS;
  return { gridSize: Math.round(lerp(easy.gridSize, hard.gridSize, t)) };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

/** Los números 1..gridSize² mezclados: grid[posición de celda] = número mostrado ahí. */
export function generateGrid(rng: Rng, gridSize: number): number[] {
  const cellCount = gridSize * gridSize;
  const numbers = Array.from({ length: cellCount }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = numbers[i]!;
    numbers[i] = numbers[j]!;
    numbers[j] = tmp;
  }
  return numbers;
}

export interface RoundSpec {
  grid: number[];
  gridSize: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const { gridSize } = stageParams(stage);
      return { grid: generateGrid(rng, gridSize), gridSize, stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { gridSize } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    grid: generateGrid(rng, gridSize),
    gridSize,
    stage: 1,
  }));
}

export interface RoundProgress {
  expected: number; // próximo número a tocar
  mistakes: number;
  done: boolean;
}

export function createRoundProgress(): RoundProgress {
  return { expected: 1, mistakes: 0, done: false };
}

/** Procesa un toque sobre un número de la grilla actual. */
export function submitNumber(
  round: RoundSpec,
  progress: RoundProgress,
  tapped: number,
): RoundProgress {
  if (progress.done) return progress;
  if (tapped !== progress.expected) {
    return { ...progress, mistakes: progress.mistakes + 1 };
  }
  const cellCount = round.gridSize * round.gridSize;
  const nextExpected = progress.expected + 1;
  if (nextExpected > cellCount) {
    return { ...progress, done: true };
  }
  return { ...progress, expected: nextExpected };
}

export interface RoundRecord {
  elapsedMs: number;
  mistakes: number;
}

const BASE_POINTS = 100;
const BASE_PAR_MS_PER_CELL = 650; // ritmo de referencia: tocar un número cada 650 ms
const MIN_PROGRESSIVE_PAR_MS = 320;
const MISTAKE_PENALTY = 12;
const MIN_SPEED_FACTOR = 0.4;
const MAX_SPEED_FACTOR = 2.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Ritmo de referencia por celda: fijo en los modos comunes; en el progresivo se ajusta por grado (ver stageParams). */
function parMsPerCellForStage(stage: number): number {
  if (stage <= 1) return BASE_PAR_MS_PER_CELL;
  const t = progressiveT(stage);
  return Math.max(MIN_PROGRESSIVE_PAR_MS, Math.round(lerp(BASE_PAR_MS_PER_CELL, 380, t)));
}

function roundPoints(mode: ModeId, round: RoundSpec, record: RoundRecord): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const cellCount = round.gridSize * round.gridSize;
  const parMs = cellCount * parMsPerCellForStage(round.stage);
  const speedFactor = clamp(
    parMs / Math.max(record.elapsedMs, 1),
    MIN_SPEED_FACTOR,
    MAX_SPEED_FACTOR,
  );
  const sizeWeight = round.gridSize / MODE_PARAMS.easy.gridSize;
  const stageMultiplier = 1 + (round.stage - 1) / 9; // Progresivo: el grado multiplica
  const raw =
    BASE_POINTS * sizeWeight * speedFactor * stageMultiplier - record.mistakes * MISTAKE_PENALTY;
  return Math.max(0, Math.round(raw));
}

export interface SchulteMetrics extends Record<string, number> {
  completedRounds: number;
  totalRounds: number;
  mistakes: number;
  avgElapsedMs: number;
  maxStage: number;
}

export function computeScore(
  mode: ModeId,
  rounds: RoundSpec[],
  records: RoundRecord[],
): { score: number; metrics: SchulteMetrics } {
  let score = 0;
  let mistakes = 0;
  let maxStage = 0;
  let elapsedTotal = 0;

  records.forEach((record, i) => {
    const round = rounds[i];
    if (!round) return;
    mistakes += record.mistakes;
    elapsedTotal += record.elapsedMs;
    maxStage = Math.max(maxStage, round.stage);
    score += roundPoints(mode, round, record);
  });

  return {
    score,
    metrics: {
      completedRounds: records.length,
      totalRounds: rounds.length,
      mistakes,
      avgElapsedMs: records.length > 0 ? Math.round(elapsedTotal / records.length) : 0,
      maxStage,
    },
  };
}

export function buildResult(
  config: GameConfig,
  rounds: RoundSpec[],
  records: RoundRecord[],
  durationMs: number,
  completed = true,
): GameResult {
  const { score, metrics } = computeScore(config.mode, rounds, records);
  return {
    gameId: 'schulte-table',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics,
    timestamp: new Date().toISOString(),
  };
}
