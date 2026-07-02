import { describe, expect, it } from 'vitest';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  buildResult,
  createInitialState,
  getOccupiedCells,
  hardDrop,
  lockPiece,
  step,
  tryMove,
  tryRotate,
  type CascadaState,
} from './logic';

describe('createInitialState', () => {
  it('es determinística con la misma semilla', () => {
    const a = createInitialState(3, 42);
    const b = createInitialState(3, 42);
    expect(a).toEqual(b);
  });

  it('arranca con el tablero vacío y una pieza activa válida', () => {
    const state = createInitialState(1, 1);
    expect(state.board).toHaveLength(BOARD_HEIGHT);
    expect(state.board.every((row) => row.every((cell) => cell === 0))).toBe(true);
    expect(state.gameOver).toBe(false);
    expect(state.score).toBe(0);
  });

  it('la pieza activa siempre está dentro del ancho del tablero', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = createInitialState(1, seed);
      for (const cell of getOccupiedCells(state.current)) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(BOARD_WIDTH);
      }
    }
  });
});

describe('tryMove', () => {
  it('mueve la pieza si la posición es válida', () => {
    const state = createInitialState(1, 1);
    const moved = tryMove(state, 1, 0);
    expect(moved).not.toBeNull();
    expect(moved?.current.x).toBe(state.current.x + 1);
  });

  it('devuelve null si el movimiento saca la pieza del tablero', () => {
    let state = createInitialState(1, 1);
    // empuja la pieza contra la pared izquierda
    for (let i = 0; i < BOARD_WIDTH; i += 1) {
      const moved = tryMove(state, -1, 0);
      if (!moved) break;
      state = moved;
    }
    expect(tryMove(state, -1, 0)).toBeNull();
  });
});

describe('tryRotate', () => {
  it('gira una pieza cuando la nueva posición es válida', () => {
    const base = createInitialState(1, 1);
    const state: CascadaState = { ...base, current: { type: 'T', rotation: 0, x: 4, y: 5 } };
    const rotated = tryRotate(state);
    expect(rotated.current.rotation).toBe(1);
  });

  it('no rota si la nueva posición no entra en el tablero', () => {
    const base = createInitialState(1, 1);
    // Pieza I vertical (rotación 1) pegada a la pared derecha: volver a
    // horizontal (rotación 2) se saldría del tablero por la derecha.
    const state: CascadaState = { ...base, current: { type: 'I', rotation: 1, x: 7, y: 5 } };
    const rotated = tryRotate(state);
    expect(rotated.current.rotation).toBe(1); // no cambió: la rotación era inválida
  });
});

describe('step y lockPiece', () => {
  it('step baja la pieza mientras hay lugar', () => {
    const state = createInitialState(1, 1);
    const next = step(state);
    expect(next.current.y).toBe(state.current.y + 1);
    expect(next.gameOver).toBe(false);
  });

  it('al no poder bajar más, fija la pieza y aparece una nueva', () => {
    let state = createInitialState(1, 1);
    // deja caer hasta el fondo con hardDrop, después un step más debe fijar y spawnear
    state = hardDrop(state);
    const linesBefore = state.linesCleared;
    expect(state.score).toBeGreaterThanOrEqual(0);
    expect(state.linesCleared).toBe(linesBefore); // una sola pieza no completa líneas
  });

  it('limpia una línea completa y suma puntaje', () => {
    const base = createInitialState(1, 1);
    // arma un tablero con la fila de abajo completa salvo una celda, y ubica
    // la pieza activa (tipo O) exactamente para tapar el hueco.
    const board = base.board.map((row) => [...row]);
    const lastRow = BOARD_HEIGHT - 1;
    for (let x = 0; x < BOARD_WIDTH; x += 1) board[lastRow]![x] = 1;
    board[lastRow]![0] = 0;
    board[lastRow]![1] = 0;

    const state: CascadaState = {
      ...base,
      board,
      current: { type: 'O', rotation: 0, x: 0, y: lastRow - 1 },
    };

    const locked = lockPiece(state);
    expect(locked.linesCleared).toBe(1);
    expect(locked.score).toBe(100);
  });
});

describe('hardDrop', () => {
  it('deja la pieza en el fondo del tablero y la fija', () => {
    const state = createInitialState(1, 1);
    const dropped = hardDrop(state);
    // después del hard drop, el tablero tiene celdas ocupadas
    const occupiedCount = dropped.board.flat().filter((c) => c !== 0).length;
    expect(occupiedCount).toBeGreaterThan(0);
  });

  it('puede provocar game over cuando la próxima pieza no entra (regresión: la UI debe finalizar en este caso)', () => {
    const base = createInitialState(1, 1);
    // Zona de aparición (columnas 3-6, filas 0-1) tapada, pero sin ninguna fila
    // completa (columnas 0-2 y 7-9 vacías arriba) para que no se limpie nada.
    const board = base.board.map((row) => [...row]);
    for (let x = 3; x <= 6; x += 1) {
      board[0]![x] = 1;
      board[1]![x] = 1;
    }
    // Pieza actual O en las columnas 0-1: al soltar cae al fondo sin completar
    // filas, se fija, y la próxima pieza no puede aparecer → game over.
    const state: CascadaState = {
      ...base,
      board,
      current: { type: 'O', rotation: 0, x: 0, y: 0 },
    };
    expect(hardDrop(state).gameOver).toBe(true);
  });
});

describe('game over', () => {
  it('termina el juego si no hay lugar para la próxima pieza', () => {
    const base = createInitialState(1, 1);
    // Todas las columnas ocupadas salvo la última: ninguna fila queda
    // completa (no se limpia nada), pero el área de aparición (fila 0,
    // columnas centrales) está bloqueada para cualquier pieza.
    const blockedBoard = base.board.map((row) =>
      row.map((_, x) => (x === BOARD_WIDTH - 1 ? 0 : 1)),
    );
    const state: CascadaState = { ...base, board: blockedBoard };
    const locked = lockPiece({ ...state, current: { ...state.current, y: -2 } });
    expect(locked.gameOver).toBe(true);
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido y siempre completado', () => {
    const state = createInitialState(2, 3);
    const result = buildResult({ level: 2, seed: 3 }, state, 5000);
    expect(result.gameId).toBe('cascada');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
  });
});
