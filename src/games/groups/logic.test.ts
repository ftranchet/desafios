import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  findGroup,
  generateGrid,
  getModeParams,
  MODE_PARAMS,
  stageParams,
  tapCell,
  TILE_TYPE_COUNT,
  ZEN_ROUND_COUNT,
  type RoundProgress,
  type RoundSpec,
} from './logic';

const SEED = 123;

describe('findGroup', () => {
  it('encuentra el grupo conectado (4 direcciones) del mismo color', () => {
    // 3x3, colores: 0 0 1 / 0 1 1 / 2 2 1
    const grid = [0, 0, 1, 0, 1, 1, 2, 2, 1];
    const group = findGroup(grid, 3, 3, 0);
    expect(new Set(group)).toEqual(new Set([0, 1, 3]));
  });

  it('una ficha aislada no forma grupo (largo 1, no cuenta)', () => {
    const grid = [0, 1, 0, 1, 0, 1, 0, 1, 0];
    const group = findGroup(grid, 3, 3, 0);
    expect(group).toEqual([0]);
  });

  it('celda vacía (-1) no tiene grupo', () => {
    const grid = [-1, 0, 0];
    expect(findGroup(grid, 1, 3, 0)).toEqual([]);
  });
});

describe('generateGrid', () => {
  it('misma semilla, mismo tablero', () => {
    expect(generateGrid(createRng(SEED), 6, 5, 3)).toEqual(generateGrid(createRng(SEED), 6, 5, 3));
  });

  it('siempre tiene al menos un grupo de 2+ al generarse', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const grid = generateGrid(createRng(seed), 6, 5, 3);
      const hasGroup = grid.some((_, i) => findGroup(grid, 6, 5, i).length >= 2);
      expect(hasGroup).toBe(true);
    }
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con el tamaño del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.rows).toBe(params.rows);
      expect(rounds[0]!.cols).toBe(params.cols);
      expect(rounds[0]!.initialGrid).toHaveLength(params.rows * params.cols);
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
    expect(stageParams(1).rows).toBe(MODE_PARAMS.easy.rows);
    expect(stageParams(8).rows).toBe(MODE_PARAMS.hard.rows);
    expect(stageParams(8).colorCount).toBe(MODE_PARAMS.hard.colorCount);
  });

  it('los grados 9-10 agrandan filas y columnas sin techo (a diferencia de Apagá todo)', () => {
    expect(stageParams(10).rows).toBeGreaterThan(MODE_PARAMS.hard.rows);
  });

  it('colorCount se topa en TILE_TYPE_COUNT: no hay más tipos de ficha para extrapolar', () => {
    for (let stage = 1; stage <= 10; stage += 1) {
      expect(stageParams(stage).colorCount).toBeLessThanOrEqual(TILE_TYPE_COUNT);
    }
    expect(stageParams(10).colorCount).toBe(TILE_TYPE_COUNT);
  });
});

describe('tapCell', () => {
  // 3x3 fijo: 0 0 1 / 0 1 1 / 2 2 1 — el grupo de 0 (índices 0,1,3) y el de 1
  // (índices 2,4,5,8) son válidos; el de 2 (índices 6,7) también.
  const round: RoundSpec = { initialGrid: [0, 0, 1, 0, 1, 1, 2, 2, 1], rows: 3, cols: 3, stage: 1 };

  it('tocar un grupo de 2+ lo limpia y aplica gravedad (las de arriba caen)', () => {
    const progress = createRoundProgress(round);
    const next = tapCell(round, progress, 'easy', 0); // grupo de 0: índices 0,1,3
    // Se limpiaron 3 fichas de 9: quedan 6, todas caídas al fondo de sus columnas.
    expect(next.grid.filter((v) => v !== -1)).toHaveLength(6);
    expect(next.groupsCleared).toBe(1);
    expect(next.score).toBeGreaterThan(0);
  });

  it('tocar una ficha aislada (sin grupo de 2+) no hace nada', () => {
    const isolated: RoundSpec = { initialGrid: [0, 1, 0, 1, 0, 1, 0, 1, 0], rows: 3, cols: 3, stage: 1 };
    const progress = createRoundProgress(isolated);
    const next = tapCell(isolated, progress, 'easy', 0);
    expect(next).toBe(progress);
  });

  it('un grupo más grande da más puntos que uno chico (modo no Tranquilo)', () => {
    const progress = createRoundProgress(round);
    const bigGroup = tapCell(round, progress, 'easy', 2); // grupo de 1: 4 fichas (índices 2,4,5,8)
    const smallGroup = tapCell(round, progress, 'easy', 6); // grupo de 2: 2 fichas (índices 6,7)
    expect(bigGroup.score).toBeGreaterThan(smallGroup.score);
  });

  it('Tranquilo: puntos fijos por grupo, sin importar el tamaño', () => {
    const progress = createRoundProgress(round);
    const bigGroup = tapCell(round, progress, 'zen', 2);
    const smallGroup = tapCell(round, progress, 'zen', 6);
    expect(bigGroup.score).toBe(smallGroup.score);
  });

  it('vaciar el tablero entero marca done', () => {
    const tiny: RoundSpec = { initialGrid: [0, 0], rows: 1, cols: 2, stage: 1 };
    const progress = createRoundProgress(tiny);
    const next = tapCell(tiny, progress, 'easy', 0);
    expect(next.done).toBe(true);
    expect(next.grid.every((v) => v === -1)).toBe(true);
  });

  it('no hace nada si la ronda ya terminó', () => {
    const tiny: RoundSpec = { initialGrid: [0, 0], rows: 1, cols: 2, stage: 1 };
    const progress = createRoundProgress(tiny);
    const done = tapCell(tiny, progress, 'easy', 0);
    expect(done.done).toBe(true);
    const again = tapCell(tiny, done, 'easy', 0);
    expect(again).toBe(done);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const rounds = buildRounds('easy', SEED);
    const progress: RoundProgress = { grid: [], score: 55, groupsCleared: 3, done: true };
    const result = buildResult({ mode: 'easy', seed: SEED }, rounds, [progress], 5000);
    expect(result.gameId).toBe('groups');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.completedRounds).toBe(1);
    expect(result.metrics.totalGroupsCleared).toBe(3);
    expect(result.score).toBe(55);
  });

  it('Tranquilo: suma el puntaje fijo de cada ronda completada', () => {
    const rounds = buildRounds('zen', SEED);
    const progressList: RoundProgress[] = [
      { grid: [], score: 30, groupsCleared: 3, done: true },
      { grid: [], score: 20, groupsCleared: 2, done: true },
    ];
    const result = buildResult({ mode: 'zen', seed: SEED }, rounds, progressList, 5000);
    expect(result.score).toBe(50);
  });

  it('progresivo: el grado más alto queda en maxStage', () => {
    const rounds = buildRounds('progressive', SEED);
    const threeRounds: RoundProgress[] = [
      { grid: [], score: 10, groupsCleared: 1, done: true },
      { grid: [], score: 10, groupsCleared: 1, done: true },
      { grid: [], score: 10, groupsCleared: 1, done: true },
    ];
    const result = buildResult({ mode: 'progressive', seed: SEED }, rounds, threeRounds, 5000);
    expect(result.metrics.maxStage).toBe(3);
  });
});
