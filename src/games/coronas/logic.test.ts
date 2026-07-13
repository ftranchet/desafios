import { describe, expect, it } from 'vitest';
import {
  buildResult,
  countCrownSolutions,
  createInitialState,
  cycleCell,
  generateCoronas,
  getConflicts,
  MODE_PARAMS,
  solveCoronas,
  type CellMark,
} from './logic';

const SEED = 123;
const SEEDS = [1, 42, 123, 999, 7];

function isConnected(regions: readonly number[], size: number, region: number): boolean {
  const cells = regions.reduce<number[]>((acc, r, i) => (r === region ? [...acc, i] : acc), []);
  if (cells.length === 0) return false;
  const visited = new Set<number>([cells[0]!]);
  const queue = [cells[0]!];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const row = Math.floor(cell / size);
    const col = cell % size;
    const neighbors = [
      row > 0 ? cell - size : -1,
      row < size - 1 ? cell + size : -1,
      col > 0 ? cell - 1 : -1,
      col < size - 1 ? cell + 1 : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && regions[n] === region && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited.size === cells.length;
}

describe('generateCoronas', () => {
  it('misma semilla, mismo tablero', () => {
    expect(generateCoronas('medium', SEED)).toEqual(generateCoronas('medium', SEED));
  });

  it('cada tablero cubre toda la grilla con exactamente `size` regiones conexas', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const { size, regions } = generateCoronas(mode, SEED);
      expect(regions).toHaveLength(size * size);
      const present = new Set(regions);
      expect(present.size).toBe(size);
      for (let region = 0; region < size; region += 1) {
        expect(isConnected(regions, size, region)).toBe(true);
      }
    }
  });

  // El corazón de este juego: generación en vivo con verificador de unicidad
  // (a diferencia de Un trazo/Enlaces, planificados como banco curado porque
  // ahí verificar es más caro — ver docs/game-plans). Confirma que, en varias
  // semillas y modos, nunca se cuela un tablero ambiguo.
  it('el tablero generado tiene siempre solución única', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      for (const seed of SEEDS) {
        const { size, regions } = generateCoronas(mode, seed);
        expect(countCrownSolutions(regions, size, 2)).toBe(1);
      }
    }
  });

  it('el tamaño de grilla respeta el parámetro de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const { size } = generateCoronas(mode, SEED);
      expect(size).toBe(MODE_PARAMS[mode].size);
    }
  });
});

describe('createInitialState', () => {
  it('misma semilla, misma partida', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('arranca con la grilla vacía, sin errores y sin terminar', () => {
    const state = createInitialState('easy', SEED);
    expect(state.board.every((mark) => mark === 'empty')).toBe(true);
    expect(state.mistakes).toBe(0);
    expect(state.done).toBe(false);
  });
});

describe('cycleCell', () => {
  it('cicla vacía → marca → corona → vacía', () => {
    const state = createInitialState('easy', SEED);
    const marked = cycleCell(state, 0);
    expect(marked.board[0]).toBe<CellMark>('x');
    const crowned = cycleCell(marked, 0);
    expect(crowned.board[0]).toBe<CellMark>('crown');
    const cleared = cycleCell(crowned, 0);
    expect(cleared.board[0]).toBe<CellMark>('empty');
  });

  it('dos coronas en la misma fila generan un conflicto y suman un error', () => {
    const state = createInitialState('easy', SEED);
    // Fila 0: dos coronas en columnas separadas (evita el conflicto de adyacencia).
    let next = cycleCell(state, 0); // x
    next = cycleCell(next, 0); // crown en (0,0)
    next = cycleCell(next, 3); // x
    next = cycleCell(next, 3); // crown en (0,3): misma fila que (0,0)
    expect(getConflicts(next).has(0)).toBe(true);
    expect(getConflicts(next).has(3)).toBe(true);
    expect(next.mistakes).toBe(1);
  });

  it('resolver el tablero real (coronas en la solución única) marca done', () => {
    const state = createInitialState('easy', SEED);
    const columns = solveCoronas(state.regions, state.size);
    expect(columns).not.toBeNull();
    let solved = state;
    columns!.forEach((col, row) => {
      const index = row * state.size + col;
      solved = cycleCell(solved, index); // x
      solved = cycleCell(solved, index); // crown
    });
    expect(solved.done).toBe(true);
    expect(getConflicts(solved).size).toBe(0);
  });

  it('no hace nada si la partida ya terminó', () => {
    const state = createInitialState('easy', SEED);
    const columns = solveCoronas(state.regions, state.size)!;
    let solved = state;
    columns.forEach((col, row) => {
      const index = row * state.size + col;
      solved = cycleCell(solved, index);
      solved = cycleCell(solved, index);
    });
    expect(solved.done).toBe(true);
    const untouched = cycleCell(solved, 0);
    expect(untouched).toBe(solved);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe('coronas');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(1234);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntaje fijo, sin importar los errores', () => {
    const state = createInitialState('zen', SEED);
    let dirty = cycleCell(state, 0);
    dirty = cycleCell(dirty, 0);
    dirty = cycleCell(dirty, 1);
    dirty = cycleCell(dirty, 1); // misma fila: conflicto
    const result = buildResult({ mode: 'zen', seed: SEED }, dirty, 1000);
    expect(result.score).toBe(100);
  });

  it('menos errores puntúa más que más errores', () => {
    const cleanState = createInitialState('easy', SEED);
    let dirtyState = createInitialState('easy', SEED);
    dirtyState = cycleCell(dirtyState, 0);
    dirtyState = cycleCell(dirtyState, 0);
    dirtyState = cycleCell(dirtyState, 1);
    dirtyState = cycleCell(dirtyState, 1); // conflicto: mismo fila

    const cleanResult = buildResult({ mode: 'easy', seed: SEED }, cleanState, 1000);
    const dirtyResult = buildResult({ mode: 'easy', seed: SEED }, dirtyState, 1000);
    expect(cleanResult.score).toBeGreaterThan(dirtyResult.score);
  });

  it('una grilla más grande (más difícil) pesa más en el puntaje', () => {
    const easyState = createInitialState('easy', SEED);
    const hardState = createInitialState('hard', SEED);
    const easyResult = buildResult({ mode: 'easy', seed: SEED }, easyState, 1000);
    const hardResult = buildResult({ mode: 'hard', seed: SEED }, hardState, 1000);
    expect(hardResult.score).toBeGreaterThan(easyResult.score);
  });
});
