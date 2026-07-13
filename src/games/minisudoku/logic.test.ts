import { describe, expect, it } from 'vitest';
import {
  BOX_COLS,
  BOX_ROWS,
  SIZE,
  buildResult,
  countSolutions,
  createInitialState,
  generateMinisudoku,
  isGivenCell,
  MODE_PARAMS,
  setCell,
} from './logic';

const SEED = 123;

function isValidSolution(solution: readonly number[]): boolean {
  for (let r = 0; r < SIZE; r += 1) {
    const row = new Set(solution.slice(r * SIZE, r * SIZE + SIZE));
    if (row.size !== SIZE) return false;
  }
  for (let c = 0; c < SIZE; c += 1) {
    const col = new Set(Array.from({ length: SIZE }, (_, r) => solution[r * SIZE + c]));
    if (col.size !== SIZE) return false;
  }
  for (let br = 0; br < SIZE / BOX_ROWS; br += 1) {
    for (let bc = 0; bc < SIZE / BOX_COLS; bc += 1) {
      const box = new Set<number>();
      for (let i = 0; i < BOX_ROWS; i += 1) {
        for (let j = 0; j < BOX_COLS; j += 1) {
          box.add(solution[(br * BOX_ROWS + i) * SIZE + (bc * BOX_COLS + j)]!);
        }
      }
      if (box.size !== SIZE) return false;
    }
  }
  return true;
}

describe('generateMinisudoku', () => {
  it('misma semilla, mismo puzzle', () => {
    expect(generateMinisudoku('medium', SEED)).toEqual(generateMinisudoku('medium', SEED));
  });

  it('la solución es una grilla 6×6 válida (sin repetidos en fila/columna/caja)', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const { solution } = generateMinisudoku(mode, SEED);
      expect(solution).toHaveLength(36);
      expect(isValidSolution(solution)).toBe(true);
    }
  });

  it('el puzzle coincide con la solución en todas las celdas dadas', () => {
    const { puzzle, solution } = generateMinisudoku('medium', SEED);
    puzzle.forEach((value, i) => {
      if (value !== 0) expect(value).toBe(solution[i]);
    });
  });

  // El corazón de este juego: a diferencia del Sudoku 9×9 (banco curado), acá
  // se genera y verifica en vivo — este test es el que de verdad confirma que
  // el verificador de unicidad hace su trabajo, en varias semillas y modos.
  it('el puzzle generado tiene siempre solución única', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      for (const seed of [1, 42, 123, 999, 7]) {
        const { puzzle } = generateMinisudoku(mode, seed);
        const asNullable = puzzle.map((v) => (v === 0 ? null : v));
        expect(countSolutions(asNullable, 2)).toBe(1);
      }
    }
  });

  it('el número de celdas dadas se acerca al parámetro de dificultad', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const { puzzle } = generateMinisudoku(mode, SEED);
      const givens = puzzle.filter((v) => v !== 0).length;
      expect(givens).toBeLessThanOrEqual(MODE_PARAMS[mode].givens);
    }
  });
});

describe('createInitialState', () => {
  it('misma semilla, misma partida', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('arranca con el tablero igual al puzzle (vacías como null) y sin errores', () => {
    const state = createInitialState('easy', SEED);
    expect(state.mistakes).toBe(0);
    expect(state.done).toBe(false);
    state.puzzle.forEach((value, i) => {
      expect(state.board[i]).toBe(value === 0 ? null : value);
    });
  });
});

describe('isGivenCell / setCell', () => {
  it('no permite editar una celda dada', () => {
    const state = createInitialState('easy', SEED);
    const givenIndex = state.puzzle.findIndex((v) => v !== 0);
    expect(isGivenCell(state, givenIndex)).toBe(true);
    const next = setCell(state, givenIndex, 5);
    expect(next).toBe(state);
  });

  it('completar una celda vacía con el valor correcto no suma errores', () => {
    const state = createInitialState('easy', SEED);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const correctValue = state.solution[emptyIndex]!;
    const next = setCell(state, emptyIndex, correctValue);
    expect(next.board[emptyIndex]).toBe(correctValue);
    expect(next.mistakes).toBe(0);
  });

  it('completar con un valor incorrecto suma un error, pero se puede corregir', () => {
    const state = createInitialState('easy', SEED);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const correctValue = state.solution[emptyIndex]!;
    const wrongValue = (correctValue % SIZE) + 1;
    const withMistake = setCell(state, emptyIndex, wrongValue);
    expect(withMistake.mistakes).toBe(1);
    const corrected = setCell(withMistake, emptyIndex, correctValue);
    expect(corrected.board[emptyIndex]).toBe(correctValue);
    expect(corrected.mistakes).toBe(1); // el error ya cometido no se descuenta
  });

  it('repetir el mismo valor no suma un error extra (no hubo cambio)', () => {
    const state = createInitialState('easy', SEED);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const correctValue = state.solution[emptyIndex]!;
    const wrongValue = (correctValue % SIZE) + 1;
    const once = setCell(state, emptyIndex, wrongValue);
    const twice = setCell(once, emptyIndex, wrongValue);
    expect(twice).toBe(once);
  });

  it('borrar una celda (null) nunca cuenta como error', () => {
    const state = createInitialState('easy', SEED);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const filled = setCell(state, emptyIndex, 1);
    const cleared = setCell(filled, emptyIndex, null);
    expect(cleared.board[emptyIndex]).toBeNull();
    expect(cleared.mistakes).toBe(filled.mistakes);
  });

  it('completar todas las celdas correctamente marca done', () => {
    let state = createInitialState('easy', SEED);
    state.puzzle.forEach((value, i) => {
      if (value === 0) state = setCell(state, i, state.solution[i]!);
    });
    expect(state.done).toBe(true);
  });

  it('no hace nada si la partida ya terminó', () => {
    let state = createInitialState('easy', SEED);
    state.puzzle.forEach((value, i) => {
      if (value === 0) state = setCell(state, i, state.solution[i]!);
    });
    expect(state.done).toBe(true);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const untouched = setCell(state, emptyIndex, null);
    expect(untouched).toBe(state);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe('minisudoku');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(1234);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntaje fijo, sin importar los errores', () => {
    let state = createInitialState('zen', SEED);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const wrongValue = ((state.solution[emptyIndex]! % SIZE) + 1) as number;
    state = setCell(state, emptyIndex, wrongValue);
    const result = buildResult({ mode: 'zen', seed: SEED }, state, 1000);
    expect(result.score).toBe(100);
  });

  it('menos errores puntúa más que más errores', () => {
    const cleanState = createInitialState('easy', SEED);
    let dirtyState = createInitialState('easy', SEED);
    const emptyIndex = dirtyState.puzzle.findIndex((v) => v === 0);
    const wrongValue = (dirtyState.solution[emptyIndex]! % SIZE) + 1;
    dirtyState = setCell(dirtyState, emptyIndex, wrongValue);

    const cleanResult = buildResult({ mode: 'easy', seed: SEED }, cleanState, 1000);
    const dirtyResult = buildResult({ mode: 'easy', seed: SEED }, dirtyState, 1000);
    expect(cleanResult.score).toBeGreaterThan(dirtyResult.score);
  });

  it('un puzzle más difícil (menos celdas dadas) pesa más en el puntaje', () => {
    const easyState = createInitialState('easy', SEED);
    const hardState = createInitialState('hard', SEED);
    const easyResult = buildResult({ mode: 'easy', seed: SEED }, easyState, 1000);
    const hardResult = buildResult({ mode: 'hard', seed: SEED }, hardState, 1000);
    expect(hardResult.score).toBeGreaterThan(easyResult.score);
  });
});
