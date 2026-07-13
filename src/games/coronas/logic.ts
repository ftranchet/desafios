import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, type Rng } from '../../core/random';

// Lógica pura de "Coronas" — sin React ni DOM. Grilla N×N dividida en N
// regiones de color: colocar una corona por fila, columna y región, sin que
// dos coronas se toquen (ni ortogonal ni diagonalmente). Solución única.
// Nombre original (PRD 11.2): inspirado en "Queens" de LinkedIn — el género
// es un N-Queens con regiones en vez de restricción diagonal completa; se
// evita el nombre del producto de LinkedIn. Se genera y verifica en vivo
// (grillas de 6×6 a 8×8): arma una solución, hace crecer regiones alrededor
// y confirma unicidad con un solver de backtracking, mismo criterio que el
// verificador de Nonograma agregado en la auditoría de julio. Ronda única de
// pensamiento, como Sudoku/Nonograma: no declara Progresivo.

export type Tier = 'easy' | 'medium' | 'hard' | 'zen';

export interface ModeParams extends Record<string, number> {
  size: number;
}

export const MODE_PARAMS: Record<Tier, ModeParams> = {
  easy: { size: 6 },
  medium: { size: 7 },
  hard: { size: 8 },
  // Tranquilo: grilla chica, sin puntaje por eficiencia (ADR-007).
  zen: { size: 6 },
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

function shuffledRange(size: number, rng: Rng): number[] {
  const values = Array.from({ length: size }, (_, i) => i);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return values;
}

/**
 * Una corona por fila (columna elegida por fila), sin repetir columna y sin
 * tocar la fila anterior (|colA - colB| <= 1 ya cubre orto/diagonal, porque
 * solo filas consecutivas pueden llegar a tocarse).
 */
function generateSolutionColumns(size: number, rng: Rng): number[] | null {
  const columns: number[] = new Array(size).fill(-1);
  const usedCols: boolean[] = new Array(size).fill(false);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    for (const col of shuffledRange(size, rng)) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(col - columns[row - 1]!) <= 1) continue;
      usedCols[col] = true;
      columns[row] = col;
      if (backtrack(row + 1)) return true;
      usedCols[col] = false;
      columns[row] = -1;
    }
    return false;
  }

  return backtrack(0) ? columns : null;
}

function orthogonalNeighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(index - size);
  if (row < size - 1) neighbors.push(index + size);
  if (col > 0) neighbors.push(index - 1);
  if (col < size - 1) neighbors.push(index + 1);
  return neighbors;
}

/** Crece N regiones (una por corona de la solución) hasta cubrir toda la grilla. */
function growRegions(columns: readonly number[], size: number, rng: Rng): number[] {
  const regions: number[] = new Array(size * size).fill(-1);
  const regionCells: number[][] = columns.map((col, row) => {
    const seed = row * size + col;
    regions[seed] = row;
    return [seed];
  });

  let remaining = size * size - size;
  while (remaining > 0) {
    let grew = false;
    for (const region of shuffledRange(size, rng)) {
      const candidates = new Set<number>();
      for (const cell of regionCells[region]!) {
        for (const neighbor of orthogonalNeighbors(cell, size)) {
          if (regions[neighbor] === -1) candidates.add(neighbor);
        }
      }
      if (candidates.size === 0) continue;
      const pool = Array.from(candidates);
      const pick = pool[Math.floor(rng() * pool.length)]!;
      regions[pick] = region;
      regionCells[region]!.push(pick);
      remaining -= 1;
      grew = true;
      if (remaining === 0) break;
    }
    // Si ninguna región pudo crecer en una pasada completa, quedaron celdas
    // aisladas (no debería pasar en una grilla rectangular conexa, pero es
    // una salida defensiva): el llamador detecta los -1 restantes y reintenta.
    if (!grew) break;
  }
  return regions;
}

/**
 * Busca UNA solución distinta de `target` (o null si `target` ya es única).
 * A diferencia de `countCrownSolutions`, devuelve la solución en sí — hace
 * falta para reparar el tablero (ver `repairRegions`).
 */
function findAlternateSolution(
  regions: readonly number[],
  size: number,
  target: readonly number[],
): number[] | null {
  const usedCols: boolean[] = new Array(size).fill(false);
  const usedRegions: boolean[] = new Array(size).fill(false);
  const columns: number[] = new Array(size).fill(-1);
  let found: number[] | null = null;

  function backtrack(row: number): void {
    if (found) return;
    if (row === size) {
      if (columns.some((c, r) => c !== target[r])) found = columns.slice();
      return;
    }
    for (let col = 0; col < size; col += 1) {
      if (found) return;
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(col - columns[row - 1]!) <= 1) continue;
      const region = regions[row * size + col]!;
      if (usedRegions[region]) continue;
      usedCols[col] = true;
      usedRegions[region] = true;
      columns[row] = col;
      backtrack(row + 1);
      usedCols[col] = false;
      usedRegions[region] = false;
      columns[row] = -1;
    }
  }
  backtrack(0);
  return found;
}

/** ¿La región sigue de una sola pieza si se le saca `excludeCell`? (BFS por adyacencia ortogonal) */
function isRegionConnectedWithout(
  regions: readonly number[],
  size: number,
  region: number,
  excludeCell: number,
): boolean {
  const cells: number[] = [];
  regions.forEach((r, i) => {
    if (r === region && i !== excludeCell) cells.push(i);
  });
  if (cells.length === 0) return true;
  const visited = new Set<number>([cells[0]!]);
  const queue = [cells[0]!];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const neighbor of orthogonalNeighbors(cell, size)) {
      if (regions[neighbor] === region && neighbor !== excludeCell && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited.size === cells.length;
}

/** ¿`cell` tiene al menos un vecino ortogonal ya asignado a `region`? (para que sumarla no la deje en dos pedazos) */
function hasNeighborInRegion(
  regions: readonly number[],
  size: number,
  cell: number,
  region: number,
): boolean {
  return orthogonalNeighbors(cell, size).some((neighbor) => regions[neighbor] === region);
}

/** ¿Mover `cell` (hoy en `fromRegion`) a `toRegion` deja ambas regiones conexas? */
function canMoveCellPreservingConnectivity(
  regions: readonly number[],
  size: number,
  cell: number,
  fromRegion: number,
  toRegion: number,
): boolean {
  return (
    isRegionConnectedWithout(regions, size, fromRegion, cell) &&
    hasNeighborInRegion(regions, size, cell, toRegion)
  );
}

const MAX_REPAIR_ITERATIONS = 300;

/**
 * Un crecimiento de regiones al azar casi nunca da solución única por sí
 * solo (docenas de soluciones alternativas es lo típico, no la excepción).
 * Esta función lo arregla: mientras exista una solución alternativa a
 * `target`, funde en una misma región dos celdas donde esa alternativa
 * difiere de `target` — así esa alternativa puntual deja de ser válida (dos
 * coronas en la misma región) sin tocar ninguna celda de `target` (nunca
 * dejan de ser únicas sus propias regiones). Preserva que cada región siga
 * siendo una sola pieza conexa (nunca funde una celda si eso la desconecta).
 * Si se traba (todas las fusiones posibles romperían la conexión), devuelve
 * null y el llamador reintenta con un tablero nuevo.
 */
function repairRegions(
  regions: readonly number[],
  size: number,
  target: readonly number[],
): number[] | null {
  const working = regions.slice();
  for (let i = 0; i < MAX_REPAIR_ITERATIONS; i += 1) {
    const alternate = findAlternateSolution(working, size, target);
    if (!alternate) return working; // sin alternativas: única

    const disagreements: number[] = [];
    for (let row = 0; row < size; row += 1) {
      if (alternate[row] !== target[row]) disagreements.push(row);
    }

    let repaired = false;
    for (const r1 of disagreements) {
      if (repaired) break;
      for (const r2 of disagreements) {
        if (r1 === r2) continue;
        const cellA = r1 * size + alternate[r1]!;
        const cellB = r2 * size + alternate[r2]!;
        const regionA = working[cellA]!;
        const regionB = working[cellB]!;
        if (regionA === regionB) continue;
        if (canMoveCellPreservingConnectivity(working, size, cellA, regionA, regionB)) {
          working[cellA] = regionB;
          repaired = true;
          break;
        }
        if (canMoveCellPreservingConnectivity(working, size, cellB, regionB, regionA)) {
          working[cellB] = regionA;
          repaired = true;
          break;
        }
      }
    }
    if (!repaired) return null;
  }
  return null;
}

/** Cuenta soluciones hasta `limit` (2 alcanza para saber si el tablero es único). */
export function countCrownSolutions(regions: readonly number[], size: number, limit = 2): number {
  const usedCols: boolean[] = new Array(size).fill(false);
  const usedRegions: boolean[] = new Array(size).fill(false);
  const columns: number[] = new Array(size).fill(-1);
  let count = 0;

  function backtrack(row: number): void {
    if (count >= limit) return;
    if (row === size) {
      count += 1;
      return;
    }
    for (let col = 0; col < size; col += 1) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(col - columns[row - 1]!) <= 1) continue;
      const region = regions[row * size + col]!;
      if (usedRegions[region]) continue;
      usedCols[col] = true;
      usedRegions[region] = true;
      columns[row] = col;
      backtrack(row + 1);
      usedCols[col] = false;
      usedRegions[region] = false;
      columns[row] = -1;
      if (count >= limit) return;
    }
  }
  backtrack(0);
  return count;
}

/** Resuelve un tablero (asumiendo solución única): fila → columna de su corona. */
export function solveCoronas(regions: readonly number[], size: number): number[] | null {
  const usedCols: boolean[] = new Array(size).fill(false);
  const usedRegions: boolean[] = new Array(size).fill(false);
  const columns: number[] = new Array(size).fill(-1);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    for (let col = 0; col < size; col += 1) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(col - columns[row - 1]!) <= 1) continue;
      const region = regions[row * size + col]!;
      if (usedRegions[region]) continue;
      usedCols[col] = true;
      usedRegions[region] = true;
      columns[row] = col;
      if (backtrack(row + 1)) return true;
      usedCols[col] = false;
      usedRegions[region] = false;
      columns[row] = -1;
    }
    return false;
  }

  return backtrack(0) ? columns : null;
}

export interface CoronasBoard {
  size: number;
  regions: readonly number[];
}

const MAX_GENERATION_ATTEMPTS = 3000;

/**
 * Genera un tablero de Coronas en vivo: arma una solución (una corona por
 * fila/columna, sin tocarse), hace crecer N regiones alrededor y las repara
 * (`repairRegions`) hasta que esa solución sea la única. Si el crecimiento
 * queda incompleto o la reparación se traba, reintenta con un tablero
 * nuevo — no llega nunca a un tablero sin solución única.
 */
export function generateCoronas(mode: ModeId, seed: number): CoronasBoard {
  const size = getModeParams(mode).size;
  const rng = createRng(seed);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const columns = generateSolutionColumns(size, rng);
    if (!columns) continue;
    const grown = growRegions(columns, size, rng);
    if (grown.includes(-1)) continue;
    const regions = repairRegions(grown, size, columns);
    if (!regions) continue;
    if (countCrownSolutions(regions, size, 2) === 1) {
      return { size, regions };
    }
  }
  throw new Error('No se pudo generar un tablero de Coronas con solución única');
}

export type CellMark = 'empty' | 'x' | 'crown';

export interface GameState {
  size: number;
  regions: readonly number[];
  board: CellMark[];
  mistakes: number;
  done: boolean;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  tierFor(mode);
  const { size, regions } = generateCoronas(mode, seed);
  return {
    size,
    regions,
    board: new Array(size * size).fill('empty'),
    mistakes: 0,
    done: false,
  };
}

function crownsConflict(a: number, b: number, regions: readonly number[], size: number): boolean {
  const ra = Math.floor(a / size);
  const ca = a % size;
  const rb = Math.floor(b / size);
  const cb = b % size;
  if (ra === rb || ca === cb || regions[a] === regions[b]) return true;
  return Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1;
}

function hasConflict(
  board: readonly CellMark[],
  regions: readonly number[],
  size: number,
  index: number,
): boolean {
  for (let i = 0; i < board.length; i += 1) {
    if (i === index || board[i] !== 'crown') continue;
    if (crownsConflict(index, i, regions, size)) return true;
  }
  return false;
}

/** Todas las coronas actualmente en conflicto (para resaltarlas en vivo, no solo contarlas). */
export function getConflicts(state: GameState): ReadonlySet<number> {
  const crowns: number[] = [];
  state.board.forEach((mark, i) => {
    if (mark === 'crown') crowns.push(i);
  });
  const conflicts = new Set<number>();
  for (const a of crowns) {
    for (const b of crowns) {
      if (a !== b && crownsConflict(a, b, state.regions, state.size)) {
        conflicts.add(a);
        conflicts.add(b);
      }
    }
  }
  return conflicts;
}

function isSolved(board: readonly CellMark[], regions: readonly number[], size: number): boolean {
  const crowns: number[] = [];
  board.forEach((mark, i) => {
    if (mark === 'crown') crowns.push(i);
  });
  if (crowns.length !== size) return false;

  const rows = new Set<number>();
  const cols = new Set<number>();
  const regionsUsed = new Set<number>();
  for (const index of crowns) {
    rows.add(Math.floor(index / size));
    cols.add(index % size);
    regionsUsed.add(regions[index]!);
  }
  if (rows.size !== size || cols.size !== size || regionsUsed.size !== size) return false;

  for (const a of crowns) {
    for (const b of crowns) {
      if (a !== b && crownsConflict(a, b, regions, size)) return false;
    }
  }
  return true;
}

/** Cicla una celda: vacía → marca (X, ayuda de descarte) → corona → vacía. */
export function cycleCell(state: GameState, index: number): GameState {
  if (state.done) return state;
  const board = [...state.board];
  const current = board[index]!;
  const next: CellMark = current === 'empty' ? 'x' : current === 'x' ? 'crown' : 'empty';
  board[index] = next;

  const mistakes =
    next === 'crown' && hasConflict(board, state.regions, state.size, index)
      ? state.mistakes + 1
      : state.mistakes;

  const done = isSolved(board, state.regions, state.size);
  return { ...state, board, mistakes, done };
}

const BASE_POINTS = 100;
const MISTAKE_PENALTY = 0.08;
const MIN_EFFICIENCY = 0.2;
const EASY_SIZE = MODE_PARAMS.easy.size;

function computeScore(mode: ModeId, state: GameState): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const sizeWeight = (state.size * state.size) / (EASY_SIZE * EASY_SIZE);
  const efficiency = Math.max(MIN_EFFICIENCY, 1 - state.mistakes * MISTAKE_PENALTY);
  return Math.round(BASE_POINTS * sizeWeight * efficiency);
}

export interface CoronasMetrics extends Record<string, number> {
  mistakes: number;
  size: number;
}

export function buildResult(
  config: GameConfig,
  state: GameState,
  durationMs: number,
  completed = true,
): GameResult {
  return {
    gameId: 'coronas',
    mode: config.mode,
    score: computeScore(config.mode, state),
    completed,
    durationMs,
    metrics: {
      mistakes: state.mistakes,
      size: state.size,
    },
    timestamp: new Date().toISOString(),
  };
}
