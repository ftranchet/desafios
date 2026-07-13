import { describe, expect, it } from 'vitest';
import {
  buildResult,
  createInitialState,
  move,
  MODE_PARAMS,
  parseLevel,
  resetLevel,
  selectLevel,
  type LevelDef,
} from './logic';
import { LEVELS_BY_TIER, type SokobanLevel } from './puzzles';

const SEED = 123;

/**
 * BFS sobre (posición del jugador, posiciones de las cajas): el mismo solver
 * usado para verificar el banco offline (ver el comentario de puzzles.ts),
 * reescrito acá para confirmarlo de forma independiente y permanente, no
 * solo en el momento de transcribir los niveles.
 */
function key(playerPos: number, boxes: readonly number[]): string {
  return `${playerPos}|${[...boxes].sort((a, b) => a - b).join(',')}`;
}

function solveOptimally(level: LevelDef): number | null {
  const goalSet = new Set(level.goals);
  function neighbor(index: number, dr: number, dc: number): number | null {
    const row = Math.floor(index / level.cols) + dr;
    const col = (index % level.cols) + dc;
    if (row < 0 || row >= level.rows || col < 0 || col >= level.cols) return null;
    return row * level.cols + col;
  }
  const DIRS: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  const queue: { playerPos: number; boxes: number[]; moves: number }[] = [
    { playerPos: level.playerStart, boxes: level.boxesStart, moves: 0 },
  ];
  const visited = new Set([key(level.playerStart, level.boxesStart)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.boxes.every((box) => goalSet.has(box))) return current.moves;
    for (const [dr, dc] of DIRS) {
      const target = neighbor(current.playerPos, dr, dc);
      if (target === null || level.walls[target]) continue;
      const boxIndex = current.boxes.indexOf(target);
      let boxes = current.boxes;
      if (boxIndex !== -1) {
        const beyond = neighbor(target, dr, dc);
        if (beyond === null || level.walls[beyond] || current.boxes.includes(beyond)) continue;
        boxes = current.boxes.slice();
        boxes[boxIndex] = beyond;
      }
      const k = key(target, boxes);
      if (visited.has(k)) continue;
      visited.add(k);
      queue.push({ playerPos: target, boxes, moves: current.moves + 1 });
    }
  }
  return null;
}

describe('banco de niveles', () => {
  it('cada nivel es resoluble y parMoves coincide con el óptimo real (BFS)', () => {
    for (const bank of Object.values(LEVELS_BY_TIER)) {
      for (const levelData of bank) {
        const level = parseLevel(levelData);
        const optimal = solveOptimally(level);
        expect(optimal).not.toBeNull();
        expect(optimal).toBe(levelData.parMoves);
      }
    }
  });

  it('cada nivel tiene tantas cajas como objetivos', () => {
    for (const bank of Object.values(LEVELS_BY_TIER)) {
      for (const levelData of bank) {
        const level = parseLevel(levelData);
        expect(level.boxesStart).toHaveLength(level.goals.length);
        expect(level.playerStart).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('parseLevel', () => {
  it('reconoce paredes, objetivo, caja y jugador de un mapa chico', () => {
    const level: SokobanLevel = { map: ['###', '#@#', '# #', '#$#', '#.#', '###'], parMoves: 1 };
    const parsed = parseLevel(level);
    expect(parsed.rows).toBe(6);
    expect(parsed.cols).toBe(3);
    expect(parsed.playerStart).toBe(1 * 3 + 1);
    expect(parsed.boxesStart).toEqual([3 * 3 + 1]);
    expect(parsed.goals).toEqual([4 * 3 + 1]);
    expect(parsed.walls[0]).toBe(true);
    expect(parsed.walls[1 * 3 + 1]).toBe(false);
  });
});

describe('selectLevel', () => {
  it('misma semilla, mismo nivel', () => {
    expect(selectLevel('medium', SEED)).toEqual(selectLevel('medium', SEED));
  });

  it('elige un nivel del banco correcto según el modo', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen'] as const) {
      const level = selectLevel(mode, SEED);
      const bank = LEVELS_BY_TIER[mode].map((l) => parseLevel(l));
      expect(bank).toContainEqual(level);
    }
  });
});

describe('move', () => {
  // ### / #@$.# / ### con jugador en (1,1), caja en (1,2), objetivo en (1,3).
  const level: LevelDef = {
    rows: 3,
    cols: 5,
    walls: [
      true, true, true, true, true,
      true, false, false, false, true,
      true, true, true, true, true,
    ],
    goals: [1 * 5 + 3],
    boxesStart: [1 * 5 + 2],
    playerStart: 1 * 5 + 1,
    parMoves: 1,
  };

  it('caminar hacia una celda libre no empuja nada', () => {
    const state = createInitialStateFromLevel(level);
    const next = move(state, 'left');
    expect(next).toBe(state); // hay pared a la izquierda, no se mueve
  });

  it('empujar una caja hacia una celda libre la mueve y avanza al jugador', () => {
    const state = createInitialStateFromLevel(level);
    const next = move(state, 'right');
    expect(next.playerPos).toBe(1 * 5 + 2);
    expect(next.boxes).toEqual([1 * 5 + 3]);
    expect(next.moves).toBe(1);
  });

  it('empujar una caja hasta el objetivo marca done', () => {
    const state = createInitialStateFromLevel(level);
    const next = move(state, 'right');
    expect(next.done).toBe(true);
  });

  it('no se puede empujar una caja contra una pared', () => {
    const blocked: LevelDef = {
      ...level,
      walls: [
        true, true, true, true, true,
        true, false, false, true, true,
        true, true, true, true, true,
      ],
    };
    const state = createInitialStateFromLevel(blocked);
    const next = move(state, 'right');
    expect(next).toBe(state);
  });

  it('no hace nada si el nivel ya está resuelto', () => {
    const state = createInitialStateFromLevel(level);
    const solved = move(state, 'right');
    expect(solved.done).toBe(true);
    const again = move(solved, 'left');
    expect(again).toBe(solved);
  });
});

function createInitialStateFromLevel(level: LevelDef) {
  return { level, playerPos: level.playerStart, boxes: [...level.boxesStart], moves: 0, done: false };
}

describe('resetLevel', () => {
  it('vuelve al estado inicial del nivel', () => {
    const state = createInitialState('easy', SEED);
    const moved = move(state, 'up');
    const reset = resetLevel(moved);
    expect(reset.playerPos).toBe(state.level.playerStart);
    expect(reset.boxes).toEqual(state.level.boxesStart);
    expect(reset.moves).toBe(0);
    expect(reset.done).toBe(false);
  });
});

describe('buildResult', () => {
  it('emite un GameResult válido con las métricas de la partida', () => {
    const state = createInitialState('easy', SEED);
    const result = buildResult({ mode: 'easy', seed: SEED }, state, 1234);
    expect(result.gameId).toBe('sokoban');
    expect(result.mode).toBe('easy');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(1234);
    expect(result.metrics.parMoves).toBe(state.level.parMoves);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('Tranquilo: puntaje fijo, sin importar los movimientos', () => {
    const state = createInitialState('zen', SEED);
    const result = buildResult({ mode: 'zen', seed: SEED }, state, 1000);
    expect(result.score).toBe(100);
  });

  it('menos movimientos puntúa más que más movimientos (a igual nivel)', () => {
    const state = createInitialState('easy', SEED);
    const efficient = { ...state, moves: state.level.parMoves };
    const wasteful = { ...state, moves: state.level.parMoves * 4 };
    const efficientResult = buildResult({ mode: 'easy', seed: SEED }, efficient, 1000);
    const wastefulResult = buildResult({ mode: 'easy', seed: SEED }, wasteful, 1000);
    expect(efficientResult.score).toBeGreaterThan(wastefulResult.score);
  });

  it('un nivel con más cajas pesa más en el puntaje, a igual eficiencia', () => {
    const easyState = createInitialState('easy', SEED);
    const hardState = createInitialState('hard', SEED);
    const easyPerfect = { ...easyState, moves: easyState.level.parMoves };
    const hardPerfect = { ...hardState, moves: hardState.level.parMoves };
    const easyResult = buildResult({ mode: 'easy', seed: SEED }, easyPerfect, 1000);
    const hardResult = buildResult({ mode: 'hard', seed: SEED }, hardPerfect, 1000);
    expect(hardResult.score).toBeGreaterThan(easyResult.score);
    expect(MODE_PARAMS.hard.boxCount).toBeGreaterThan(MODE_PARAMS.easy.boxCount);
  });
});
