import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  generateBoard,
  getModeParams,
  MODE_PARAMS,
  resolveSelection,
  selectCard,
  stageParams,
  SYMBOL_COUNT,
  ZEN_ROUND_COUNT,
  type RoundSpec,
} from './logic';

const SEED = 123;

describe('generateBoard', () => {
  it('misma semilla, mismo tablero', () => {
    expect(generateBoard(createRng(SEED), 6)).toEqual(generateBoard(createRng(SEED), 6));
  });

  it('cada símbolo aparece exactamente 2 veces', () => {
    const board = generateBoard(createRng(SEED), 8);
    expect(board).toHaveLength(16);
    const counts = new Map<number, number>();
    for (const symbol of board) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    expect(counts.size).toBe(8);
    for (const count of counts.values()) expect(count).toBe(2);
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con la cantidad de pares del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.pairCount).toBe(params.pairCount);
      expect(rounds[0]!.board).toHaveLength(params.pairCount * 2);
      expect(rounds[0]!.stage).toBe(1);
    }
  });

  it('Tranquilo: ZEN_ROUND_COUNT rondas de grado 1', () => {
    const rounds = buildRounds('zen', SEED);
    expect(rounds).toHaveLength(ZEN_ROUND_COUNT);
    expect(rounds.every((r) => r.stage === 1)).toBe(true);
  });

  it('Progresivo: 10 rondas con grado creciente, sin superar el banco de símbolos', () => {
    const rounds = buildRounds('progressive', SEED);
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const round of rounds) {
      expect(round.pairCount).toBeLessThanOrEqual(SYMBOL_COUNT);
    }
    expect(rounds[9]!.pairCount).toBeGreaterThanOrEqual(rounds[0]!.pairCount);
  });

  it('misma semilla, misma sesión completa', () => {
    expect(buildRounds('hard', SEED)).toEqual(buildRounds('hard', SEED));
    expect(buildRounds('progressive', SEED)).toEqual(buildRounds('progressive', SEED));
  });
});

describe('stageParams', () => {
  it('el grado 1 coincide con Fácil y el grado 8 con Difícil', () => {
    expect(stageParams(1).pairCount).toBe(MODE_PARAMS.easy.pairCount);
    expect(stageParams(8).pairCount).toBe(MODE_PARAMS.hard.pairCount);
  });
});

describe('selectCard / resolveSelection', () => {
  const round: RoundSpec = { board: [0, 1, 0, 1], pairCount: 2, stage: 1 };

  it('selecciona hasta 2 celdas, ignora una tercera', () => {
    let progress = createRoundProgress(round);
    progress = selectCard(progress, 0);
    expect(progress.selectedCells).toEqual([0]);
    progress = selectCard(progress, 1);
    expect(progress.selectedCells).toEqual([0, 1]);
    progress = selectCard(progress, 2);
    expect(progress.selectedCells).toEqual([0, 1]); // ignora la tercera hasta resolver
  });

  it('ignora una celda ya seleccionada', () => {
    let progress = createRoundProgress(round);
    progress = selectCard(progress, 0);
    progress = selectCard(progress, 0);
    expect(progress.selectedCells).toEqual([0]);
  });

  it('resuelve un acierto: marca ambas como emparejadas y limpia la selección', () => {
    let progress = createRoundProgress(round);
    progress = selectCard(progress, 0);
    progress = selectCard(progress, 2); // ambas son símbolo 0
    const resolved = resolveSelection(round, progress);
    expect(resolved.matchedCells).toEqual([true, false, true, false]);
    expect(resolved.selectedCells).toEqual([]);
    expect(resolved.matchesFound).toBe(1);
    expect(resolved.moves).toBe(1);
    expect(resolved.done).toBe(false); // falta el otro par
  });

  it('resuelve un error: no marca nada, solo limpia la selección y suma el movimiento', () => {
    let progress = createRoundProgress(round);
    progress = selectCard(progress, 0);
    progress = selectCard(progress, 1); // símbolos distintos
    const resolved = resolveSelection(round, progress);
    expect(resolved.matchedCells).toEqual([false, false, false, false]);
    expect(resolved.selectedCells).toEqual([]);
    expect(resolved.matchesFound).toBe(0);
    expect(resolved.moves).toBe(1);
  });

  it('completar todos los pares marca done', () => {
    let progress = createRoundProgress(round);
    progress = resolveSelection(round, selectCard(selectCard(progress, 0), 2));
    progress = resolveSelection(round, selectCard(selectCard(progress, 1), 3));
    expect(progress.done).toBe(true);
    expect(progress.matchesFound).toBe(2);
  });

  it('no hace nada si la ronda ya terminó', () => {
    let progress = createRoundProgress(round);
    progress = resolveSelection(round, selectCard(selectCard(progress, 0), 2));
    progress = resolveSelection(round, selectCard(selectCard(progress, 1), 3));
    expect(progress.done).toBe(true);
    const untouched = selectCard(progress, 0);
    expect(untouched).toBe(progress);
  });

  it('no permite seleccionar una celda ya emparejada', () => {
    let progress = createRoundProgress(round);
    progress = resolveSelection(round, selectCard(selectCard(progress, 0), 2));
    expect(progress.matchedCells[0]).toBe(true);
    const attempt = selectCard(progress, 0);
    expect(attempt).toBe(progress);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const rounds = buildRounds('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, rounds, [10], 5000);
    expect(result.gameId).toBe('memory-match');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.completedRounds).toBe(1);
    expect(result.metrics.totalRounds).toBe(1);
    expect(result.metrics.totalMoves).toBe(10);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntos fijos por ronda completada, sin bono de eficiencia', () => {
    const rounds = buildRounds('zen', SEED);
    const result = buildResult({ mode: 'zen', seed: SEED }, rounds, [100, 3, 8], 5000);
    expect(result.score).toBe(300); // 100 puntos por ronda, sin importar los movimientos
  });

  it('menos movimientos puntúa más que más movimientos', () => {
    const rounds = buildRounds('easy', SEED);
    const efficient = buildResult(
      { mode: 'easy', seed: SEED },
      rounds,
      [rounds[0]!.pairCount],
      1000,
    );
    const inefficient = buildResult(
      { mode: 'easy', seed: SEED },
      rounds,
      [rounds[0]!.pairCount * 5],
      1000,
    );
    expect(efficient.score).toBeGreaterThan(inefficient.score);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const easyRound: RoundSpec = { board: [], pairCount: MODE_PARAMS.easy.pairCount, stage: 1 };
    const hardStageRound: RoundSpec = {
      board: [],
      pairCount: MODE_PARAMS.hard.pairCount,
      stage: 8,
    };
    const stage1 = buildResult(
      { mode: 'progressive', seed: SEED },
      [easyRound],
      [easyRound.pairCount],
      1000,
    );
    const stage8 = buildResult(
      { mode: 'progressive', seed: SEED },
      [hardStageRound],
      [hardStageRound.pairCount],
      1000,
    );
    expect(stage8.score).toBeGreaterThan(stage1.score);
    expect(stage8.metrics.maxStage).toBe(8);
  });
});
