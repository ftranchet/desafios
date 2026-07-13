import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  buildRounds,
  computeScore,
  createRoundProgress,
  generateGrid,
  getModeParams,
  MODE_PARAMS,
  stageParams,
  submitNumber,
  ZEN_ROUND_COUNT,
  type RoundRecord,
  type RoundSpec,
} from './logic';

const SEED = 123;

describe('generateGrid', () => {
  it('misma semilla, misma grilla', () => {
    expect(generateGrid(createRng(SEED), 5)).toEqual(generateGrid(createRng(SEED), 5));
  });

  it('contiene cada número de 1 a gridSize² exactamente una vez', () => {
    const grid = generateGrid(createRng(SEED), 5);
    expect(grid).toHaveLength(25);
    expect(new Set(grid)).toEqual(new Set(Array.from({ length: 25 }, (_, i) => i + 1)));
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda del tamaño del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.gridSize).toBe(params.gridSize);
      expect(rounds[0]!.stage).toBe(1);
    }
  });

  it('Tranquilo: ZEN_ROUND_COUNT rondas de grado 1', () => {
    const rounds = buildRounds('zen', SEED);
    expect(rounds).toHaveLength(ZEN_ROUND_COUNT);
    expect(rounds.every((r) => r.stage === 1)).toBe(true);
  });

  it('Progresivo: 10 rondas con grado creciente', () => {
    const rounds = buildRounds('progressive', SEED);
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('misma semilla, misma sesión completa', () => {
    expect(buildRounds('hard', SEED)).toEqual(buildRounds('hard', SEED));
    expect(buildRounds('progressive', SEED)).toEqual(buildRounds('progressive', SEED));
  });
});

describe('stageParams', () => {
  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    expect(stageParams(1).gridSize).toBe(MODE_PARAMS.easy.gridSize);
    expect(stageParams(8).gridSize).toBe(MODE_PARAMS.hard.gridSize);
  });

  it('los grados 9-10 no superan el tamaño de Difícil (objetivos táctiles, RNF-04)', () => {
    expect(stageParams(9).gridSize).toBe(MODE_PARAMS.hard.gridSize);
    expect(stageParams(10).gridSize).toBe(MODE_PARAMS.hard.gridSize);
  });
});

describe('submitNumber', () => {
  const round: RoundSpec = { grid: [3, 1, 4, 2], gridSize: 2, stage: 1 }; // gridSize 2 → 4 celdas

  it('tocar el número esperado avanza expected', () => {
    const progress = createRoundProgress();
    const next = submitNumber(round, progress, 1);
    expect(next.expected).toBe(2);
    expect(next.mistakes).toBe(0);
    expect(next.done).toBe(false);
  });

  it('tocar un número que no es el esperado suma un error sin avanzar', () => {
    const progress = createRoundProgress();
    const next = submitNumber(round, progress, 3);
    expect(next.expected).toBe(1);
    expect(next.mistakes).toBe(1);
    expect(next.done).toBe(false);
  });

  it('completar la grilla marca done', () => {
    // round.gridSize = 2 → 4 celdas: agotar 1,2,3,4 en orden.
    let progress = createRoundProgress();
    for (const n of [1, 2, 3, 4]) {
      progress = submitNumber(round, progress, n);
    }
    expect(progress.done).toBe(true);
    expect(progress.mistakes).toBe(0);
  });

  it('no hace nada si la ronda ya terminó', () => {
    const doneProgress = { expected: 5, mistakes: 0, done: true };
    expect(submitNumber(round, doneProgress, 1)).toBe(doneProgress);
  });
});

describe('computeScore', () => {
  const easyRound: RoundSpec = { grid: [], gridSize: MODE_PARAMS.easy.gridSize, stage: 1 };
  const hardStageRound: RoundSpec = { grid: [], gridSize: MODE_PARAMS.hard.gridSize, stage: 8 };

  it('Tranquilo: puntos fijos por ronda completada, sin bono de tiempo', () => {
    const records: RoundRecord[] = [
      { elapsedMs: 60_000, mistakes: 0 },
      { elapsedMs: 100, mistakes: 3 },
    ];
    const rounds: RoundSpec[] = [easyRound, easyRound];
    expect(computeScore('zen', rounds, records).score).toBe(200);
  });

  it('más rápido que el ritmo de referencia puntúa más que más lento', () => {
    const fast = computeScore('easy', [easyRound], [{ elapsedMs: 2000, mistakes: 0 }]).score;
    const slow = computeScore('easy', [easyRound], [{ elapsedMs: 20_000, mistakes: 0 }]).score;
    expect(fast).toBeGreaterThan(slow);
  });

  it('los errores penalizan el puntaje de la ronda', () => {
    const clean = computeScore('easy', [easyRound], [{ elapsedMs: 5000, mistakes: 0 }]).score;
    const withMistakes = computeScore(
      'easy',
      [easyRound],
      [{ elapsedMs: 5000, mistakes: 4 }],
    ).score;
    expect(withMistakes).toBeLessThan(clean);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const record: RoundRecord = { elapsedMs: 8000, mistakes: 0 };
    const stage1 = computeScore('progressive', [easyRound], [record]).score;
    const stage8 = computeScore('progressive', [hardStageRound], [record]).score;
    expect(stage8).toBeGreaterThan(stage1);
  });

  it('reporta el grado máximo alcanzado', () => {
    const { metrics } = computeScore(
      'progressive',
      [easyRound, hardStageRound],
      [
        { elapsedMs: 5000, mistakes: 0 },
        { elapsedMs: 5000, mistakes: 0 },
      ],
    );
    expect(metrics.maxStage).toBe(8);
    expect(metrics.completedRounds).toBe(2);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const rounds = buildRounds('easy', SEED);
    const records: RoundRecord[] = [{ elapsedMs: 4000, mistakes: 1 }];
    const result = buildResult({ mode: 'easy', seed: SEED }, rounds, records, 5000);
    expect(result.gameId).toBe('schulte-table');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.completedRounds).toBe(1);
    expect(result.metrics.totalRounds).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });
});
