import { describe, expect, it } from 'vitest';
import {
  buildResult,
  consumeDirection,
  createInitialState,
  step,
  type Direction,
} from './logic';

describe('consumeDirection', () => {
  it('devuelve la dirección actual si la cola está vacía', () => {
    const queue: Direction[] = [];
    expect(consumeDirection('right', queue)).toBe('right');
    expect(queue).toHaveLength(0);
  });

  it('toma el primer giro válido y deja el resto en la cola', () => {
    // Yendo a la derecha, el jugador encadena arriba y luego izquierda: este
    // tick gira arriba; izquierda queda para el próximo (no se pierde).
    const queue: Direction[] = ['up', 'left'];
    expect(consumeDirection('right', queue)).toBe('up');
    expect(queue).toEqual(['left']);
  });

  it('descarta la dirección opuesta (imposible) y sigue buscando', () => {
    // Yendo a la derecha: izquierda es opuesta → se descarta; toma abajo.
    const queue: Direction[] = ['left', 'down'];
    expect(consumeDirection('right', queue)).toBe('down');
    expect(queue).toHaveLength(0);
  });

  it('devuelve la actual si solo hay inputs inválidos', () => {
    const queue: Direction[] = ['left']; // opuesta a right
    expect(consumeDirection('right', queue)).toBe('right');
    expect(queue).toHaveLength(0);
  });
});

describe('createInitialState', () => {
  it('es determinística con la misma semilla', () => {
    const a = createInitialState(3, 42);
    const b = createInitialState(3, 42);
    expect(a).toEqual(b);
  });

  it('arranca con 3 segmentos moviéndose a la derecha', () => {
    const state = createInitialState(1, 1);
    expect(state.snake).toHaveLength(3);
    expect(state.direction).toBe('right');
    expect(state.gameOver).toBe(false);
  });

  it('genera la cantidad de obstáculos del nivel, sin superponerse con la serpiente', () => {
    const state = createInitialState(4, 7); // nivel 4: 6 obstáculos
    expect(state.obstacles).toHaveLength(6);
    for (const obstacle of state.obstacles) {
      const overlapsSnake = state.snake.some((s) => s.x === obstacle.x && s.y === obstacle.y);
      expect(overlapsSnake).toBe(false);
    }
  });

  it('nivel 1 no tiene obstáculos', () => {
    expect(createInitialState(1, 1).obstacles).toHaveLength(0);
  });
});

describe('step', () => {
  it('mueve la cabeza en la dirección pedida y mantiene el largo si no come', () => {
    const initial = createInitialState(1, 1);
    const head = initial.snake[0]!;
    const next = step(initial, 'right');
    expect(next.snake).toHaveLength(initial.snake.length);
    expect(next.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    expect(next.gameOver).toBe(false);
  });

  it('ignora un giro de 180 grados', () => {
    const initial = createInitialState(1, 1); // dirección inicial: right
    const next = step(initial, 'left');
    // sigue moviéndose a la derecha, no revierte sobre el propio cuerpo
    expect(next.direction).toBe('right');
  });

  it('termina el juego al chocar contra la pared', () => {
    let state = createInitialState(1, 1);
    // empujar la serpiente hacia la pared derecha
    for (let i = 0; i < state.gridSize + 2 && !state.gameOver; i += 1) {
      state = step(state, 'right');
    }
    expect(state.gameOver).toBe(true);
  });

  it('no hace nada si ya terminó', () => {
    let state = createInitialState(1, 1);
    for (let i = 0; i < state.gridSize + 2 && !state.gameOver; i += 1) {
      state = step(state, 'right');
    }
    expect(state.gameOver).toBe(true);
    const afterGameOver = step(state, 'up');
    expect(afterGameOver).toEqual(state);
  });

  it('crece y suma puntaje al comer, y acelera hasta el piso del nivel', () => {
    // Coloca la comida justo delante de la cabeza para forzar que la coma.
    let state = createInitialState(1, 1);
    const head = state.snake[0]!;
    state = { ...state, food: { x: head.x + 1, y: head.y } };
    const lengthBefore = state.snake.length;
    const intervalBefore = state.intervalMs;

    const next = step(state, 'right');

    expect(next.snake).toHaveLength(lengthBefore + 1);
    expect(next.score).toBe(10);
    expect(next.foodCount).toBe(1);
    expect(next.intervalMs).toBe(Math.max(state.minIntervalMs, intervalBefore - state.speedStepMs));
    // la nueva comida no puede aparecer sobre la serpiente
    const overlapsSnake = next.snake.some((s) => s.x === next.food.x && s.y === next.food.y);
    expect(overlapsSnake).toBe(false);
  });
});

describe('buildResult', () => {
  it('arma un GameResult válido y siempre completado', () => {
    const state = createInitialState(2, 3);
    const result = buildResult({ level: 2, seed: 3 }, state, 5000);
    expect(result.gameId).toBe('snake');
    expect(result.completed).toBe(true);
    expect(result.durationMs).toBe(5000);
    expect(result.metrics.length).toBe(state.snake.length);
  });
});
