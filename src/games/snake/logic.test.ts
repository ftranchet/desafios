import { describe, expect, it } from 'vitest';
import {
  buildResult,
  consumeDirection,
  createInitialState,
  getModeParams,
  intervalForStage,
  stageForFood,
  steerToward,
  step,
  type Direction,
  type SnakeState,
} from './logic';

const SEED = 42;

describe('createInitialState', () => {
  it('misma semilla, misma partida', () => {
    expect(createInitialState('medium', SEED)).toEqual(createInitialState('medium', SEED));
  });

  it('cada modo genera su grilla y obstáculos declarados', () => {
    for (const mode of ['easy', 'medium', 'hard', 'zen', 'progressive'] as const) {
      const params = getModeParams(mode);
      const state = createInitialState(mode, SEED);
      expect(state.gridSize).toBe(params.gridSize);
      expect(state.obstacles).toHaveLength(params.obstacleCount);
      expect(state.snake).toHaveLength(3);
      expect(state.gameOver).toBe(false);
    }
  });

  it('rechaza un modo desconocido', () => {
    expect(() => getModeParams('otro' as never)).toThrow();
  });
});

// Avanza en línea recta hasta chocar contra la pared derecha.
function runIntoWall(state: SnakeState): SnakeState {
  let current = state;
  for (let i = 0; i < state.gridSize + 2 && !current.gameOver && current.crashes === 0; i += 1) {
    current = step(current, 'right');
  }
  return current;
}

describe('step: modos fijos', () => {
  it('chocar la pared termina la partida', () => {
    const state = runIntoWall(createInitialState('easy', SEED));
    expect(state.gameOver).toBe(true);
  });

  it('comer suma puntos, agranda la víbora y acelera', () => {
    let state = createInitialState('easy', SEED);
    // Colocar la comida justo adelante de la cabeza para forzar la comida.
    const head = state.snake[0]!;
    state = { ...state, food: { x: head.x + 1, y: head.y } };
    const next = step(state, 'right');
    expect(next.score).toBe(10);
    expect(next.snake.length).toBe(state.snake.length + 1);
    expect(next.intervalMs).toBeLessThan(state.intervalMs);
  });
});

describe('step: modo Tranquilo (zen)', () => {
  it('chocar no termina: reacomoda la víbora y cuenta el choque', () => {
    const state = runIntoWall(createInitialState('zen', SEED));
    expect(state.gameOver).toBe(false);
    expect(state.crashes).toBe(1);
    expect(state.snake).toHaveLength(3);
    expect(state.direction).toBe('right');
  });

  it('conserva el puntaje después del choque', () => {
    let state = createInitialState('zen', SEED);
    const head = state.snake[0]!;
    state = { ...state, food: { x: head.x + 1, y: head.y } };
    state = step(state, 'right'); // come
    const scoreBefore = state.score;
    state = runIntoWall(state);
    expect(state.crashes).toBe(1);
    expect(state.score).toBe(scoreBefore);
  });

  it('la velocidad no cambia al comer', () => {
    let state = createInitialState('zen', SEED);
    const head = state.snake[0]!;
    state = { ...state, food: { x: head.x + 1, y: head.y } };
    const next = step(state, 'right');
    expect(next.intervalMs).toBe(state.intervalMs);
  });
});

describe('modo progresivo', () => {
  it('el grado sube cada 3 comidas hasta 10', () => {
    expect(stageForFood(0)).toBe(1);
    expect(stageForFood(2)).toBe(1);
    expect(stageForFood(3)).toBe(2);
    expect(stageForFood(27)).toBe(10);
    expect(stageForFood(90)).toBe(10);
  });

  it('la velocidad del grado 10 supera a la del Difícil actual (extrapolación)', () => {
    expect(intervalForStage(1)).toBe(getModeParams('easy').initialIntervalMs);
    expect(intervalForStage(10)).toBeLessThan(getModeParams('hard').initialIntervalMs);
    expect(intervalForStage(10)).toBeGreaterThanOrEqual(getModeParams('progressive').minIntervalMs);
  });

  it('al subir de grado aparece un obstáculo nuevo y sube la velocidad', () => {
    let state = createInitialState('progressive', SEED);
    // Comer 3 veces (colocando la comida adelante) para llegar al grado 2.
    for (let i = 0; i < 3; i += 1) {
      const head = state.snake[0]!;
      const target = { x: head.x + 1, y: head.y };
      state = step({ ...state, food: target }, 'right');
    }
    expect(state.stage).toBe(2);
    expect(state.obstacles).toHaveLength(1);
    expect(state.intervalMs).toBe(intervalForStage(2));
  });
});

describe('consumeDirection y steerToward (sin cambios de ADR-007)', () => {
  it('descarta la dirección opuesta y conserva la cola', () => {
    const queue: Direction[] = ['left', 'up'];
    expect(consumeDirection('right', queue)).toBe('up');
    expect(queue).toHaveLength(0);
  });

  it('steerToward elige el eje dominante evitando la reversa', () => {
    expect(steerToward({ x: 5, y: 5 }, { x: 9, y: 6 }, 'up')).toBe('right');
    expect(steerToward({ x: 5, y: 5 }, { x: 5, y: 9 }, 'left')).toBe('down');
  });
});

describe('buildResult', () => {
  it('emite un GameResult v2 con métricas del modo', () => {
    const state = runIntoWall(createInitialState('progressive', SEED));
    const result = buildResult({ mode: 'progressive', seed: SEED }, state, 12_000);
    expect(result.gameId).toBe('snake');
    expect(result.mode).toBe('progressive');
    expect(result.completed).toBe(true);
    expect(result.metrics.maxStage).toBe(state.stage);
    expect(result.metrics.crashes).toBe(0);
  });
});
