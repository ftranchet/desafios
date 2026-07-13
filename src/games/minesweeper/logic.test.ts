import { describe, expect, it } from 'vitest';
import {
  buildResult,
  createInitialState,
  getModeParams,
  MODE_PARAMS,
  reveal,
  toggleFlag,
  type GameState,
} from './logic';

const SEED = 123;

// Tablero 3x3 fijo, sin depender del azar: mina solo en el índice 8 (esquina
// inferior derecha), para probar la mecánica de revelado de forma controlada.
//   0 1 2
//   3 4 5
//   6 7 8 (mina)
function fixedState(overrides: Partial<GameState> = {}): GameState {
  const mines = [false, false, false, false, false, false, false, false, true];
  const neighborCounts = [0, 0, 0, 0, 1, 1, 0, 1, -1];
  return {
    mode: 'easy',
    rows: 3,
    cols: 3,
    mineCount: 1,
    seed: SEED,
    generated: true,
    mines,
    neighborCounts,
    revealed: new Array(9).fill(false),
    flagged: new Array(9).fill(false),
    revealedSafeCount: 0,
    status: 'playing',
    ...overrides,
  };
}

describe('createInitialState', () => {
  it('misma semilla, misma partida', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('arranca sin generar, sin celdas descubiertas ni marcadas', () => {
    const state = createInitialState('easy', SEED);
    expect(state.generated).toBe(false);
    expect(state.revealed.every((v) => v === false)).toBe(true);
    expect(state.flagged.every((v) => v === false)).toBe(true);
    expect(state.status).toBe('playing');
  });

  it('respeta filas, columnas y cantidad de minas de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const params = getModeParams(mode);
      const state = createInitialState(mode, SEED);
      expect(state.rows).toBe(params.rows);
      expect(state.cols).toBe(params.cols);
      expect(state.mineCount).toBe(params.mineCount);
    }
  });
});

describe('reveal: primer toque siempre seguro', () => {
  it('el índice tocado primero nunca es una mina, para muchas semillas', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = createInitialState('medium', seed);
      const firstClick = 20; // celda central-ish de un tablero 8x8
      const next = reveal(state, firstClick);
      expect(next.generated).toBe(true);
      expect(next.mines[firstClick]).toBe(false);
      expect(next.revealed[firstClick]).toBe(true);
    }
  });
});

describe('reveal', () => {
  it('descubrir una celda con 0 minas vecinas revela en cascada', () => {
    const state = fixedState();
    const next = reveal(state, 0); // índice 0 tiene 0 minas vecinas
    // La cascada debería llegar hasta todo lo que no sea la mina (índice 8).
    expect(next.revealed.slice(0, 8).every(Boolean)).toBe(true);
    expect(next.revealed[8]).toBe(false);
  });

  it('descubrir todas las celdas seguras marca ganado', () => {
    const state = fixedState();
    const next = reveal(state, 0);
    expect(next.status).toBe('won');
    expect(next.revealedSafeCount).toBe(8);
  });

  it('descubrir una mina (modo no Tranquilo) marca perdido', () => {
    const state = fixedState();
    const next = reveal(state, 8);
    expect(next.status).toBe('lost');
    expect(next.revealed[8]).toBe(true);
  });

  it('Tranquilo: descubrir una mina arma un tablero nuevo en vez de terminar', () => {
    const state = fixedState({ mode: 'zen' });
    const next = reveal(state, 8);
    expect(next.status).toBe('playing');
    expect(next.generated).toBe(false);
    expect(next.seed).toBe(SEED + 1);
    expect(next.revealed.every((v) => v === false)).toBe(true);
  });

  it('no hace nada sobre una celda ya descubierta', () => {
    const state = fixedState();
    const revealed = reveal(state, 4);
    const again = reveal(revealed, 4);
    expect(again).toBe(revealed);
  });

  it('no hace nada sobre una celda marcada con bandera', () => {
    const state = toggleFlag(fixedState(), 5);
    const next = reveal(state, 5);
    expect(next).toBe(state);
  });

  it('no hace nada si la partida ya terminó', () => {
    const lost = reveal(fixedState(), 8);
    const again = reveal(lost, 0);
    expect(again).toBe(lost);
  });
});

describe('toggleFlag', () => {
  it('marca y desmarca una celda sin descubrir', () => {
    const state = fixedState();
    const flagged = toggleFlag(state, 3);
    expect(flagged.flagged[3]).toBe(true);
    const unflagged = toggleFlag(flagged, 3);
    expect(unflagged.flagged[3]).toBe(false);
  });

  it('no se puede marcar una celda ya descubierta', () => {
    const revealed = reveal(fixedState(), 0);
    const next = toggleFlag(revealed, 1);
    expect(next).toBe(revealed);
  });
});

describe('buildResult', () => {
  it('Tranquilo: puntaje fijo sin importar el estado', () => {
    const state = fixedState({ mode: 'zen' });
    const result = buildResult({ mode: 'zen', seed: SEED }, state, 1000);
    expect(result.score).toBe(100);
  });

  it('ganar rinde más puntos que perder, a igual dificultad', () => {
    const won = reveal(fixedState(), 0);
    const lost = reveal(fixedState(), 8);
    const wonResult = buildResult({ mode: 'easy', seed: SEED }, won, 10_000);
    const lostResult = buildResult({ mode: 'easy', seed: SEED }, lost, 10_000);
    expect(wonResult.score).toBeGreaterThan(lostResult.score);
  });

  it('terminar más rápido puntúa más que más lento, ganando igual', () => {
    const won = reveal(fixedState(), 0);
    const fast = buildResult({ mode: 'easy', seed: SEED }, won, 1000);
    const slow = buildResult({ mode: 'easy', seed: SEED }, won, 120_000);
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it('perder con más avance da más crédito parcial que perder con menos', () => {
    const barelyStarted = reveal(fixedState(), 8);
    const almostWon = reveal(reveal(fixedState(), 0), 8); // ya reveló todo lo seguro antes de perder... no aplica acá
    void almostWon;
    const revealedFirst = reveal(fixedState(), 0);
    // fixedState con más avance previo a perder: reconstruimos manualmente el estado "perdido"
    // con revealedSafeCount alto, ya que en este tablero perder llega antes de poder revelar 0.
    const advancedThenLost: GameState = { ...revealedFirst, status: 'lost' };
    const barelyResult = buildResult({ mode: 'easy', seed: SEED }, barelyStarted, 10_000);
    const advancedResult = buildResult({ mode: 'easy', seed: SEED }, advancedThenLost, 10_000);
    expect(advancedResult.score).toBeGreaterThan(barelyResult.score);
  });

  it('emite un GameResult válido con las métricas de la partida', () => {
    const state = reveal(fixedState(), 0);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 5000);
    expect(result.gameId).toBe('minesweeper');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.mineCount).toBe(1);
    expect(result.metrics.totalSafeCells).toBe(8);
    expect(result.metrics.won).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });
});

describe('MODE_PARAMS: sin tensión con RNF-04', () => {
  it('ningún tamaño de grilla supera el clásico de escritorio (se topa bajo, a propósito)', () => {
    for (const params of Object.values(MODE_PARAMS)) {
      expect(params.rows).toBeLessThanOrEqual(9);
      expect(params.cols).toBeLessThanOrEqual(9);
    }
  });
});
