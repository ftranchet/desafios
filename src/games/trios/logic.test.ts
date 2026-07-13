import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  computeScore,
  dealBoard,
  generateSession,
  getModeParams,
  isValidTrio,
  MODE_PARAMS,
  stageForIndex,
  stageParams,
  thirdCardFor,
  type AnswerRecord,
  type Card,
  type Question,
} from './logic';

const SEED = 42;

function card(color: 0 | 1 | 2, shape: 0 | 1 | 2, count: 1 | 2 | 3, fill: 0 | 1 | 2): Card {
  return { color, shape, count, fill };
}

/** Fuerza bruta: ¿existe algún trío válido entre las cartas del tablero? */
function hasTrio(board: Card[]): boolean {
  for (let i = 0; i < board.length; i += 1) {
    for (let j = i + 1; j < board.length; j += 1) {
      for (let k = j + 1; k < board.length; k += 1) {
        if (isValidTrio(board[i]!, board[j]!, board[k]!)) return true;
      }
    }
  }
  return false;
}

describe('isValidTrio', () => {
  it('los 4 atributos todos iguales es un trío válido', () => {
    const a = card(0, 0, 1, 0);
    expect(isValidTrio(a, a, a)).toBe(true);
  });

  it('los 4 atributos todos distintos es un trío válido', () => {
    expect(isValidTrio(card(0, 0, 1, 0), card(1, 1, 2, 1), card(2, 2, 3, 2))).toBe(true);
  });

  it('dos iguales y uno distinto en cualquier atributo invalida el trío', () => {
    // Mismo color en 2 cartas, distinto en la tercera; el resto coincide.
    expect(isValidTrio(card(0, 0, 1, 0), card(0, 0, 1, 0), card(1, 0, 1, 0))).toBe(false);
  });
});

describe('thirdCardFor', () => {
  it('si dos cartas comparten un atributo, la tercera repite ese valor', () => {
    const a = card(0, 1, 2, 0);
    const b = card(0, 2, 1, 2);
    const c = thirdCardFor(a, b);
    expect(c.color).toBe(0); // color coincide en a y b
    expect(isValidTrio(a, b, c)).toBe(true);
  });

  it('si dos cartas difieren en un atributo, la tercera toma el valor restante', () => {
    const a = card(0, 0, 1, 0);
    const b = card(1, 0, 1, 0);
    const c = thirdCardFor(a, b);
    expect(c.color).toBe(2); // el único valor que no es 0 ni 1
    expect(isValidTrio(a, b, c)).toBe(true);
  });

  it('siempre forma un trío válido, para pares de cartas al azar', () => {
    const rng = createRng(SEED);
    for (let i = 0; i < 30; i += 1) {
      const a = card(
        Math.floor(rng() * 3) as 0 | 1 | 2,
        Math.floor(rng() * 3) as 0 | 1 | 2,
        ((Math.floor(rng() * 3) + 1) as 1 | 2 | 3),
        Math.floor(rng() * 3) as 0 | 1 | 2,
      );
      const b = card(
        Math.floor(rng() * 3) as 0 | 1 | 2,
        Math.floor(rng() * 3) as 0 | 1 | 2,
        ((Math.floor(rng() * 3) + 1) as 1 | 2 | 3),
        Math.floor(rng() * 3) as 0 | 1 | 2,
      );
      expect(isValidTrio(a, b, thirdCardFor(a, b))).toBe(true);
    }
  });
});

describe('dealBoard', () => {
  it('misma semilla, mismo tablero', () => {
    expect(dealBoard(createRng(SEED), 12)).toEqual(dealBoard(createRng(SEED), 12));
  });

  it('siempre tiene el tamaño pedido, sin cartas repetidas', () => {
    for (const boardSize of [9, 12, 15, 18]) {
      const board = dealBoard(createRng(SEED), boardSize);
      expect(board).toHaveLength(boardSize);
      const ids = new Set(board.map((c) => `${c.color}${c.shape}${c.count}${c.fill}`));
      expect(ids.size).toBe(boardSize);
    }
  });

  it('siempre contiene al menos un trío válido (verificado por fuerza bruta)', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const board = dealBoard(createRng(seed), 9);
      expect(hasTrio(board)).toBe(true);
    }
  });
});

describe('generateSession', () => {
  it('respeta la cantidad de tableros de cada modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const session = generateSession(mode, SEED);
      expect(session).toHaveLength(getModeParams(mode).questionCount);
      session.forEach((q) => expect(q.board).toHaveLength(q.boardSize));
    }
  });

  it('Tranquilo no tiene reloj: seconds = 0 en todos los tableros', () => {
    for (const q of generateSession('zen', SEED)) expect(q.seconds).toBe(0);
  });
});

describe('modo progresivo', () => {
  it('el grado sube uno cada dos preguntas hasta 10', () => {
    expect(stageForIndex(0)).toBe(1);
    expect(stageForIndex(2)).toBe(2);
    expect(stageForIndex(19)).toBe(10);
  });

  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    expect(stageParams(1).boardSize).toBe(MODE_PARAMS.easy.boardSize);
    expect(stageParams(8).boardSize).toBe(MODE_PARAMS.hard.boardSize);
    expect(stageParams(8).seconds).toBe(MODE_PARAMS.hard.seconds);
  });

  it('los grados 9-10 superan a Difícil: el tablero sigue creciendo', () => {
    expect(stageParams(10).boardSize).toBeGreaterThan(MODE_PARAMS.hard.boardSize);
    expect(stageParams(10).boardSize % 3).toBe(0);
    expect(stageParams(10).seconds).toBeLessThanOrEqual(stageParams(8).seconds);
    expect(stageParams(10).seconds).toBeGreaterThanOrEqual(10);
  });
});

describe('computeScore', () => {
  const question = (stage: number, seconds: number): Question => ({
    board: [],
    boardSize: 9,
    stage,
    seconds,
  });

  it('modo fijo: base + bono por tiempo restante - penalidad por error', () => {
    const questions = [question(1, 10), question(1, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 0, mistakes: 0 }, // bono completo, sin errores
      { correct: false, responseMs: null, mistakes: 2 },
    ];
    const { score, metrics } = computeScore('medium', answers, questions);
    expect(score).toBe(150);
    expect(metrics.correct).toBe(1);
    expect(metrics.incorrect).toBe(1);
    expect(metrics.totalMistakes).toBe(2);
  });

  it('los errores bajan el puntaje del tablero acertado', () => {
    const questions = [question(1, 10), question(1, 10)];
    const clean: AnswerRecord[] = [{ correct: true, responseMs: 0, mistakes: 0 }];
    const sloppy: AnswerRecord[] = [{ correct: true, responseMs: 0, mistakes: 2 }];
    const cleanScore = computeScore('medium', clean, questions).score;
    const sloppyScore = computeScore('medium', sloppy, questions).score;
    expect(cleanScore).toBeGreaterThan(sloppyScore);
  });

  it('Tranquilo: punto fijo por acierto, sin bono ni penalidad', () => {
    const questions = [question(1, 0), question(1, 0)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 60_000, mistakes: 3 },
      { correct: true, responseMs: 5, mistakes: 0 },
    ];
    const { score } = computeScore('zen', answers, questions);
    expect(score).toBe(200);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const questions = [question(1, 10), question(10, 10)];
    const answers: AnswerRecord[] = [
      { correct: true, responseMs: 10_000, mistakes: 0 },
      { correct: true, responseMs: 10_000, mistakes: 0 },
    ];
    const { score, metrics } = computeScore('progressive', answers, questions);
    expect(score).toBe(100 + 200); // grado 10 → multiplicador 2
    expect(metrics.maxStage).toBe(10);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con el modo de la configuración', () => {
    const questions = generateSession('easy', SEED);
    const answers: AnswerRecord[] = questions.map(() => ({
      correct: true,
      responseMs: 1000,
      mistakes: 0,
    }));
    const result = buildResult({ mode: 'easy', seed: SEED }, answers, questions, 60_000, true);
    expect(result.gameId).toBe('trios');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.metrics.correct).toBe(questions.length);
  });
});
