import { describe, expect, it } from 'vitest';
import {
  advanceRound,
  buildResult,
  buildRounds,
  createInitialState,
  evaluateGuess,
  generateWord,
  getModeParams,
  isValidWord,
  keyboardLetterStates,
  MODE_PARAMS,
  stageParams,
  submitGuess,
  wordsOfLength,
  ZEN_ROUND_COUNT,
  type Attempt,
  type GameState,
} from './logic';
import { WORDS_BY_LENGTH } from './words';
import { createRng } from '../../core/random';

const SEED = 123;

describe('banco de palabras', () => {
  it('cada palabra tiene exactamente el largo de su categoría, en mayúsculas', () => {
    for (const [length, words] of Object.entries(WORDS_BY_LENGTH)) {
      for (const word of words) {
        expect(word).toHaveLength(Number(length));
        expect(word).toBe(word.toUpperCase());
      }
    }
  });

  it('sin palabras repetidas dentro de cada largo', () => {
    for (const words of Object.values(WORDS_BY_LENGTH)) {
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe('generateWord', () => {
  it('misma semilla, misma palabra', () => {
    expect(generateWord(createRng(SEED), 5)).toBe(generateWord(createRng(SEED), 5));
  });

  it('la palabra generada pertenece al banco de ese largo', () => {
    const word = generateWord(createRng(SEED), 4);
    expect(wordsOfLength(4)).toContain(word);
  });
});

describe('isValidWord', () => {
  it('acepta palabras del banco sin importar mayúsculas/minúsculas', () => {
    expect(isValidWord('casa', 4)).toBe(true);
    expect(isValidWord('CASA', 4)).toBe(true);
  });

  it('rechaza palabras fuera del banco o del largo equivocado', () => {
    expect(isValidWord('ZZZZ', 4)).toBe(false);
    expect(isValidWord('CASA', 5)).toBe(false);
  });
});

describe('evaluateGuess', () => {
  it('todas correctas cuando el intento es la palabra', () => {
    expect(evaluateGuess('CASA', 'CASA')).toEqual(['correct', 'correct', 'correct', 'correct']);
  });

  it('marca ausentes las letras que no están', () => {
    expect(evaluateGuess('CASA', 'TREN'.slice(0, 4))).toEqual([
      'absent',
      'absent',
      'absent',
      'absent',
    ]);
  });

  it('marca presente una letra que está pero en otro lugar', () => {
    // Objetivo PLATO, intento TOPLA: ninguna en su lugar, las 5 están.
    expect(evaluateGuess('PLATO', 'TOPLA')).toEqual([
      'present',
      'present',
      'present',
      'present',
      'present',
    ]);
  });

  it('letras repetidas: exactos y presentes conviven sin excederse el cupo del objetivo', () => {
    // Objetivo AABBB, intento BAABB: la A del índice 1 y las B de 3-4 son
    // exactas; la B del índice 0 y la A del índice 2 están, pero movidas.
    const feedback = evaluateGuess('AABBB', 'BAABB');
    expect(feedback).toEqual(['present', 'correct', 'present', 'correct', 'correct']);
  });

  it('no marca "presente" más veces de las que hay copias sin consumir en el objetivo', () => {
    // Objetivo CASAS (2 A), intento AAAAA: las A de los índices 1 y 3 son
    // exactas y agotan las dos A del objetivo — no queda ninguna para marcar
    // "presente" en el resto.
    const feedback = evaluateGuess('CASAS', 'AAAAA');
    expect(feedback.filter((f) => f === 'present')).toHaveLength(0);
    expect(feedback.filter((f) => f === 'correct')).toHaveLength(2);
    expect(feedback.filter((f) => f === 'absent')).toHaveLength(3);
  });

  it('una letra repetida en el intento que coincide una vez exacta no duplica el resto como presente', () => {
    // Objetivo ROSAS (2 eses), intento SSSSS: 2 "correct" (posiciones de las eses)... en realidad
    // ROSAS = R-O-S-A-S, la S está en índice 2 y 4. Intento SSSSS: exactas en 2 y 4 → correct,
    // el resto (0,1,3) no tiene más eses en el objetivo → absent.
    const feedback = evaluateGuess('ROSAS', 'SSSSS');
    expect(feedback).toEqual(['absent', 'absent', 'correct', 'absent', 'correct']);
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con el largo del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.wordLength).toBe(params.wordLength);
      expect(rounds[0]!.word).toHaveLength(params.wordLength);
      expect(rounds[0]!.stage).toBe(1);
    }
  });

  it('Tranquilo: ZEN_ROUND_COUNT rondas de grado 1', () => {
    const rounds = buildRounds('zen', SEED);
    expect(rounds).toHaveLength(ZEN_ROUND_COUNT);
    expect(rounds.every((r) => r.stage === 1)).toBe(true);
  });

  it('Progresivo: 10 rondas con grado creciente y palabras que no superan las 6 letras', () => {
    const rounds = buildRounds('progressive', SEED);
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const round of rounds) {
      expect(round.wordLength).toBeLessThanOrEqual(6);
      expect(round.wordLength).toBeGreaterThanOrEqual(4);
    }
    // Los grados 9-10 acortan los intentos en vez de alargar la palabra (RNF-04-ish: banco limitado).
    expect(rounds[9]!.maxGuesses).toBeLessThan(rounds[0]!.maxGuesses);
  });

  it('misma semilla, misma sesión completa', () => {
    expect(buildRounds('hard', SEED)).toEqual(buildRounds('hard', SEED));
    expect(buildRounds('progressive', SEED)).toEqual(buildRounds('progressive', SEED));
  });
});

describe('stageParams', () => {
  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    expect(stageParams(1).wordLength).toBe(MODE_PARAMS.easy.wordLength);
    expect(stageParams(8).wordLength).toBe(MODE_PARAMS.hard.wordLength);
    expect(stageParams(8).maxGuesses).toBe(6);
  });

  it('los grados 9-10 no alargan más la palabra, acortan los intentos', () => {
    expect(stageParams(9).wordLength).toBe(6);
    expect(stageParams(10).wordLength).toBe(6);
    expect(stageParams(10).maxGuesses).toBeLessThan(stageParams(9).maxGuesses);
  });
});

describe('submitGuess', () => {
  it('adivinar la palabra gana la ronda y suma puntaje', () => {
    const state = createInitialState('easy', SEED);
    const word = state.rounds[0]!.word;
    const next = submitGuess(state, word);
    expect(next.roundOver).toBe(true);
    expect(next.roundWon).toBe(true);
    expect(next.solvedRounds).toBe(1);
    expect(next.score).toBeGreaterThan(0);
    expect(next.gameOver).toBe(true); // única ronda en un modo fijo
  });

  it('un intento incorrecto no gana ni termina la ronda si quedan intentos', () => {
    const state = createInitialState('easy', SEED);
    const word = state.rounds[0]!.word;
    const wrongWord = wordsOfLength(4).find((w) => w !== word)!;
    const next = submitGuess(state, wrongWord);
    expect(next.roundOver).toBe(false);
    expect(next.attempts).toHaveLength(1);
    expect(next.gameOver).toBe(false);
  });

  it('agotar los intentos en un modo fijo termina la partida', () => {
    let state = createInitialState('easy', SEED);
    const word = state.rounds[0]!.word;
    const wrongWord = wordsOfLength(4).find((w) => w !== word)!;
    for (let i = 0; i < state.rounds[0]!.maxGuesses; i += 1) {
      state = submitGuess(state, wrongWord);
    }
    expect(state.roundOver).toBe(true);
    expect(state.roundWon).toBe(false);
    expect(state.gameOver).toBe(true);
    expect(state.failed).toBe(true);
  });

  it('Tranquilo: agotar los intentos de una ronda no termina la sesión', () => {
    let state = createInitialState('zen', SEED);
    const word = state.rounds[0]!.word;
    const wrongWord = wordsOfLength(5).find((w) => w !== word)!;
    for (let i = 0; i < state.rounds[0]!.maxGuesses; i += 1) {
      state = submitGuess(state, wrongWord);
    }
    expect(state.roundOver).toBe(true);
    expect(state.roundWon).toBe(false);
    expect(state.gameOver).toBe(false);
    expect(state.failed).toBe(false);
  });

  it('no acepta más intentos una vez que la ronda terminó', () => {
    const state = createInitialState('easy', SEED);
    const word = state.rounds[0]!.word;
    const solved = submitGuess(state, word);
    const again = submitGuess(solved, word);
    expect(again).toBe(solved);
  });
});

describe('advanceRound', () => {
  it('pasa a la próxima ronda y limpia los intentos', () => {
    let state = createInitialState('zen', SEED);
    state = submitGuess(state, state.rounds[0]!.word);
    const next = advanceRound(state);
    expect(next.roundIndex).toBe(1);
    expect(next.attempts).toHaveLength(0);
    expect(next.roundOver).toBe(false);
  });

  it('no hace nada si la ronda sigue abierta o la sesión terminó', () => {
    const openState = createInitialState('zen', SEED);
    expect(advanceRound(openState)).toBe(openState);

    let overState = createInitialState('easy', SEED);
    overState = submitGuess(overState, overState.rounds[0]!.word);
    expect(overState.gameOver).toBe(true);
    expect(advanceRound(overState)).toBe(overState);
  });
});

describe('keyboardLetterStates', () => {
  it('se queda con el mejor estado visto por letra (correct > present > absent)', () => {
    const attempts: Attempt[] = [
      { guess: 'CASA', feedback: ['absent', 'present', 'absent', 'absent'] },
      { guess: 'ROCA', feedback: ['absent', 'absent', 'absent', 'correct'] },
    ];
    const states = keyboardLetterStates(attempts);
    expect(states['A']).toBe('correct'); // presente en la primera, exacta en la segunda
    expect(states['C']).toBe('absent');
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    let state: GameState = createInitialState('easy', SEED);
    state = submitGuess(state, state.rounds[0]!.word);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 4321);
    expect(result.gameId).toBe('word-of-the-day');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(4321);
    expect(result.metrics.solvedRounds).toBe(1);
    expect(result.metrics.totalRounds).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('en Progresivo, maxStage refleja el grado alcanzado', () => {
    let state: GameState = createInitialState('progressive', SEED);
    state = submitGuess(state, state.rounds[0]!.word); // gana el grado 1
    state = advanceRound(state);
    const result = buildResult({ mode: 'progressive', seed: SEED }, state, 1000);
    expect(result.metrics.maxStage).toBe(2);
  });
});
