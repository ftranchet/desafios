import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, progressiveT, PROGRESSIVE_STAGES } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Grupos" (estilo SameGame) — sin React ni DOM. Tocá un grupo
// de 2 o más fichas del mismo color, conectadas en horizontal o vertical, y
// desaparecen; las de arriba caen y las columnas vacías se corren hacia la
// izquierda. Cuantas más fichas tenga el grupo, más puntos —conviene esperar
// grupos grandes en vez de tocar el primero que aparece. Un tablero termina
// cuando no queda ningún grupo de 2+ (o se vació entero, el mejor final).
// Nombre original (PRD 11.2): el mecanismo es de dominio público (nació como
// "Chain Shot!" y se popularizó como "SameGame"), pero se usa un nombre en
// español descriptivo por consistencia con el resto del catálogo. Modos según
// ADR-007: tres dificultades (tamaño de tablero y cantidad de colores),
// Tranquilo (varios tableros sin puntaje por eficiencia) y Progresivo (10
// grados, un tablero por grado).
//
// Sin tensión con RNF-04: el ancho de grilla se mantiene bajo (5-6 columnas)
// en todas las dificultades; la dificultad sube por cantidad de colores y de
// filas, nunca angostando las celdas por debajo de los 44 px mínimos.

const EMPTY = -1;

export const TILE_TYPE_COUNT = 5; // tipos de ficha disponibles (color+glifo, ver ui.tsx)

export interface ModeParams extends Record<string, number> {
  rows: number;
  cols: number;
  colorCount: number;
}

export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen', ModeParams> = {
  easy: { rows: 6, cols: 5, colorCount: 3 },
  medium: { rows: 8, cols: 6, colorCount: 4 },
  hard: { rows: 10, cols: 6, colorCount: 5 },
  // Tranquilo: chico y con pocos colores, varios tableros, sin puntaje por eficiencia (ADR-007).
  zen: { rows: 6, cols: 5, colorCount: 3 },
};

// Progresivo: metadatos del modo (los parámetros reales por grado salen de stageParams).
export const PROGRESSIVE_PARAMS: ModeParams = { rows: 6, cols: 5, colorCount: 3 };

export const ZEN_ROUND_COUNT = 3;

/** Parámetros de un grado del progresivo: interpola y extrapola Fácil→Difícil sin techo (ADR-007). */
export function stageParams(stage: number): ModeParams {
  const t = progressiveT(stage);
  const { easy, hard } = MODE_PARAMS;
  return {
    rows: Math.round(lerp(easy.rows, hard.rows, t)),
    cols: Math.round(lerp(easy.cols, hard.cols, t)),
    // Se topa en TILE_TYPE_COUNT: no hay más tipos de ficha (color+glifo) para
    // extrapolar, a diferencia de filas/columnas que sí pueden seguir creciendo.
    colorCount: Math.min(TILE_TYPE_COUNT, Math.round(lerp(easy.colorCount, hard.colorCount, t))),
  };
}

export function getModeParams(mode: ModeId): ModeParams {
  if (mode === 'progressive') return PROGRESSIVE_PARAMS;
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

function neighborsOf(rows: number, cols: number, index: number): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result: number[] = [];
  if (row > 0) result.push(index - cols);
  if (row < rows - 1) result.push(index + cols);
  if (col > 0) result.push(index - 1);
  if (col < cols - 1) result.push(index + 1);
  return result;
}

/** Grupo conectado (4 direcciones) del mismo color que la celda `index`. */
export function findGroup(grid: readonly number[], rows: number, cols: number, index: number): number[] {
  const color = grid[index];
  if (color === undefined || color === EMPTY) return [];
  const visited = new Set([index]);
  const stack = [index];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const neighbor of neighborsOf(rows, cols, current)) {
      if (!visited.has(neighbor) && grid[neighbor] === color) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }
  return [...visited];
}

function hasAnyGroup(grid: readonly number[], rows: number, cols: number): boolean {
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] === EMPTY) continue;
    if (findGroup(grid, rows, cols, i).length >= 2) return true;
  }
  return false;
}

function randomGrid(rng: Rng, rows: number, cols: number, colorCount: number): number[] {
  return Array.from({ length: rows * cols }, () => randomInt(rng, 0, colorCount - 1));
}

/** Tablero inicial: siempre tiene al menos un grupo de 2+ (se descarta y rehace si no). */
export function generateGrid(rng: Rng, rows: number, cols: number, colorCount: number): number[] {
  let grid = randomGrid(rng, rows, cols, colorCount);
  while (!hasAnyGroup(grid, rows, cols)) {
    grid = randomGrid(rng, rows, cols, colorCount);
  }
  return grid;
}

/** Las fichas caen por columna (gravedad) y las columnas vacías se corren a la izquierda. */
function applyGravityAndCompact(grid: readonly number[], rows: number, cols: number): number[] {
  const columns: number[][] = [];
  for (let c = 0; c < cols; c += 1) {
    const column: number[] = [];
    for (let r = 0; r < rows; r += 1) {
      const value = grid[r * cols + c]!;
      if (value !== EMPTY) column.push(value);
    }
    columns.push(column);
  }
  const nonEmptyColumns = columns.filter((column) => column.length > 0);

  const next = new Array(rows * cols).fill(EMPTY);
  nonEmptyColumns.forEach((column, c) => {
    const startRow = rows - column.length;
    column.forEach((value, i) => {
      next[(startRow + i) * cols + c] = value;
    });
  });
  return next;
}

export interface RoundSpec {
  initialGrid: number[];
  rows: number;
  cols: number;
  stage: number; // grado del progresivo; 1 en el resto
}

/** Rondas de la sesión: 1 en modos fijos, ZEN_ROUND_COUNT en Tranquilo, 10 en Progresivo. */
export function buildRounds(mode: ModeId, seed: number): RoundSpec[] {
  const rng = createRng(seed);
  if (mode === 'progressive') {
    return Array.from({ length: PROGRESSIVE_STAGES }, (_, i) => {
      const stage = i + 1;
      const { rows, cols, colorCount } = stageParams(stage);
      return { initialGrid: generateGrid(rng, rows, cols, colorCount), rows, cols, stage };
    });
  }
  const roundCount = mode === 'zen' ? ZEN_ROUND_COUNT : 1;
  const { rows, cols, colorCount } = getModeParams(mode);
  return Array.from({ length: roundCount }, () => ({
    initialGrid: generateGrid(rng, rows, cols, colorCount),
    rows,
    cols,
    stage: 1,
  }));
}

export interface RoundProgress {
  grid: number[];
  score: number;
  groupsCleared: number;
  done: boolean;
}

export function createRoundProgress(round: RoundSpec): RoundProgress {
  return { grid: [...round.initialGrid], score: 0, groupsCleared: 0, done: false };
}

const POINTS_PER_UNIT = 5;
const FULL_CLEAR_BONUS = 200;
const ZEN_POINTS_PER_GROUP = 10;

/** Toca la celda `index`: si forma parte de un grupo de 2+, lo limpia y aplica gravedad. */
export function tapCell(
  round: RoundSpec,
  progress: RoundProgress,
  mode: ModeId,
  index: number,
): RoundProgress {
  if (progress.done) return progress;
  const group = findGroup(progress.grid, round.rows, round.cols, index);
  if (group.length < 2) return progress;

  const cleared = [...progress.grid];
  group.forEach((i) => {
    cleared[i] = EMPTY;
  });
  const grid = applyGravityAndCompact(cleared, round.rows, round.cols);

  const boardCleared = grid.every((value) => value === EMPTY);
  const groupPoints = mode === 'zen' ? ZEN_POINTS_PER_GROUP : (group.length - 1) ** 2 * POINTS_PER_UNIT;
  const bonus = boardCleared && mode !== 'zen' ? FULL_CLEAR_BONUS : 0;

  return {
    grid,
    score: progress.score + groupPoints + bonus,
    groupsCleared: progress.groupsCleared + 1,
    done: boardCleared || !hasAnyGroup(grid, round.rows, round.cols),
  };
}

export interface GroupsMetrics extends Record<string, number> {
  completedRounds: number;
  totalRounds: number;
  totalGroupsCleared: number;
  maxStage: number;
}

export function buildResult(
  config: GameConfig,
  rounds: RoundSpec[],
  progressList: RoundProgress[], // progreso final de cada ronda jugada
  durationMs: number,
  completed = true,
): GameResult {
  let score = 0;
  let maxStage = 0;
  let totalGroupsCleared = 0;

  progressList.forEach((progress, i) => {
    const round = rounds[i];
    if (!round) return;
    score += progress.score;
    totalGroupsCleared += progress.groupsCleared;
    maxStage = Math.max(maxStage, round.stage);
  });

  return {
    gameId: 'groups',
    mode: config.mode,
    score,
    completed,
    durationMs,
    metrics: {
      completedRounds: progressList.length,
      totalRounds: rounds.length,
      totalGroupsCleared,
      maxStage,
    },
    timestamp: new Date().toISOString(),
  };
}
