import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  advanceRound,
  buildResult,
  buildRounds,
  createInitialState,
  evaluateGuess,
  generateCode,
  getModeParams,
  stageParams,
  submitGuess,
  ZEN_ROUND_COUNT,
  type GameState,
} from './logic';

// Tests con semilla fija (PRD 12.3): generación, jugada y puntaje.

const SEED = 123;

describe('generateCode', () => {
  it('misma semilla, mismo código', () => {
    expect(generateCode(createRng(SEED), 4)).toEqual(generateCode(createRng(SEED), 4));
  });

  it('dígitos distintos, del largo pedido, entre 0 y 9', () => {
    const code = generateCode(createRng(SEED), 5);
    expect(code).toHaveLength(5);
    expect(new Set(code).size).toBe(5);
    for (const digit of code) {
      expect(digit).toBeGreaterThanOrEqual(0);
      expect(digit).toBeLessThanOrEqual(9);
    }
  });
});

describe('evaluateGuess', () => {
  it('todos exactos cuando el intento es el código', () => {
    expect(evaluateGuess([1, 2, 3], [1, 2, 3])).toEqual({ exact: 3, partial: 0 });
  });

  it('cuenta parciales: dígito correcto, posición incorrecta', () => {
    // Código 1-2-3, intento 3-1-2: ningún exacto, los tres están pero movidos.
    expect(evaluateGuess([1, 2, 3], [3, 1, 2])).toEqual({ exact: 0, partial: 3 });
  });

  it('mezcla de exactos y parciales', () => {
    // Código 1-2-3-4, intento 1-3-2-9: posición 0 exacta; 3 y 2 están pero cambiados; 9 no está.
    expect(evaluateGuess([1, 2, 3, 4], [1, 3, 2, 9])).toEqual({ exact: 1, partial: 2 });
  });

  it('dígitos ausentes no cuentan como parciales', () => {
    expect(evaluateGuess([1, 2, 3], [4, 5, 6])).toEqual({ exact: 0, partial: 0 });
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con los parámetros del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.code).toHaveLength(params.codeLength);
      expect(rounds[0]!.maxGuesses).toBe(params.maxGuesses);
      expect(rounds[0]!.stage).toBe(1);
    }
  });

  it('Tranquilo: ZEN_ROUND_COUNT rondas, todas de grado 1', () => {
    const rounds = buildRounds('zen', SEED);
    expect(rounds).toHaveLength(ZEN_ROUND_COUNT);
    expect(rounds.every((r) => r.stage === 1)).toBe(true);
  });

  it('Progresivo: 10 rondas con grado creciente y códigos más largos', () => {
    const rounds = buildRounds('progressive', SEED);
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rounds[9]!.code.length).toBeGreaterThanOrEqual(rounds[0]!.code.length);
    expect(rounds[9]!.maxGuesses).toBeLessThanOrEqual(rounds[0]!.maxGuesses);
  });

  it('misma semilla, misma sesión completa', () => {
    expect(buildRounds('hard', SEED)).toEqual(buildRounds('hard', SEED));
    expect(buildRounds('progressive', SEED)).toEqual(buildRounds('progressive', SEED));
  });
});

describe('stageParams', () => {
  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    const easy = getModeParams('easy');
    const hard = getModeParams('hard');
    expect(stageParams(1)).toEqual({ codeLength: easy.codeLength, maxGuesses: easy.maxGuesses });
    expect(stageParams(8)).toEqual({ codeLength: hard.codeLength, maxGuesses: hard.maxGuesses });
  });

  it('los grados 9-10 extrapolan más allá de Difícil', () => {
    const hard = getModeParams('hard');
    expect(stageParams(10).codeLength).toBeGreaterThanOrEqual(hard.codeLength);
    expect(stageParams(10).maxGuesses).toBeLessThanOrEqual(hard.maxGuesses);
  });
});

describe('submitGuess', () => {
  it('un intento exacto gana la ronda y suma puntaje', () => {
    const state = createInitialState('easy', SEED);
    const code = state.rounds[0]!.code;
    const next = submitGuess(state, code);
    expect(next.roundOver).toBe(true);
    expect(next.roundWon).toBe(true);
    expect(next.solvedRounds).toBe(1);
    expect(next.score).toBeGreaterThan(0);
    // En un modo fijo de una sola ronda, ganarla termina la sesión.
    expect(next.gameOver).toBe(true);
  });

  it('un intento incorrecto no gana ni termina la ronda si quedan intentos', () => {
    const state = createInitialState('easy', SEED);
    const code = state.rounds[0]!.code;
    const wrongDigit = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => !code.includes(d))!;
    const wrongGuess = [wrongDigit, ...code.slice(1)];
    const next = submitGuess(state, wrongGuess);
    expect(next.roundOver).toBe(false);
    expect(next.attempts).toHaveLength(1);
    expect(next.gameOver).toBe(false);
  });

  it('agotar los intentos en un modo fijo termina la partida (game over)', () => {
    let state = createInitialState('easy', SEED);
    const code = state.rounds[0]!.code;
    const wrongDigit = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => !code.includes(d))!;
    const wrongGuess = [wrongDigit, ...code.slice(1)];
    for (let i = 0; i < state.rounds[0]!.maxGuesses; i += 1) {
      state = submitGuess(state, wrongGuess);
    }
    expect(state.roundOver).toBe(true);
    expect(state.roundWon).toBe(false);
    expect(state.gameOver).toBe(true);
    expect(state.failed).toBe(true);
  });

  it('Tranquilo: agotar los intentos de una ronda no termina la sesión', () => {
    let state = createInitialState('zen', SEED);
    const code = state.rounds[0]!.code;
    const wrongDigit = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => !code.includes(d))!;
    const wrongGuess = [wrongDigit, ...code.slice(1)];
    for (let i = 0; i < state.rounds[0]!.maxGuesses; i += 1) {
      state = submitGuess(state, wrongGuess);
    }
    expect(state.roundOver).toBe(true);
    expect(state.roundWon).toBe(false);
    expect(state.gameOver).toBe(false);
    expect(state.failed).toBe(false);
  });

  it('no acepta más intentos una vez que la ronda terminó', () => {
    const state = createInitialState('easy', SEED);
    const code = state.rounds[0]!.code;
    const solved = submitGuess(state, code);
    const again = submitGuess(solved, code);
    expect(again).toBe(solved);
  });
});

describe('advanceRound', () => {
  it('pasa a la próxima ronda y limpia los intentos', () => {
    let state = createInitialState('zen', SEED);
    state = submitGuess(state, state.rounds[0]!.code);
    expect(state.roundOver).toBe(true);
    const next = advanceRound(state);
    expect(next.roundIndex).toBe(1);
    expect(next.attempts).toHaveLength(0);
    expect(next.roundOver).toBe(false);
  });

  it('no hace nada si la ronda sigue abierta o la sesión terminó', () => {
    const openState = createInitialState('zen', SEED);
    expect(advanceRound(openState)).toBe(openState);

    let overState = createInitialState('easy', SEED);
    overState = submitGuess(overState, overState.rounds[0]!.code); // gana la única ronda: game over
    expect(overState.gameOver).toBe(true);
    expect(advanceRound(overState)).toBe(overState);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    let state: GameState = createInitialState('easy', SEED);
    state = submitGuess(state, state.rounds[0]!.code);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 4321);
    expect(result.gameId).toBe('secret-code');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(4321);
    expect(result.metrics.solvedRounds).toBe(1);
    expect(result.metrics.totalRounds).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('en Progresivo, maxStage refleja el grado alcanzado', () => {
    let state: GameState = createInitialState('progressive', SEED);
    state = submitGuess(state, state.rounds[0]!.code); // gana el grado 1
    state = advanceRound(state);
    const result = buildResult({ mode: 'progressive', seed: SEED }, state, 1000);
    expect(result.metrics.maxStage).toBe(2);
  });
});
