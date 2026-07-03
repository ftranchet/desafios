import type { GameConfig, GameResult } from '../../core/contract';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de Snake — sin React ni canvas. Valida el bucle de tiempo real
// que hereda Cascada en Fase 2 (PRD 11.1).

export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface LevelParams extends Record<string, number> {
  gridSize: number;
  initialIntervalMs: number;
  speedStepMs: number; // cuánto baja el intervalo por cada comida
  minIntervalMs: number; // piso de velocidad
  obstacleCount: number;
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Fácil',
  2: 'Medio',
  3: 'Difícil',
  4: 'Avanzado',
  5: 'Experto',
};

export const LEVEL_PARAMS: Record<1 | 2 | 3 | 4 | 5, LevelParams> = {
  1: { gridSize: 14, initialIntervalMs: 220, speedStepMs: 4, minIntervalMs: 100, obstacleCount: 0 },
  2: { gridSize: 14, initialIntervalMs: 200, speedStepMs: 5, minIntervalMs: 90, obstacleCount: 0 },
  3: { gridSize: 16, initialIntervalMs: 180, speedStepMs: 6, minIntervalMs: 80, obstacleCount: 3 },
  4: { gridSize: 16, initialIntervalMs: 160, speedStepMs: 7, minIntervalMs: 70, obstacleCount: 6 },
  5: { gridSize: 18, initialIntervalMs: 140, speedStepMs: 8, minIntervalMs: 60, obstacleCount: 10 },
};

export function getLevelParams(level: number): LevelParams {
  const params = LEVEL_PARAMS[level as 1 | 2 | 3 | 4 | 5];
  if (!params) throw new Error(`Nivel inválido: ${level}`);
  return params;
}

export interface SnakeState {
  gridSize: number;
  seed: number;
  foodCount: number; // comidas ya comidas — deriva la semilla de la próxima comida
  snake: Position[]; // [0] = cabeza
  direction: Direction;
  food: Position;
  obstacles: Position[];
  intervalMs: number;
  speedStepMs: number;
  minIntervalMs: number;
  score: number;
  gameOver: boolean;
}

const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

// Toma el primer giro válido de la cola de inputs pendientes (descartando los
// que repiten la dirección actual o son su opuesta, imposibles en una grilla),
// y deja el resto en la cola para el próximo tick. Pura salvo por consumir la
// cola que se le pasa. Evita el "input dropping": si el jugador encadena dos
// giros rápidos antes de un tick, no se pierde el intermedio.
export function consumeDirection(current: Direction, queue: Direction[]): Direction {
  while (queue.length > 0) {
    const requested = queue.shift() as Direction;
    if (requested !== current && requested !== OPPOSITE[current]) {
      return requested;
    }
  }
  return current;
}

// Dirección para que la cabeza se acerque a `target` (control por seguimiento
// del dedo). Elige el eje con mayor distancia; si ese giro fuese la opuesta a la
// dirección actual (imposible en una grilla), usa el otro eje. Si no hay giro
// válido (ya alineado o el único eje disponible es el opuesto), mantiene la
// dirección actual. Pura y determinística.
export function steerToward(head: Position, target: Position, current: Direction): Direction {
  const dx = target.x - head.x;
  const dy = target.y - head.y;

  const horizontal: Direction | null = dx > 0 ? 'right' : dx < 0 ? 'left' : null;
  const vertical: Direction | null = dy > 0 ? 'down' : dy < 0 ? 'up' : null;

  // Candidatos ordenados por eje dominante (más lejano primero).
  const preferred = Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal];
  for (const candidate of preferred) {
    if (candidate && candidate !== OPPOSITE[current]) {
      return candidate;
    }
  }
  return current;
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

function samePos(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function pickFreeCell(rng: Rng, gridSize: number, occupied: Set<string>): Position {
  const cells: Position[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!occupied.has(posKey({ x, y }))) cells.push({ x, y });
    }
  }
  if (cells.length === 0) return { x: 0, y: 0 };
  const index = randomInt(rng, 0, cells.length - 1);
  return cells[index] ?? { x: 0, y: 0 };
}

// Cada comida nueva usa un offset de semilla distinto y determinístico, para
// que step() sea una función pura (mismo estado + dirección → mismo resultado).
function foodRngFor(seed: number, count: number): Rng {
  return createRng(seed + 1 + count);
}

export function createInitialState(level: number, seed: number): SnakeState {
  const params = getLevelParams(level);
  const { gridSize } = params;
  const center = Math.floor(gridSize / 2);
  const snake: Position[] = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];

  const obstacleRng = createRng(seed);
  const occupied = new Set(snake.map(posKey));
  const obstacles: Position[] = [];
  for (let i = 0; i < params.obstacleCount; i += 1) {
    const cell = pickFreeCell(obstacleRng, gridSize, occupied);
    obstacles.push(cell);
    occupied.add(posKey(cell));
  }

  const food = pickFreeCell(foodRngFor(seed, 0), gridSize, occupied);

  return {
    gridSize,
    seed,
    foodCount: 0,
    snake,
    direction: 'right',
    food,
    obstacles,
    intervalMs: params.initialIntervalMs,
    speedStepMs: params.speedStepMs,
    minIntervalMs: params.minIntervalMs,
    score: 0,
    gameOver: false,
  };
}

const POINTS_PER_FOOD = 10;

export function step(state: SnakeState, requestedDirection: Direction): SnakeState {
  if (state.gameOver) return state;

  const head = state.snake[0];
  if (!head) return state;

  const direction =
    OPPOSITE[requestedDirection] === state.direction && state.snake.length > 1
      ? state.direction
      : requestedDirection;

  const delta = DIRECTION_DELTAS[direction];
  const newHead: Position = { x: head.x + delta.x, y: head.y + delta.y };

  const hitWall =
    newHead.x < 0 || newHead.x >= state.gridSize || newHead.y < 0 || newHead.y >= state.gridSize;
  const hitObstacle = state.obstacles.some((o) => samePos(o, newHead));
  if (hitWall || hitObstacle) {
    return { ...state, direction, gameOver: true };
  }

  const ateFood = samePos(newHead, state.food);
  const bodyAfterMove = ateFood ? state.snake : state.snake.slice(0, -1);

  if (bodyAfterMove.some((seg) => samePos(seg, newHead))) {
    return { ...state, direction, gameOver: true };
  }

  const newSnake = [newHead, ...bodyAfterMove];

  if (!ateFood) {
    return { ...state, snake: newSnake, direction };
  }

  const newFoodCount = state.foodCount + 1;
  const occupied = new Set([...newSnake, ...state.obstacles].map(posKey));
  const food = pickFreeCell(foodRngFor(state.seed, newFoodCount), state.gridSize, occupied);
  const intervalMs = Math.max(state.minIntervalMs, state.intervalMs - state.speedStepMs);

  return {
    ...state,
    snake: newSnake,
    direction,
    food,
    foodCount: newFoodCount,
    intervalMs,
    score: state.score + POINTS_PER_FOOD,
  };
}

export function buildResult(config: GameConfig, state: SnakeState, durationMs: number): GameResult {
  return {
    gameId: 'snake',
    level: config.level,
    score: state.score,
    completed: true, // llegar a game over es un final natural del juego, no un abandono
    durationMs,
    metrics: { length: state.snake.length, foodEaten: state.foodCount },
    timestamp: new Date().toISOString(),
  };
}
