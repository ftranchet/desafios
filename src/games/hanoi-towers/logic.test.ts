import { describe, expect, it } from 'vitest';
import {
  buildResult,
  buildRounds,
  createHanoiState,
  getModeParams,
  MODE_PARAMS,
  optimalMoves,
  stageParams,
  tapPeg,
  ZEN_ROUND_COUNT,
  type RoundSpec,
} from './logic';

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con la cantidad de discos del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.diskCount).toBe(params.diskCount);
      expect(rounds[0]!.stage).toBe(1);
    }
  });

  it('Tranquilo: ZEN_ROUND_COUNT rondas de grado 1', () => {
    const rounds = buildRounds('zen');
    expect(rounds).toHaveLength(ZEN_ROUND_COUNT);
    expect(rounds.every((r) => r.stage === 1)).toBe(true);
  });

  it('Progresivo: 10 rondas con grado y discos crecientes', () => {
    const rounds = buildRounds('progressive');
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rounds[9]!.diskCount).toBeGreaterThanOrEqual(rounds[0]!.diskCount);
  });

  it('es determinística (no depende de una semilla, no hay aleatoriedad)', () => {
    expect(buildRounds('hard')).toEqual(buildRounds('hard'));
    expect(buildRounds('progressive')).toEqual(buildRounds('progressive'));
  });
});

describe('stageParams', () => {
  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    expect(stageParams(1).diskCount).toBe(MODE_PARAMS.easy.diskCount);
    expect(stageParams(8).diskCount).toBe(MODE_PARAMS.hard.diskCount);
  });

  it('los grados 9-10 extrapolan más allá de Difícil', () => {
    expect(stageParams(10).diskCount).toBeGreaterThanOrEqual(MODE_PARAMS.hard.diskCount);
  });
});

describe('optimalMoves', () => {
  it('sigue la fórmula 2^n - 1', () => {
    expect(optimalMoves(3)).toBe(7);
    expect(optimalMoves(4)).toBe(15);
    expect(optimalMoves(5)).toBe(31);
  });
});

describe('createHanoiState', () => {
  it('arranca toda la torre ordenada en el primer poste', () => {
    const state = createHanoiState(3);
    expect(state.pegs[0]).toEqual([3, 2, 1]);
    expect(state.pegs[1]).toEqual([]);
    expect(state.pegs[2]).toEqual([]);
    expect(state.selectedPeg).toBeNull();
    expect(state.moves).toBe(0);
    expect(state.done).toBe(false);
  });
});

describe('tapPeg', () => {
  it('el primer toque en un poste con discos lo selecciona', () => {
    const state = createHanoiState(3);
    const { state: next, illegalMove } = tapPeg(state, 0);
    expect(next.selectedPeg).toBe(0);
    expect(illegalMove).toBe(false);
  });

  it('el primer toque en un poste vacío no hace nada', () => {
    const state = createHanoiState(3);
    const { state: next, illegalMove } = tapPeg(state, 1);
    expect(next.selectedPeg).toBeNull();
    expect(illegalMove).toBe(false);
  });

  it('tocar el mismo poste ya seleccionado lo deselecciona', () => {
    const state = createHanoiState(3);
    const { state: selected } = tapPeg(state, 0);
    const { state: deselected, illegalMove } = tapPeg(selected, 0);
    expect(deselected.selectedPeg).toBeNull();
    expect(illegalMove).toBe(false);
  });

  it('mover el disco más chico a un poste vacío es válido y suma un movimiento', () => {
    const state = createHanoiState(3);
    const { state: selected } = tapPeg(state, 0);
    const { state: moved, illegalMove } = tapPeg(selected, 2);
    expect(illegalMove).toBe(false);
    expect(moved.pegs[0]).toEqual([3, 2]);
    expect(moved.pegs[2]).toEqual([1]);
    expect(moved.moves).toBe(1);
    expect(moved.selectedPeg).toBeNull();
  });

  it('soltar un disco grande sobre uno chico es inválido: no cuenta como movimiento', () => {
    let state = createHanoiState(3);
    state = tapPeg(state, 0).state; // selecciona poste 0 (disco 1 arriba)
    state = tapPeg(state, 2).state; // mueve el disco 1 al poste 2
    // Ahora intentamos poner el disco 2 (poste 0) sobre el disco 1 (poste 2).
    state = tapPeg(state, 0).state; // selecciona poste 0 (disco 2 arriba)
    const { state: after, illegalMove } = tapPeg(state, 2);
    expect(illegalMove).toBe(true);
    expect(after.moves).toBe(1); // no sumó el segundo movimiento
    expect(after.selectedPeg).toBeNull();
    expect(after.pegs[2]).toEqual([1]); // el poste 2 no cambió
  });

  it('resolver la torre completa de 3 discos en el óptimo de 7 movimientos', () => {
    let state = createHanoiState(3);
    const moves: [number, number][] = [
      [0, 2],
      [0, 1],
      [2, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [0, 2],
    ];
    for (const [from, to] of moves) {
      state = tapPeg(state, from).state;
      state = tapPeg(state, to).state;
    }
    expect(state.done).toBe(true);
    expect(state.moves).toBe(7);
    expect(state.pegs[2]).toEqual([3, 2, 1]);
  });

  it('no hace nada si la torre ya está resuelta', () => {
    let state = createHanoiState(1);
    state = tapPeg(state, 0).state;
    state = tapPeg(state, 2).state;
    expect(state.done).toBe(true);
    const { state: after, illegalMove } = tapPeg(state, 0);
    expect(after).toBe(state);
    expect(illegalMove).toBe(false);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const rounds = buildRounds('easy');
    const result = buildResult({ mode: 'easy' }, rounds, [7], 5000);
    expect(result.gameId).toBe('hanoi-towers');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.completedRounds).toBe(1);
    expect(result.metrics.totalMoves).toBe(7);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('resolver en el óptimo puntúa más que con movimientos de más', () => {
    const rounds = buildRounds('easy');
    const optimal = buildResult({ mode: 'easy' }, rounds, [7], 1000);
    const wasteful = buildResult({ mode: 'easy' }, rounds, [40], 1000);
    expect(optimal.score).toBeGreaterThan(wasteful.score);
  });

  it('Tranquilo: puntos fijos por ronda completada', () => {
    const rounds = buildRounds('zen');
    const result = buildResult({ mode: 'zen' }, rounds, [7, 100, 50], 1000);
    expect(result.score).toBe(300);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const easyRound: RoundSpec = { diskCount: MODE_PARAMS.easy.diskCount, stage: 1 };
    const hardStageRound: RoundSpec = { diskCount: MODE_PARAMS.hard.diskCount, stage: 8 };
    const stage1 = buildResult(
      { mode: 'progressive' },
      [easyRound],
      [optimalMoves(easyRound.diskCount)],
      1000,
    );
    const stage8 = buildResult(
      { mode: 'progressive' },
      [hardStageRound],
      [optimalMoves(hardStageRound.diskCount)],
      1000,
    );
    expect(stage8.score).toBeGreaterThan(stage1.score);
    expect(stage8.metrics.maxStage).toBe(8);
  });
});
