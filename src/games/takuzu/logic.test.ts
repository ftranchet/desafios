import { describe, expect, it } from 'vitest';
import {
  countSolutions,
  createInitialState,
  cycleCell,
  buildResult,
  generateTakuzu,
  getModeParams,
  isGivenCell,
  MOON,
  SIZE,
  SUN,
  type Cell,
} from './logic';

// Tests con semilla fija (PRD 12.3): generación, jugada y puntaje.

const SEED = 123;
const MODES = ['easy', 'medium', 'hard', 'zen'] as const;

function edgeMapOf(state: ReturnType<typeof createInitialState>): Map<string, boolean> {
  return new Map(
    state.edgeClues.map((edge) => [`${Math.min(edge.a, edge.b)},${Math.max(edge.a, edge.b)}`, edge.same]),
  );
}

function givenArrayOf(state: ReturnType<typeof createInitialState>): (Cell | null)[] {
  return state.solution.map((value, i) => (state.givenCells.has(i) ? value : null));
}

describe('takuzu: generación', () => {
  it('misma semilla, mismo tablero', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('semillas distintas dan tableros distintos', () => {
    const a = createInitialState('medium', 1);
    const b = createInitialState('medium', 2);
    expect(a.solution).not.toEqual(b.solution);
  });

  it('la solución cumple las reglas de Sol y luna en las 4 dificultades y varias semillas', () => {
    for (const mode of MODES) {
      for (const seed of [1, 2, 3, 42]) {
        const { solution } = generateTakuzu(mode, seed);
        expect(solution.length).toBe(SIZE * SIZE);

        for (let row = 0; row < SIZE; row += 1) {
          const line = solution.slice(row * SIZE, row * SIZE + SIZE);
          expect(line.filter((v) => v === SUN).length).toBe(SIZE / 2);
          expect(line.filter((v) => v === MOON).length).toBe(SIZE / 2);
          for (let i = 0; i + 2 < line.length; i += 1) {
            expect(line[i] === line[i + 1] && line[i + 1] === line[i + 2]).toBe(false);
          }
        }

        const rowKeys = new Set<string>();
        const colKeys = new Set<string>();
        for (let row = 0; row < SIZE; row += 1) {
          rowKeys.add(solution.slice(row * SIZE, row * SIZE + SIZE).join(''));
        }
        for (let col = 0; col < SIZE; col += 1) {
          let key = '';
          let ones = 0;
          for (let row = 0; row < SIZE; row += 1) {
            const v = solution[row * SIZE + col]!;
            key += v;
            ones += v;
          }
          expect(ones).toBe(SIZE / 2);
          colKeys.add(key);
        }
        expect(rowKeys.size).toBe(SIZE);
        expect(colKeys.size).toBe(SIZE);
      }
    }
  });

  it('el tablero generado tiene siempre solución única, en las 4 dificultades y varias semillas', () => {
    for (const mode of MODES) {
      for (const seed of [1, 2, 3, 42, 999]) {
        const state = createInitialState(mode, seed);
        const result = countSolutions(givenArrayOf(state), edgeMapOf(state), 2);
        expect(result.count).toBe(1);
        expect(result.first).toEqual(state.solution);
      }
    }
  });

  it('la cantidad de pistas de relación respeta (aprox.) el parámetro de cada dificultad', () => {
    for (const mode of MODES) {
      const target = getModeParams(mode).edgeClues;
      const state = createInitialState(mode, SEED);
      // El generador puede quedarse por encima del objetivo si no encuentra
      // más remociones seguras (documentado en generateTakuzu); nunca por debajo.
      expect(state.edgeClues.length).toBeGreaterThanOrEqual(target);
    }
  });

  it('siempre revela exactamente 2 celdas absolutas, sin importar la dificultad', () => {
    for (const mode of MODES) {
      expect(createInitialState(mode, SEED).givenCells.size).toBe(2);
    }
  });
});

describe('takuzu: jugada', () => {
  it('cicla una celda editable vacía → sol → luna → vacía', () => {
    const state = createInitialState('easy', SEED);
    const editable = Array.from({ length: SIZE * SIZE }, (_, i) => i).find(
      (i) => !isGivenCell(state, i),
    )!;

    expect(state.board[editable]).toBeNull();
    const afterSun = cycleCell(state, editable);
    expect(afterSun.board[editable]).toBe(SUN);
    const afterMoon = cycleCell(afterSun, editable);
    expect(afterMoon.board[editable]).toBe(MOON);
    const afterEmpty = cycleCell(afterMoon, editable);
    expect(afterEmpty.board[editable]).toBeNull();
  });

  it('no modifica una celda absoluta dada', () => {
    const state = createInitialState('easy', SEED);
    const given = Array.from(state.givenCells)[0]!;
    expect(cycleCell(state, given)).toBe(state);
  });

  it('cuenta un error al ingresar un símbolo distinto al de la solución', () => {
    let state = createInitialState('easy', SEED);
    const editable = Array.from({ length: SIZE * SIZE }, (_, i) => i).find(
      (i) => !isGivenCell(state, i),
    )!;
    const wrong: Cell = state.solution[editable] === SUN ? MOON : SUN;

    // Cicla hasta llegar al símbolo incorrecto (a lo sumo 2 pasos: sol o luna).
    state = cycleCell(state, editable);
    if (state.board[editable] !== wrong) state = cycleCell(state, editable);
    expect(state.board[editable]).toBe(wrong);
    expect(state.mistakes).toBe(1);
  });

  it('no cambia el estado (mismo objeto) si ya está terminado', () => {
    let state = createInitialState('easy', SEED);
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      if (!isGivenCell(state, i)) {
        state = cycleCell(state, i);
        if (state.board[i] !== state.solution[i]) state = cycleCell(state, i);
      }
    }
    expect(state.done).toBe(true);
    const editable = Array.from({ length: SIZE * SIZE }, (_, i) => i).find(
      (i) => !isGivenCell(state, i),
    )!;
    expect(cycleCell(state, editable)).toBe(state);
  });
});

describe('takuzu: puntaje', () => {
  it('Tranquilo siempre da el puntaje base, sin importar errores', () => {
    let state = createInitialState('zen', SEED);
    const editable = Array.from({ length: SIZE * SIZE }, (_, i) => i).find(
      (i) => !isGivenCell(state, i),
    )!;
    const wrong: Cell = state.solution[editable] === SUN ? MOON : SUN;
    state = cycleCell(state, editable);
    if (state.board[editable] !== wrong) state = cycleCell(state, editable);
    expect(state.mistakes).toBe(1);
    const result = buildResult({ mode: 'zen', seed: SEED }, state, 1000);
    expect(result.score).toBe(100);
  });

  it('más errores da menos puntaje en dificultades que compiten', () => {
    const clean = createInitialState('easy', SEED);
    let withMistakes = createInitialState('easy', SEED);
    const editable = Array.from({ length: SIZE * SIZE }, (_, i) => i).find(
      (i) => !isGivenCell(withMistakes, i),
    )!;
    const wrong: Cell = withMistakes.solution[editable] === SUN ? MOON : SUN;
    withMistakes = cycleCell(withMistakes, editable);
    if (withMistakes.board[editable] !== wrong) withMistakes = cycleCell(withMistakes, editable);

    const cleanResult = buildResult({ mode: 'easy', seed: SEED }, clean, 1000);
    const mistakeResult = buildResult({ mode: 'easy', seed: SEED }, withMistakes, 1000);
    expect(mistakeResult.score).toBeLessThan(cleanResult.score);
  });

  it('buildResult emite un GameResult válido', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe('takuzu');
    expect(result.mode).toBe('easy');
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.metrics.edgeClues).toBe(state.edgeClues.length);
  });
});
