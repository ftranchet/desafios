import { describe, expect, it } from 'vitest';
import {
  buildResult,
  createInitialState,
  getLevelParams,
  PAD_COUNT,
  submitTap,
  type SimonState,
} from './logic';

describe('getLevelParams', () => {
  it('lanza si el nivel es inválido', () => {
    expect(() => getLevelParams(0)).toThrow();
    expect(() => getLevelParams(6)).toThrow();
  });
});

describe('createInitialState', () => {
  it('es determinística con la misma semilla', () => {
    const a = createInitialState(2, 7);
    const b = createInitialState(2, 7);
    expect(a).toEqual(b);
  });

  it('genera una secuencia de la longitud máxima del nivel, con valores válidos', () => {
    const params = getLevelParams(3);
    const state = createInitialState(3, 1);
    expect(state.sequence).toHaveLength(params.maxRounds);
    for (const pad of state.sequence) {
      expect(pad).toBeGreaterThanOrEqual(0);
      expect(pad).toBeLessThan(PAD_COUNT);
    }
  });

  it('arranca en la ronda 1, sin fallar y sin puntaje', () => {
    const state = createInitialState(1, 1);
    expect(state.round).toBe(1);
    expect(state.playerIndex).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.failed).toBe(false);
    expect(state.score).toBe(0);
  });
});

describe('submitTap', () => {
  function stateWithSequence(sequence: number[]): SimonState {
    return {
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
    const state: SimonState = {
      sequence: [0, 1, 2],
      round: 3,
      playerIndex: 1,
      gameOver: true,
      failed: true,
      score: 20,
    };
    const result = buildResult({ level: 2, seed: 1 }, state, 5000);
    expect(result.gameId).toBe('simon');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.score).toBe(20);
    expect(result.metrics.roundsCompleted).toBe(2);
    expect(result.metrics.failed).toBe(1);
  });

  it('cuenta la ronda actual como completada cuando no falló (llegó al tope)', () => {
    const state: SimonState = {
      sequence: [0, 1],
      round: 2,
      playerIndex: 0,
      gameOver: true,
      failed: false,
      score: 20,
    };
    const result = buildResult({ level: 1, seed: 1 }, state, 3000);
    expect(result.metrics.roundsCompleted).toBe(2);
    expect(result.metrics.failed).toBe(0);
  });
});
