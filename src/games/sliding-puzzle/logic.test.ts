import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  generateBoard,
  getModeParams,
  MODE_PARAMS,
  stageParams,
  tapTile,
  ZEN_ROUND_COUNT,
  type RoundSpec,
} from './logic';

const SEED = 123;

/**
 * Verificador clásico de resolubilidad del 15-puzzle (fórmula estándar de
 * paridad de inversiones): con ancho impar alcanza con que las inversiones
 * (ignorando el hueco) sean pares; con ancho par depende además de en qué
 * fila (contada desde abajo) queda el hueco. No se usa en el juego —el
 * generador ya garantiza resolubilidad por construcción (desliza desde el
 * estado ordenado)— pero sirve para confirmarlo de forma independiente.
 */
function isSolvable(board: readonly number[], gridSize: number): boolean {
  const tiles = board.filter((v) => v !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i += 1) {
    for (let j = i + 1; j < tiles.length; j += 1) {
      if (tiles[i]! > tiles[j]!) inversions += 1;
    }
  }
  if (gridSize % 2 === 1) return inversions % 2 === 0;
  const blankIndex = board.indexOf(0);
  const blankRowFromBottom = gridSize - Math.floor(blankIndex / gridSize);
  return (inversions + blankRowFromBottom) % 2 === 1;
}

describe('generateBoard', () => {
  it('misma semilla, mismo tablero', () => {
    expect(generateBoard(createRng(SEED), 4, 30)).toEqual(generateBoard(createRng(SEED), 4, 30));
  });

  it('siempre es resoluble (verificado con la paridad de inversiones), para varios tamaños y semillas', () => {
    for (const gridSize of [3, 4, 5, 6]) {
      for (let seed = 0; seed < 15; seed += 1) {
        const board = generateBoard(createRng(seed), gridSize, 30);
        expect(isSolvable(board, gridSize)).toBe(true);
      }
    }
  });

  it('con scrambleMoves > 0 no queda ya ordenado', () => {
    for (let seed = 0; seed < 15; seed += 1) {
      const board = generateBoard(createRng(seed), 4, 20);
      const solved = board.every((v, i) => (i === board.length - 1 ? v === 0 : v === i + 1));
      expect(solved).toBe(false);
    }
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con el tamaño del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.gridSize).toBe(params.gridSize);
      expect(rounds[0]!.initialBoard).toHaveLength(params.gridSize * params.gridSize);
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
    expect(stageParams(8).scrambleMoves).toBe(MODE_PARAMS.hard.scrambleMoves);
  });

  it('los grados 9-10 superan a Difícil: sin techo de grilla (a diferencia de Apagá todo)', () => {
    expect(stageParams(10).gridSize).toBeGreaterThan(MODE_PARAMS.hard.gridSize);
    expect(stageParams(10).scrambleMoves).toBeGreaterThan(MODE_PARAMS.hard.scrambleMoves);
  });
});

describe('tapTile', () => {
  // Tablero 3x3 casi resuelto: hueco en el medio, la ficha 5 fuera de lugar.
  const round: RoundSpec = {
    initialBoard: [1, 2, 3, 4, 0, 6, 7, 8, 5],
    gridSize: 3,
    scrambleMoves: 1,
    stage: 1,
  };

  it('desliza la ficha adyacente al hueco sin resolver el tablero todavía', () => {
    const progress = createRoundProgress(round);
    expect(progress.done).toBe(false);
    // La ficha 6 (índice 5) es vecina del hueco (índice 4): se desliza, pero no resuelve.
    const afterMove = tapTile(round, progress, 5);
    expect(afterMove.moves).toBe(1);
    expect(afterMove.board[4]).toBe(6);
    expect(afterMove.board[5]).toBe(0);
    expect(afterMove.done).toBe(false);
  });

  it('no hace nada si la ficha tocada no es vecina del hueco', () => {
    const progress = createRoundProgress(round);
    // Índice 8 (ficha 5) no es vecino del hueco (índice 4).
    const untouched = tapTile(round, progress, 8);
    expect(untouched).toBe(progress);
  });

  it('deslizar la última ficha hacia el hueco resuelve el tablero', () => {
    const almostSolved: RoundSpec = {
      initialBoard: [1, 2, 3, 4, 5, 6, 7, 0, 8],
      gridSize: 3,
      scrambleMoves: 1,
      stage: 1,
    };
    const progress = createRoundProgress(almostSolved);
    expect(progress.done).toBe(false);
    const solved = tapTile(almostSolved, progress, 8);
    expect(solved.done).toBe(true);
    expect(solved.moves).toBe(1);
  });

  it('no hace nada si la ronda ya terminó', () => {
    const almostSolved: RoundSpec = {
      initialBoard: [1, 2, 3, 4, 5, 6, 7, 0, 8],
      gridSize: 3,
      scrambleMoves: 1,
      stage: 1,
    };
    const progress = createRoundProgress(almostSolved);
    const solved = tapTile(almostSolved, progress, 8);
    expect(solved.done).toBe(true);
    const again = tapTile(almostSolved, solved, 7);
    expect(again).toBe(solved);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const rounds = buildRounds('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, rounds, [25], 5000);
    expect(result.gameId).toBe('sliding-puzzle');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.completedRounds).toBe(1);
    expect(result.metrics.totalMoves).toBe(25);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntos fijos por ronda completada', () => {
    const rounds = buildRounds('zen', SEED);
    const result = buildResult({ mode: 'zen', seed: SEED }, rounds, [40, 60, 30], 5000);
    expect(result.score).toBe(300);
  });

  it('menos movimientos puntúa más que más movimientos', () => {
    const rounds = buildRounds('easy', SEED);
    const efficient = buildResult({ mode: 'easy', seed: SEED }, rounds, [15], 1000);
    const inefficient = buildResult({ mode: 'easy', seed: SEED }, rounds, [90], 1000);
    expect(efficient.score).toBeGreaterThan(inefficient.score);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const easyRound: RoundSpec = {
      initialBoard: [],
      gridSize: MODE_PARAMS.easy.gridSize,
      scrambleMoves: MODE_PARAMS.easy.scrambleMoves,
      stage: 1,
    };
    const hardStageRound: RoundSpec = {
      initialBoard: [],
      gridSize: MODE_PARAMS.hard.gridSize,
      scrambleMoves: MODE_PARAMS.hard.scrambleMoves,
      stage: 8,
    };
    const stage1 = buildResult({ mode: 'progressive', seed: SEED }, [easyRound], [20], 1000);
    const stage8 = buildResult({ mode: 'progressive', seed: SEED }, [hardStageRound], [120], 1000);
    expect(stage8.score).toBeGreaterThan(stage1.score);
    expect(stage8.metrics.maxStage).toBe(8);
  });
});
