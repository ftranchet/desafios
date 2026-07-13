import { describe, expect, it } from 'vitest';
import {
  buildResult,
  CELL_COUNT,
  createInitialState,
  getModeParams,
  playbackForRound,
  stageForRound,
  submitTap,
  type SpatialMemoryState,
} from './logic';

describe('getModeParams', () => {
  it('lanza si el modo es inválido', () => {
    expect(() => getModeParams('otro' as never)).toThrow();
  });
});

describe('createInitialState', () => {
  it('es determinística con la misma semilla', () => {
    const a = createInitialState('easy', 7);
    const b = createInitialState('easy', 7);
    expect(a).toEqual(b);
  });

  it('genera una secuencia de la longitud máxima del modo, con celdas válidas', () => {
    const params = getModeParams('medium');
    const state = createInitialState('medium', 1);
    expect(state.sequence).toHaveLength(params.maxRounds);
    for (const cell of state.sequence) {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(CELL_COUNT);
    }
  });

  it('arranca en la ronda 1, sin fallar y sin puntaje', () => {
    const state = createInitialState('easy', 1);
    expect(state.round).toBe(1);
    expect(state.playerIndex).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.failed).toBe(false);
    expect(state.score).toBe(0);
  });
});

describe('submitTap', () => {
  function stateWithSequence(sequence: number[]): SpatialMemoryState {
    return {
      mode: 'easy' as const,
      mistakes: 0,
      sequence,
      round: 1,
      playerIndex: 0,
      gameOver: false,
      failed: false,
      score: 0,
    };
  }

  it('avanza playerIndex cuando el toque coincide y la ronda no terminó', () => {
    const state = { ...stateWithSequence([0, 1, 2]), round: 2 };
    const next = submitTap(state, 0);
    expect(next.playerIndex).toBe(1);
    expect(next.gameOver).toBe(false);
  });

  it('completa la ronda, suma puntaje y pasa a la siguiente cuando no llegó al tope', () => {
    const state = stateWithSequence([0, 1, 2]);
    const next = submitTap(state, 0);
    expect(next.round).toBe(2);
    expect(next.playerIndex).toBe(0);
    expect(next.score).toBe(10);
    expect(next.gameOver).toBe(false);
  });

  it('termina el juego sin marcar falla al alcanzar el tope de la secuencia', () => {
    const state = { ...stateWithSequence([0]), round: 1 };
    const next = submitTap(state, 0);
    expect(next.gameOver).toBe(true);
    expect(next.failed).toBe(false);
    expect(next.score).toBe(10);
  });

  it('marca gameOver y failed cuando el toque no coincide', () => {
    const state = stateWithSequence([0, 1, 2]);
    const next = submitTap(state, 3);
    expect(next.gameOver).toBe(true);
    expect(next.failed).toBe(true);
  });

  it('no hace nada si ya terminó el juego', () => {
    const state = { ...stateWithSequence([0, 1, 2]), gameOver: true, failed: true };
    const next = submitTap(state, 0);
    expect(next).toEqual(state);
  });
});

describe('buildResult', () => {
  it('arma un GameResult con completed true siempre (fallar es un final natural)', () => {
    const state: SpatialMemoryState = {
      mode: 'easy',
      mistakes: 0,
      sequence: [0, 1, 2],
      round: 3,
      playerIndex: 1,
      gameOver: true,
      failed: true,
      score: 20,
    };
    const result = buildResult({ mode: 'easy', seed: 1 }, state, 5000);
    expect(result.gameId).toBe('spatial-memory');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.score).toBe(20);
    expect(result.metrics.roundsCompleted).toBe(2);
    expect(result.metrics.failed).toBe(1);
  });

  it('cuenta la ronda actual como completada cuando no falló (llegó al tope)', () => {
    const state: SpatialMemoryState = {
      mode: 'easy',
      mistakes: 0,
      sequence: [0, 1],
      round: 2,
      playerIndex: 0,
      gameOver: true,
      failed: false,
      score: 20,
    };
    const result = buildResult({ mode: 'easy', seed: 1 }, state, 3000);
    expect(result.metrics.roundsCompleted).toBe(2);
    expect(result.metrics.failed).toBe(0);
  });
});

describe('modos especiales (ADR-007)', () => {
  it('Tranquilo: fallar repite la ronda en vez de terminar', () => {
    const state = createInitialState('zen', 42);
    const wrongCell = (state.sequence[0]! + 1) % CELL_COUNT;
    const next = submitTap(state, wrongCell);
    expect(next.gameOver).toBe(false);
    expect(next.mistakes).toBe(1);
    expect(next.playerIndex).toBe(0);
    expect(next.round).toBe(state.round);
  });

  it('progresivo: la reproducción se acelera por grado', () => {
    expect(stageForRound(1)).toBe(1);
    expect(stageForRound(3)).toBe(2);
    expect(stageForRound(19)).toBe(10);
    const slow = playbackForRound('progressive', 1);
    const fast = playbackForRound('progressive', 19);
    expect(fast.flashMs).toBeLessThan(slow.flashMs);
    expect(fast.flashMs).toBeGreaterThanOrEqual(220);
    // Los modos fijos no cambian de velocidad con la ronda.
    expect(playbackForRound('medium', 1)).toEqual(playbackForRound('medium', 15));
  });

  it('progresivo: el puntaje es acumulativo con el grado como multiplicador', () => {
    let state = createInitialState('progressive', 42);
    // Completar la ronda 1 (un solo toque correcto).
    state = submitTap(state, state.sequence[0]!);
    expect(state.round).toBe(2);
    expect(state.score).toBe(10); // grado 1 × 10
  });
});
