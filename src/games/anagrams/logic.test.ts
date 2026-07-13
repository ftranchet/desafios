import { describe, expect, it } from 'vitest';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  MODE_PARAMS,
  placeTile,
  removeTile,
  ROUND_COUNT,
  stageParams,
  ZEN_ROUND_COUNT,
  type RoundSpec,
} from './logic';
import { WORDS_BY_LENGTH } from './words';

const SEED = 123;

function solveRound(round: RoundSpec) {
  let progress = createRoundProgress(round);
  for (const letter of round.word) {
    const poolPosition = progress.poolIndices.findIndex((i) => round.tiles[i] === letter);
    progress = placeTile(round, progress, poolPosition);
  }
  return progress;
}

describe('buildRounds', () => {
  it('misma semilla, misma sesión', () => {
    expect(buildRounds('medium', SEED)).toEqual(buildRounds('medium', SEED));
  });

  it('modos fijos: ROUND_COUNT palabras del banco correcto', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(ROUND_COUNT);
      const bank = WORDS_BY_LENGTH[MODE_PARAMS[mode].wordLength];
      rounds.forEach((round) => {
        expect(bank).toContain(round.word);
        expect(round.tiles).toHaveLength(round.word.length);
        expect(round.stage).toBe(1);
      });
    }
  });

  it('Tranquilo: ZEN_ROUND_COUNT palabras, sin señuelos', () => {
    const rounds = buildRounds('zen', SEED);
    expect(rounds).toHaveLength(ZEN_ROUND_COUNT);
    rounds.forEach((round) => expect(round.tiles).toHaveLength(round.word.length));
  });

  it('Progresivo: 10 grados, largo de palabra no decreciente', () => {
    const rounds = buildRounds('progressive', SEED);
    expect(rounds).toHaveLength(10);
    for (let i = 1; i < rounds.length; i += 1) {
      expect(rounds[i]!.wordLength).toBeGreaterThanOrEqual(rounds[i - 1]!.wordLength);
    }
  });

  it('las fichas son un reordenamiento de las letras de la palabra (+ señuelos)', () => {
    const rounds = buildRounds('progressive', SEED);
    rounds.forEach((round) => {
      const distractorCount = round.tiles.length - round.word.length;
      expect(distractorCount).toBeGreaterThanOrEqual(0);
      const wordLetters = [...round.word].sort();
      const tileLetters = [...round.tiles].sort();
      // Las letras de la palabra están todas presentes entre las fichas.
      const remaining = [...tileLetters];
      wordLetters.forEach((letter) => {
        const idx = remaining.indexOf(letter);
        expect(idx).toBeGreaterThanOrEqual(0);
        remaining.splice(idx, 1);
      });
    });
  });
});

describe('stageParams', () => {
  it('interpola el largo de palabra de 4 a 6 y agrega señuelos recién en 9-10', () => {
    expect(stageParams(1).wordLength).toBe(4);
    expect(stageParams(1).distractorCount).toBe(0);
    expect(stageParams(8).distractorCount).toBe(0);
    expect(stageParams(9).distractorCount).toBeGreaterThan(0);
    expect(stageParams(10).distractorCount).toBeGreaterThan(stageParams(9).distractorCount);
    expect(stageParams(10).wordLength).toBe(6);
  });
});

describe('placeTile / removeTile', () => {
  it('coloca una ficha de la bandeja en el próximo casillero libre', () => {
    const [round] = buildRounds('easy', SEED);
    const progress = createRoundProgress(round!);
    const next = placeTile(round!, progress, 0);
    expect(next.answerIndices).toHaveLength(1);
    expect(next.poolIndices).toHaveLength(round!.tiles.length - 1);
    expect(next.moves).toBe(1);
  });

  it('devuelve una ficha colocada a la bandeja', () => {
    const [round] = buildRounds('easy', SEED);
    const placed = placeTile(round!, createRoundProgress(round!), 0);
    const removed = removeTile(placed, 0);
    expect(removed.answerIndices).toHaveLength(0);
    expect(removed.poolIndices).toHaveLength(round!.tiles.length);
    expect(removed.moves).toBe(2);
  });

  it('armar la palabra en el orden correcto marca done', () => {
    const [round] = buildRounds('easy', SEED);
    const solved = solveRound(round!);
    expect(solved.done).toBe(true);
    expect(solved.moves).toBe(round!.word.length);
  });

  it('no permite colocar más fichas que el largo de la palabra', () => {
    const [round] = buildRounds('easy', SEED);
    let progress = createRoundProgress(round!);
    for (let i = 0; i < round!.word.length; i += 1) progress = placeTile(round!, progress, 0);
    const extra = placeTile(round!, progress, 0);
    expect(extra).toBe(progress);
  });

  it('no hace nada si la ronda ya terminó', () => {
    const [round] = buildRounds('easy', SEED);
    const solved = solveRound(round!);
    const untouched = removeTile(solved, 0);
    expect(untouched).toBe(solved);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la sesión', () => {
    const rounds = buildRounds('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, rounds, [4, 5], 1234);
    expect(result.gameId).toBe('anagrams');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(1234);
    expect(result.metrics.completedRounds).toBe(2);
    expect(result.metrics.totalRounds).toBe(ROUND_COUNT);
    expect(result.metrics.totalMoves).toBe(9);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: cada ronda resuelta puntúa BASE_POINTS fijo', () => {
    const rounds = buildRounds('zen', SEED);
    const result = buildResult({ mode: 'zen', seed: SEED }, rounds, [10, 20, 3], 1000);
    expect(result.score).toBe(300);
  });

  it('menos movimientos (más eficiencia) puntúa más que más movimientos', () => {
    const rounds = buildRounds('easy', SEED);
    const efficient = buildResult({ mode: 'easy', seed: SEED }, rounds, [rounds[0]!.word.length], 1000);
    const wasteful = buildResult(
      { mode: 'easy', seed: SEED },
      rounds,
      [rounds[0]!.word.length + 6],
      1000,
    );
    expect(efficient.score).toBeGreaterThan(wasteful.score);
  });

  it('una palabra más larga pesa más en el puntaje (a igual eficiencia)', () => {
    const easyRounds = buildRounds('easy', SEED);
    const hardRounds = buildRounds('hard', SEED);
    const easyResult = buildResult(
      { mode: 'easy', seed: SEED },
      easyRounds,
      [easyRounds[0]!.word.length],
      1000,
    );
    const hardResult = buildResult(
      { mode: 'hard', seed: SEED },
      hardRounds,
      [hardRounds[0]!.word.length],
      1000,
    );
    expect(hardResult.score).toBeGreaterThan(easyResult.score);
  });
});
