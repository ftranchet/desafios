import { describe, expect, it } from 'vitest';
import {
  buildResult,
  cluesForLine,
  computeClues,
  createInitialState,
  MODE_PARAMS,
  selectImage,
  toggleCell,
} from './logic';
import { IMAGES_BY_TIER } from './puzzles';

const SEED = 123;

describe('banco de imágenes', () => {
  it('cada imagen tiene rows*cols valores, todos 0 o 1', () => {
    for (const bank of Object.values(IMAGES_BY_TIER)) {
      for (const { image, rows, cols } of bank) {
        expect(image).toHaveLength(rows * cols);
        image.forEach((value) => expect([0, 1]).toContain(value));
      }
    }
  });

  it('ninguna imagen es todo-blanco (habría cero pistas)', () => {
    for (const bank of Object.values(IMAGES_BY_TIER)) {
      for (const { image } of bank) {
        expect(image.some((value) => value === 1)).toBe(true);
      }
    }
  });
});

describe('cluesForLine', () => {
  it('línea vacía → sin pistas', () => {
    expect(cluesForLine([0, 0, 0, 0])).toEqual([]);
  });

  it('un solo bloque', () => {
    expect(cluesForLine([0, 1, 1, 0])).toEqual([2]);
  });

  it('varios bloques separados', () => {
    expect(cluesForLine([1, 0, 1, 1, 0, 1])).toEqual([1, 2, 1]);
  });

  it('línea llena', () => {
    expect(cluesForLine([1, 1, 1])).toEqual([3]);
  });
});

describe('computeClues', () => {
  it('deriva filas y columnas de una grilla 3x3 conocida', () => {
    // 1 0 1
    // 0 1 0
    // 1 1 1
    const image = [1, 0, 1, 0, 1, 0, 1, 1, 1];
    const { rowClues, colClues } = computeClues(image, 3, 3);
    expect(rowClues).toEqual([[1, 1], [1], [3]]);
    expect(colClues).toEqual([[1, 1], [2], [1, 1]]);
  });
});

// El banco de imágenes se documenta como "verificado con un solver de
// propagación + backtracking" (ver puzzles.ts) pero nada lo comprobaba en
// código: si alguien edita una imagen a mano y rompe la unicidad, nada lo
// detecta. Este solver de fuerza bruta (con poda por columna) cuenta
// soluciones hasta un tope de 2 y confirma que cada imagen del banco admite
// exactamente una.
function lineFillings(clue: readonly number[], length: number): number[][] {
  const k = clue.length;
  if (k === 0) return [Array(length).fill(0)];
  const sumGroups = clue.reduce((a, b) => a + b, 0);
  const free = length - sumGroups - (k - 1);
  if (free < 0) return [];
  const results: number[][] = [];
  const gaps: number[] = [];
  function recurse(slot: number, remaining: number): void {
    if (slot === k + 1) {
      if (remaining !== 0) return;
      const row: number[] = [];
      for (let i = 0; i < k; i += 1) {
        row.push(...(Array(gaps[i]).fill(0) as number[]));
        if (i > 0) row.push(0);
        row.push(...(Array(clue[i]).fill(1) as number[]));
      }
      row.push(...(Array(gaps[k]).fill(0) as number[]));
      results.push(row);
      return;
    }
    for (let g = 0; g <= remaining; g += 1) {
      gaps[slot] = g;
      recurse(slot + 1, remaining - g);
    }
  }
  recurse(0, free);
  return results;
}

function countSolutions(
  rowClues: number[][],
  colClues: number[][],
  rows: number,
  cols: number,
  limit: number,
): number {
  const rowOptions = rowClues.map((clue) => lineFillings(clue, cols));
  const colOptions = colClues.map((clue) => lineFillings(clue, rows));
  const grid: number[][] = [];
  let count = 0;

  function columnsFeasible(uptoRow: number): boolean {
    for (let c = 0; c < cols; c += 1) {
      const prefix: number[] = [];
      for (let r = 0; r <= uptoRow; r += 1) prefix.push(grid[r]![c]!);
      const ok = colOptions[c]!.some((filling) => prefix.every((v, i) => filling[i] === v));
      if (!ok) return false;
    }
    return true;
  }

  function backtrack(r: number): void {
    if (count >= limit) return;
    if (r === rows) {
      count += 1;
      return;
    }
    for (const rowPattern of rowOptions[r]!) {
      grid[r] = rowPattern;
      if (columnsFeasible(r)) {
        backtrack(r + 1);
        if (count >= limit) return;
      }
    }
  }
  backtrack(0);
  return count;
}

describe('unicidad de solución del banco de imágenes', () => {
  it('cada imagen es la única solución posible de sus propias pistas', () => {
    for (const bank of Object.values(IMAGES_BY_TIER)) {
      for (const { image, rows, cols } of bank) {
        const { rowClues, colClues } = computeClues(image, rows, cols);
        expect(countSolutions(rowClues, colClues, rows, cols, 2)).toBe(1);
      }
    }
  });
});

describe('selectImage', () => {
  it('misma semilla, misma imagen', () => {
    expect(selectImage('medium', SEED)).toEqual(selectImage('medium', SEED));
  });

  it('elige una imagen del banco correcto según el modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const image = selectImage(mode, SEED);
      expect(IMAGES_BY_TIER[mode]).toContainEqual(image);
    }
  });
});

describe('createInitialState', () => {
  it('misma semilla, misma partida', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('arranca con el tablero vacío, sin toques y sin terminar', () => {
    const state = createInitialState('easy', SEED);
    expect(state.taps).toBe(0);
    expect(state.done).toBe(false);
    expect(state.board.every((value) => value === 0)).toBe(true);
  });
});

describe('toggleCell', () => {
  it('pinta una celda vacía y suma un toque', () => {
    const state = createInitialState('easy', SEED);
    const next = toggleCell(state, 0);
    expect(next.board[0]).toBe(1);
    expect(next.taps).toBe(1);
  });

  it('despinta una celda pintada', () => {
    const state = createInitialState('easy', SEED);
    const painted = toggleCell(state, 0);
    const cleared = toggleCell(painted, 0);
    expect(cleared.board[0]).toBe(0);
    expect(cleared.taps).toBe(2);
  });

  it('pintar todas las celdas según la imagen marca done', () => {
    let state = createInitialState('easy', SEED);
    state.puzzle.image.forEach((value, i) => {
      if (value === 1) state = toggleCell(state, i);
    });
    expect(state.done).toBe(true);
  });

  it('no hace nada si la partida ya terminó', () => {
    let state = createInitialState('easy', SEED);
    state.puzzle.image.forEach((value, i) => {
      if (value === 1) state = toggleCell(state, i);
    });
    expect(state.done).toBe(true);
    const untouched = toggleCell(state, 0);
    expect(untouched).toBe(state);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe('nonogram');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(1234);
    expect(result.metrics.cellCount).toBe(MODE_PARAMS.easy.cellCount);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntaje fijo, sin importar los toques', () => {
    const state = createInitialState('zen', SEED);
    const result = buildResult({ mode: 'zen', seed: SEED }, state, 1000);
    expect(result.score).toBe(100);
  });

  it('menos toques (más eficiencia) puntúa más que más toques', () => {
    const { image } = createInitialState('easy', SEED).puzzle;
    const filledIndices = image.flatMap((value, i) => (value === 1 ? [i] : []));
    const emptyIndex = image.findIndex((value) => value === 0);
    const lastFilledIndex = filledIndices[filledIndices.length - 1]!;

    let efficientState = createInitialState('easy', SEED);
    filledIndices.forEach((i) => {
      efficientState = toggleCell(efficientState, i);
    });
    expect(efficientState.done).toBe(true);

    // Mismo tablero final, pero pinta y despinta una celda vacía de más antes
    // de completar el último acierto: no queda "done" antes de tiempo.
    let wastefulState = createInitialState('easy', SEED);
    filledIndices.slice(0, -1).forEach((i) => {
      wastefulState = toggleCell(wastefulState, i);
    });
    wastefulState = toggleCell(wastefulState, emptyIndex);
    wastefulState = toggleCell(wastefulState, emptyIndex);
    wastefulState = toggleCell(wastefulState, lastFilledIndex);
    expect(wastefulState.done).toBe(true);
    expect(wastefulState.taps).toBe(efficientState.taps + 2);

    const efficientResult = buildResult({ mode: 'easy', seed: SEED }, efficientState, 1000);
    const wastefulResult = buildResult({ mode: 'easy', seed: SEED }, wastefulState, 1000);
    expect(efficientResult.score).toBeGreaterThan(wastefulResult.score);
  });

  it('una imagen más grande pesa más en el puntaje (a igual eficiencia)', () => {
    let easyState = createInitialState('easy', SEED);
    easyState.puzzle.image.forEach((value, i) => {
      if (value === 1) easyState = toggleCell(easyState, i);
    });
    let hardState = createInitialState('hard', SEED);
    hardState.puzzle.image.forEach((value, i) => {
      if (value === 1) hardState = toggleCell(hardState, i);
    });

    const easyResult = buildResult({ mode: 'easy', seed: SEED }, easyState, 1000);
    const hardResult = buildResult({ mode: 'hard', seed: SEED }, hardState, 1000);
    expect(hardResult.score).toBeGreaterThan(easyResult.score);
  });
});
