import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/random';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  generateGrid,
  getModeParams,
  MODE_PARAMS,
  pressCell,
  pressCellInRound,
  stageParams,
  ZEN_ROUND_COUNT,
  type RoundSpec,
} from './logic';

const SEED = 123;

describe('pressCell', () => {
  it('invierte la celda tocada y sus vecinas ortogonales', () => {
    const grid = new Array(9).fill(false); // grilla 3x3, todas apagadas
    // Tocar el centro (índice 4, fila 1 col 1) prende la cruz: 1,3,4,5,7.
    const next = pressCell(grid, 3, 4);
    expect(next).toEqual([false, true, false, true, true, true, false, true, false]);
  });

  it('no se sale de la grilla al tocar una esquina', () => {
    const grid = new Array(9).fill(false);
    // Esquina superior izquierda (índice 0): solo prende 0, 1 (derecha) y 3 (abajo).
    const next = pressCell(grid, 3, 0);
    expect(next).toEqual([true, true, false, true, false, false, false, false, false]);
  });

  it('tocar la misma celda dos veces vuelve al estado original (es su propia inversa)', () => {
    const grid = [true, false, true, false, true, false, true, false, true];
    const twice = pressCell(pressCell(grid, 3, 4), 3, 4);
    expect(twice).toEqual(grid);
  });
});

describe('generateGrid', () => {
  it('misma semilla, misma grilla', () => {
    expect(generateGrid(createRng(SEED), 5, 10)).toEqual(generateGrid(createRng(SEED), 5, 10));
  });

  it('nunca arranca ya resuelta', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const grid = generateGrid(createRng(seed), 4, 6);
      expect(grid.some((cell) => cell)).toBe(true);
    }
  });

  it('siempre tiene solución: presionar las mismas celdas usadas para mezclar la resuelve', () => {
    // Reconstruimos la mezcla con el mismo generador de números para conocer
    // qué celdas se tocaron, y verificamos que volver a tocarlas apaga todo.
    const rng = createRng(SEED);
    const gridSize = 4;
    const scrambleMoves = 8;
    const pressedIndices: number[] = [];
    let grid: boolean[] = new Array(gridSize * gridSize).fill(false);
    for (let i = 0; i < scrambleMoves; i += 1) {
      const idx = Math.floor(rng() * (gridSize * gridSize));
      pressedIndices.push(idx);
      grid = pressCell(grid, gridSize, idx);
    }
    for (const idx of pressedIndices) {
      grid = pressCell(grid, gridSize, idx);
    }
    expect(grid.every((cell) => !cell)).toBe(true);
  });
});

describe('buildRounds', () => {
  it('modos fijos: una sola ronda con el tamaño del modo', () => {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const params = getModeParams(mode);
      const rounds = buildRounds(mode, SEED);
      expect(rounds).toHaveLength(1);
      expect(rounds[0]!.gridSize).toBe(params.gridSize);
      expect(rounds[0]!.initialGrid).toHaveLength(params.gridSize * params.gridSize);
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

  it('los grados 9-10 no agrandan la grilla más allá de Difícil (RNF-04), pero sí mezclan más', () => {
    expect(stageParams(9).gridSize).toBe(MODE_PARAMS.hard.gridSize);
    expect(stageParams(10).gridSize).toBe(MODE_PARAMS.hard.gridSize);
    expect(stageParams(10).scrambleMoves).toBeGreaterThan(MODE_PARAMS.hard.scrambleMoves);
  });
});

describe('pressCellInRound', () => {
  const round: RoundSpec = {
    initialGrid: [true, true, false, true, false, false, false, false, false],
    gridSize: 3,
    scrambleMoves: 1,
    stage: 1,
  };

  it('presionar la esquina invierte esa celda y sus vecinas', () => {
    const progress = createRoundProgress(round);
    const next = pressCellInRound(round, progress, 0);
    expect(next.presses).toBe(1);
    // Esquina 0 se apaga (era true), su vecina derecha (1, era true) se apaga,
    // su vecina abajo (3, era true) se apaga: queda todo en false → resuelto.
    expect(next.grid.every((cell) => !cell)).toBe(true);
    expect(next.done).toBe(true);
  });

  it('no hace nada si la ronda ya terminó', () => {
    const progress = createRoundProgress(round);
    const solved = pressCellInRound(round, progress, 0);
    expect(solved.done).toBe(true);
    const again = pressCellInRound(round, solved, 1);
    expect(again).toBe(solved);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const rounds = buildRounds('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, rounds, [6], 5000);
    expect(result.gameId).toBe('lights-out');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.completedRounds).toBe(1);
    expect(result.metrics.totalPresses).toBe(6);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntos fijos por ronda completada', () => {
    const rounds = buildRounds('zen', SEED);
    const result = buildResult({ mode: 'zen', seed: SEED }, rounds, [8, 20, 5], 5000);
    expect(result.score).toBe(300);
  });

  it('menos toques puntúa más que más toques', () => {
    const rounds = buildRounds('easy', SEED);
    const efficient = buildResult({ mode: 'easy', seed: SEED }, rounds, [4], 1000);
    const inefficient = buildResult({ mode: 'easy', seed: SEED }, rounds, [30], 1000);
    expect(efficient.score).toBeGreaterThan(inefficient.score);
  });

  it('progresivo: el grado multiplica el puntaje', () => {
    const easyRound: RoundSpec = {
      initialGrid: [],
      gridSize: MODE_PARAMS.easy.gridSize,
      scrambleMoves: MODE_PARAMS.easy.scrambleMoves,
      stage: 1,
    };
    const hardStageRound: RoundSpec = {
      initialGrid: [],
      gridSize: MODE_PARAMS.hard.gridSize,
      scrambleMoves: MODE_PARAMS.hard.scrambleMoves,
      stage: 8,
    };
    const stage1 = buildResult({ mode: 'progressive', seed: SEED }, [easyRound], [6], 1000);
    const stage8 = buildResult({ mode: 'progressive', seed: SEED }, [hardStageRound], [15], 1000);
    expect(stage8.score).toBeGreaterThan(stage1.score);
    expect(stage8.metrics.maxStage).toBe(8);
  });
});
