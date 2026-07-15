import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { createRng, type Rng } from '../../core/random';

// Lógica pura de "Sol y luna" — sin React ni DOM. Grilla 6×6, dos símbolos
// (sol/luna): cada fila y columna tiene 3 de cada símbolo, nunca 3 iguales
// consecutivas, y ninguna fila ni columna se repite exactamente. Nombre
// original (PRD 11.2): el género genérico es "Binairo"/"Takuzu" (nombres de
// dominio público) con el agregado de pistas de igualdad/diferencia entre
// pares de celdas adyacentes — se evita el nombre "Tango" (producto de
// LinkedIn en el que se inspira).
//
// Nota de diseño (ajuste sobre el plan original): con SOLO pistas
// relacionales (=/×) invertir sol↔luna en TODO el tablero preserva
// exactamente las mismas relaciones, así que ninguna cantidad de pistas de
// relación puede romper esa simetría global por sí sola — el tablero nunca
// sería único. Por eso se revela también un puñado fijo de celdas absolutas
// (ABSOLUTE_GIVENS) que ancla esa simetría, igual que hace el "Tango" real
// (que combina ambos tipos de pista). La dificultad varía la cantidad de
// pistas de relación, no las celdas absolutas.
//
// Se genera y verifica en vivo (grilla 6×6 fija en las 3 dificultades):
// arma una solución completa, ancla 2 celdas absolutas al azar y parte de
// las 60 pistas de relación posibles reveladas (unicidad trivial con todo
// dado); saca pistas de a una en orden al azar mientras la solución siga
// siendo única, hasta llegar al número objetivo de la dificultad — mismo
// criterio que el verificador de unicidad de Nonograma/Minisudoku/Coronas.
// Ronda única de pensamiento, como esos tres: no declara Progresivo.

export const SIZE = 6;
const CELL_COUNT = SIZE * SIZE;
const HALF = SIZE / 2;

export type Cell = 0 | 1;
export const SUN: Cell = 0;
export const MOON: Cell = 1;

export interface EdgeClue {
  a: number; // índice de celda (row*SIZE+col), siempre el menor de las dos
  b: number; // celda adyacente: b === a+1 (horizontal) o b === a+SIZE (vertical)
  same: boolean; // true = "=" (mismo símbolo), false = "×" (símbolo distinto)
}

export type Tier = 'easy' | 'medium' | 'hard' | 'zen';

export interface ModeParams extends Record<string, number> {
  edgeClues: number; // cantidad objetivo de pistas de relación reveladas (la palanca de dificultad)
}

export const MODE_PARAMS: Record<Tier, ModeParams> = {
  easy: { edgeClues: 22 },
  medium: { edgeClues: 15 },
  hard: { edgeClues: 9 },
  // Tranquilo: nivel medio, sin puntaje por eficiencia (ADR-007).
  zen: { edgeClues: 15 },
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

// Cantidad fija de celdas absolutas reveladas, independiente de la dificultad
// (ver nota de diseño arriba): ancla la simetría global de inversión.
const ABSOLUTE_GIVENS = 2;

function shuffledIndices(count: number, rng: Rng): number[] {
  const values = Array.from({ length: count }, (_, i) => i);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return values;
}

function hasTriple(seq: readonly Cell[]): boolean {
  for (let i = 0; i + 2 < seq.length; i += 1) {
    if (seq[i] === seq[i + 1] && seq[i + 1] === seq[i + 2]) return true;
  }
  return false;
}

/** Las filas válidas de 6 celdas: 3 soles y 3 lunas, sin 3 iguales consecutivas. */
const VALID_ROWS: readonly Cell[][] = (() => {
  const rows: Cell[][] = [];
  for (let mask = 0; mask < 1 << SIZE; mask += 1) {
    const row: Cell[] = [];
    let ones = 0;
    for (let i = 0; i < SIZE; i += 1) {
      const bit = ((mask >> i) & 1) as Cell;
      row.push(bit);
      ones += bit;
    }
    if (ones === HALF && !hasTriple(row)) rows.push(row);
  }
  return rows;
})();

function edgeKey(a: number, b: number): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

function allAdjacentPairs(): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const index = row * SIZE + col;
      if (col + 1 < SIZE) pairs.push([index, index + 1]);
      if (row + 1 < SIZE) pairs.push([index, index + SIZE]);
    }
  }
  return pairs;
}

const ADJACENT_PAIRS: readonly (readonly [number, number])[] = allAdjacentPairs();

function rowSatisfiesGivens(
  row: number,
  pattern: readonly Cell[],
  given: readonly (Cell | null)[],
): boolean {
  for (let c = 0; c < SIZE; c += 1) {
    const value = given[row * SIZE + c];
    if (value !== null && value !== undefined && value !== pattern[c]) return false;
  }
  return true;
}

function rowSatisfiesHorizontalEdges(
  row: number,
  pattern: readonly Cell[],
  edgeMap: ReadonlyMap<string, boolean>,
): boolean {
  for (let c = 0; c + 1 < SIZE; c += 1) {
    const a = row * SIZE + c;
    const rel = edgeMap.get(edgeKey(a, a + 1));
    if (rel !== undefined && (pattern[c] === pattern[c + 1]) !== rel) return false;
  }
  return true;
}

function rowSatisfiesVerticalEdges(
  row: number,
  pattern: readonly Cell[],
  board: readonly Cell[],
  edgeMap: ReadonlyMap<string, boolean>,
): boolean {
  if (row === 0) return true;
  for (let c = 0; c < SIZE; c += 1) {
    const above = (row - 1) * SIZE + c;
    const rel = edgeMap.get(edgeKey(above, above + SIZE));
    if (rel !== undefined && (board[above] === pattern[c]) !== rel) return false;
  }
  return true;
}

function hasVerticalTriple(row: number, pattern: readonly Cell[], board: readonly Cell[]): boolean {
  if (row < 2) return false;
  for (let c = 0; c < SIZE; c += 1) {
    const v0 = board[(row - 2) * SIZE + c]!;
    const v1 = board[(row - 1) * SIZE + c]!;
    if (v0 === v1 && v1 === pattern[c]) return true;
  }
  return false;
}

function columnCountsOk(row: number, pattern: readonly Cell[], board: readonly Cell[]): boolean {
  for (let c = 0; c < SIZE; c += 1) {
    let ones: number = pattern[c]!;
    for (let r = 0; r < row; r += 1) ones += board[r * SIZE + c]!;
    if (ones > HALF) return false;
    if (row + 1 - ones > HALF) return false;
  }
  return true;
}

function columnsUniqueAndComplete(board: readonly Cell[]): boolean {
  const keys = new Set<string>();
  for (let c = 0; c < SIZE; c += 1) {
    let key = '';
    let ones = 0;
    for (let r = 0; r < SIZE; r += 1) {
      const value = board[r * SIZE + c]!;
      key += value;
      ones += value;
    }
    if (ones !== HALF) return false;
    keys.add(key);
  }
  return keys.size === SIZE;
}

export interface SolveResult {
  count: number;
  first: Cell[] | null;
}

/**
 * Cuenta soluciones hasta `limit` (2 alcanza para saber si un conjunto de
 * pistas es único), respetando celdas absolutas dadas y pistas de relación
 * entre pares adyacentes. `rng` mezcla el orden de exploración de filas —
 * generar una solución al azar lo necesita; verificar unicidad no, y puede
 * omitirlo.
 */
export function countSolutions(
  given: readonly (Cell | null)[],
  edgeMap: ReadonlyMap<string, boolean>,
  limit = 2,
  rng?: Rng,
): SolveResult {
  const board: Cell[] = new Array(CELL_COUNT).fill(SUN);
  const usedRows = new Set<string>();
  let count = 0;
  let first: Cell[] | null = null;

  function backtrack(row: number): void {
    if (count >= limit) return;
    if (row === SIZE) {
      if (columnsUniqueAndComplete(board)) {
        count += 1;
        if (!first) first = board.slice();
      }
      return;
    }
    const order = rng ? shuffledIndices(VALID_ROWS.length, rng) : VALID_ROWS.map((_, i) => i);
    for (const idx of order) {
      if (count >= limit) return;
      const pattern = VALID_ROWS[idx]!;
      const key = pattern.join('');
      if (usedRows.has(key)) continue;
      if (!rowSatisfiesGivens(row, pattern, given)) continue;
      if (!rowSatisfiesHorizontalEdges(row, pattern, edgeMap)) continue;
      if (!rowSatisfiesVerticalEdges(row, pattern, board, edgeMap)) continue;
      if (hasVerticalTriple(row, pattern, board)) continue;
      if (!columnCountsOk(row, pattern, board)) continue;

      for (let c = 0; c < SIZE; c += 1) board[row * SIZE + c] = pattern[c]!;
      usedRows.add(key);
      backtrack(row + 1);
      usedRows.delete(key);
    }
  }

  backtrack(0);
  return { count, first };
}

export interface TakuzuBoard {
  solution: readonly Cell[];
  givenCells: ReadonlySet<number>;
  edgeClues: readonly EdgeClue[];
}

const EMPTY_GIVEN: readonly (Cell | null)[] = new Array(CELL_COUNT).fill(null);
const MAX_GENERATION_ATTEMPTS = 50;

/**
 * Genera un tablero de Sol y luna en vivo: arma una solución completa,
 * ancla `ABSOLUTE_GIVENS` celdas absolutas al azar y parte de las 60 pistas
 * de relación reveladas (unicidad trivial con todo dado); saca pistas de a
 * una en orden al azar mientras la solución siga siendo única, hasta llegar
 * al objetivo de la dificultad. Si el punto de partida no fuera único
 * (no debería pasar) o el crecimiento queda corto, reintenta con un tablero
 * nuevo — no llega nunca a un tablero sin solución única.
 */
export function generateTakuzu(mode: ModeId, seed: number): TakuzuBoard {
  const targetEdgeClues = getModeParams(mode).edgeClues;
  const rng = createRng(seed);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const { first: solution } = countSolutions(EMPTY_GIVEN, new Map(), 1, rng);
    if (!solution) continue;

    const anchorIndices = shuffledIndices(CELL_COUNT, rng).slice(0, ABSOLUTE_GIVENS);
    const given: (Cell | null)[] = new Array(CELL_COUNT).fill(null);
    for (const index of anchorIndices) given[index] = solution[index]!;

    const edgeMap = new Map<string, boolean>(
      ADJACENT_PAIRS.map(([a, b]) => [edgeKey(a, b), solution[a] === solution[b]]),
    );
    if (countSolutions(given, edgeMap, 2).count !== 1) continue;

    const edgeOrder = shuffledIndices(ADJACENT_PAIRS.length, rng);
    for (const idx of edgeOrder) {
      if (edgeMap.size <= targetEdgeClues) break;
      const [a, b] = ADJACENT_PAIRS[idx]!;
      const key = edgeKey(a, b);
      const same = edgeMap.get(key);
      if (same === undefined) continue;
      edgeMap.delete(key);
      if (countSolutions(given, edgeMap, 2).count !== 1) {
        edgeMap.set(key, same);
      }
    }

    const edgeClues: EdgeClue[] = Array.from(edgeMap.entries()).map(([key, same]) => {
      const [a, b] = key.split(',').map(Number);
      return { a: a!, b: b!, same };
    });

    return { solution, givenCells: new Set(anchorIndices), edgeClues };
  }

  throw new Error('No se pudo generar un tablero de Sol y luna con solución única');
}

export interface GameState {
  mode: ModeId;
  solution: readonly Cell[];
  givenCells: ReadonlySet<number>;
  edgeClues: readonly EdgeClue[];
  board: (Cell | null)[]; // celdas absolutas + lo que completó el jugador
  mistakes: number;
  done: boolean;
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  tierFor(mode);
  const { solution, givenCells, edgeClues } = generateTakuzu(mode, seed);
  const board: (Cell | null)[] = solution.map((value, i) => (givenCells.has(i) ? value : null));
  return { mode, solution, givenCells, edgeClues, board, mistakes: 0, done: false };
}

export function isGivenCell(state: GameState, index: number): boolean {
  return state.givenCells.has(index);
}

/** Cicla una celda editable: vacía → sol → luna → vacía. */
export function cycleCell(state: GameState, index: number): GameState {
  if (state.done || isGivenCell(state, index)) return state;
  const board = [...state.board];
  const current = board[index];
  const next: Cell | null = current === null ? SUN : current === SUN ? MOON : null;
  board[index] = next;

  const wasWrong = next !== null && next !== state.solution[index];
  const mistakes = state.mistakes + (wasWrong ? 1 : 0);
  const done = board.every((value, i) => value === state.solution[i]);

  return { ...state, board, mistakes, done };
}

const BASE_POINTS = 100;
const MISTAKE_PENALTY = 0.05;
const MIN_EFFICIENCY = 0.2;
const EASY_EDGE_CLUES = MODE_PARAMS.easy.edgeClues;

function computeScore(mode: ModeId, state: GameState): number {
  if (mode === 'zen') return BASE_POINTS; // Tranquilo: sin bono, no compite (ADR-007)
  const clueWeight = EASY_EDGE_CLUES / Math.max(1, state.edgeClues.length);
  const efficiency = Math.max(MIN_EFFICIENCY, 1 - state.mistakes * MISTAKE_PENALTY);
  return Math.round(BASE_POINTS * clueWeight * efficiency);
}

export interface TakuzuMetrics extends Record<string, number> {
  mistakes: number;
  edgeClues: number;
}

export function buildResult(
  config: GameConfig,
  state: GameState,
  durationMs: number,
  completed = true,
): GameResult {
  return {
    gameId: 'takuzu',
    mode: config.mode,
    score: computeScore(config.mode, state),
    completed,
    durationMs,
    metrics: {
      mistakes: state.mistakes,
      edgeClues: state.edgeClues.length,
    },
    timestamp: new Date().toISOString(),
  };
}
