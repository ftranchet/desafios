import { describe, expect, it } from 'vitest';
import {
  buildResult,
  createInitialState,
  isGivenCell,
  MODE_PARAMS,
  selectPuzzle,
  setCell,
} from './logic';
import { PUZZLES_BY_TIER } from './puzzles';

const SEED = 123;

describe('banco de puzzles', () => {
  it('cada puzzle coincide con su solución en todas las celdas dadas', () => {
    for (const bank of Object.values(PUZZLES_BY_TIER)) {
      for (const { puzzle, solution } of bank) {
        expect(puzzle).toHaveLength(81);
        expect(solution).toHaveLength(81);
        puzzle.forEach((value, i) => {
          if (value !== 0) expect(value).toBe(solution[i]);
        });
      }
    }
  });

  it('cada solución es una grilla de Sudoku válida (sin repetidos en fila/columna/caja)', () => {
    for (const bank of Object.values(PUZZLES_BY_TIER)) {
      for (const { solution } of bank) {
        for (let r = 0; r < 9; r += 1) {
          const row = new Set(solution.slice(r * 9, r * 9 + 9));
          expect(row.size).toBe(9);
        }
        for (let c = 0; c < 9; c += 1) {
          const col = new Set(Array.from({ length: 9 }, (_, r) => solution[r * 9 + c]));
          expect(col.size).toBe(9);
        }
        for (let br = 0; br < 3; br += 1) {
          for (let bc = 0; bc < 3; bc += 1) {
            const box = new Set<number>();
            for (let i = 0; i < 3; i += 1) {
              for (let j = 0; j < 3; j += 1) {
                box.add(solution[(br * 3 + i) * 9 + (bc * 3 + j)]!);
              }
            }
            expect(box.size).toBe(9);
          }
        }
      }
    }
  });
});

describe('selectPuzzle', () => {
  it('misma semilla, mismo puzzle', () => {
    expect(selectPuzzle('medium', SEED)).toEqual(selectPuzzle('medium', SEED));
  });

  it('elige un puzzle del banco correcto según el modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const puzzle = selectPuzzle(mode, SEED);
      expect(PUZZLES_BY_TIER[mode]).toContainEqual(puzzle);
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
    const wrongValue = ((correctValue % 9) + 1) as number;
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
    const wrongValue = ((correctValue % 9) + 1) as number;
    const once = setCell(state, emptyIndex, wrongValue);
    const twice = setCell(once, emptyIndex, wrongValue);
    expect(twice).toBe(once); // sin cambios: mismo valor, no vuelve a contar
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
      if (value === 0) {
        state = setCell(state, i, state.solution[i]!);
      }
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
    expect(result.gameId).toBe('sudoku');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(1234);
    expect(result.metrics.cellsToFill).toBe(81 - MODE_PARAMS.easy.givens);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntaje fijo, sin importar los errores', () => {
    let state = createInitialState('zen', SEED);
    const emptyIndex = state.puzzle.findIndex((v) => v === 0);
    const wrongValue = ((state.solution[emptyIndex]! % 9) + 1) as number;
    state = setCell(state, emptyIndex, wrongValue);
    const result = buildResult({ mode: 'zen', seed: SEED }, state, 1000);
    expect(result.score).toBe(100);
  });

  it('menos errores puntúa más que más errores', () => {
    const cleanState = createInitialState('easy', SEED);
    let dirtyState = createInitialState('easy', SEED);
    const emptyIndex = dirtyState.puzzle.findIndex((v) => v === 0);
    const wrongValue = ((dirtyState.solution[emptyIndex]! % 9) + 1) as number;
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
