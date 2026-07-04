import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de Snake — sin React ni canvas. Implementación de referencia de
// ADR-007 para juegos de tiempo real: tres dificultades, Tranquilo (chocar no
// mata: te reacomoda y seguís) y Progresivo (grados que suben por comida).

export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ModeParams extends Record<string, number> {
  gridSize: number;
  initialIntervalMs: number;
  speedStepMs: number; // cuánto baja el intervalo por cada comida (modos fijos)
  minIntervalMs: number; // piso de velocidad
  obstacleCount: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior.
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen' | 'progressive', ModeParams> = {
  easy: {
    gridSize: 14,
    initialIntervalMs: 220,
    speedStepMs: 4,
    minIntervalMs: 100,
    obstacleCount: 0,
  },
  medium: {
    gridSize: 16,
    initialIntervalMs: 180,
    speedStepMs: 6,
    minIntervalMs: 80,
    obstacleCount: 3,
  },
  hard: {
    gridSize: 18,
    initialIntervalMs: 140,
    speedStepMs: 8,
    minIntervalMs: 60,
    obstacleCount: 10,
  },
  // Tranquilo: velocidad fija y suave, sin obstáculos, chocar no termina.
  zen: {
    gridSize: 14,
    initialIntervalMs: 200,
    speedStepMs: 0,
    minIntervalMs: 200,
    obstacleCount: 0,
  },
  // Progresivo: la velocidad y los obstáculos los pone el grado (stage).
  progressive: {
    gridSize: 16,
    initialIntervalMs: 220,
    speedStepMs: 0,
    minIntervalMs: 55,
    obstacleCount: 0,
  },
};

export function getModeParams(mode: ModeId): ModeParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

// --- Modo progresivo ---------------------------------------------------------

const FOODS_PER_STAGE = 3;

/** Grado según comidas: sube uno cada 3 comidas, tope 10. */
export function stageForFood(foodCount: number): number {
  return Math.min(PROGRESSIVE_STAGES, Math.floor(foodCount / FOODS_PER_STAGE) + 1);
}

/** Velocidad del grado: interpola fácil→difícil y extrapola en 9-10 (ADR-007). */
export function intervalForStage(stage: number): number {
  const t = progressiveT(stage);
  return Math.max(
    MODE_PARAMS.progressive.minIntervalMs,
    Math.round(lerp(MODE_PARAMS.easy.initialIntervalMs, 70, t)),
  );
}

// -----------------------------------------------------------------------------

export interface SnakeState {
  mode: ModeId;
  gridSize: number;
  seed: number;
  foodCount: number; // comidas ya comidas — deriva la semilla de la próxima comida
  snake: Position[]; // [0] = cabeza
  direction: Direction;
  food: Position;
  obstacles: Position[];
  intervalMs: number;
  score: number;
  stage: number; // grado del modo progresivo; 1 en el resto
  crashes: number; // choques en Tranquilo (no terminan la partida)
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

// Cada comida/obstáculo nuevo usa un offset de semilla distinto y determinístico,
// para que step() sea una función pura (mismo estado + dirección → mismo resultado).
function foodRngFor(seed: number, count: number): Rng {
  return createRng(seed + 1 + count);
}

function centeredSnake(gridSize: number): Position[] {
  const center = Math.floor(gridSize / 2);
  return [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
}

export function createInitialState(mode: ModeId, seed: number): SnakeState {
  const params = getModeParams(mode);
  const { gridSize } = params;
  const snake = centeredSnake(gridSize);

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
    mode,
    gridSize,
    seed,
    foodCount: 0,
    snake,
    direction: 'right',
    food,
    obstacles,
    intervalMs: params.initialIntervalMs,
    score: 0,
    stage: 1,
    crashes: 0,
    gameOver: false,
  };
}

const POINTS_PER_FOOD = 10;

// Tranquilo: chocar no termina — la víbora vuelve al centro con su largo
// inicial, conservando puntaje y comida pendiente (reubicada si quedó abajo).
function respawn(state: SnakeState): SnakeState {
  const snake = centeredSnake(state.gridSize);
  const crashes = state.crashes + 1;
  const occupied = new Set([...snake, ...state.obstacles].map(posKey));
  const food = occupied.has(posKey(state.food))
    ? pickFreeCell(
        foodRngFor(state.seed, state.foodCount + crashes * 1000),
        state.gridSize,
        occupied,
      )
    : state.food;
  return { ...state, snake, direction: 'right', food, crashes };
}

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
    return state.mode === 'zen' ? respawn(state) : { ...state, direction, gameOver: true };
  }

  const ateFood = samePos(newHead, state.food);
  const bodyAfterMove = ateFood ? state.snake : state.snake.slice(0, -1);

  if (bodyAfterMove.some((seg) => samePos(seg, newHead))) {
    return state.mode === 'zen' ? respawn(state) : { ...state, direction, gameOver: true };
  }

  const newSnake = [newHead, ...bodyAfterMove];

  if (!ateFood) {
    return { ...state, snake: newSnake, direction };
  }

  const params = getModeParams(state.mode);
  const newFoodCount = state.foodCount + 1;
  let { intervalMs, stage, obstacles } = state;

  if (state.mode === 'progressive') {
    // El grado sube por comida; con cada grado nuevo, más velocidad y un
    // obstáculo más (determinístico: mismo seed, misma partida).
    const newStage = stageForFood(newFoodCount);
    if (newStage > stage) {
      // El obstáculo nuevo nunca aparece pegado a la cabeza (distancia
      // Chebyshev <= 2): subir de grado no puede matar de forma injusta.
      const occupiedNow = new Set([...newSnake, ...obstacles, state.food].map(posKey));
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          occupiedNow.add(posKey({ x: newHead.x + dx, y: newHead.y + dy }));
        }
      }
      const obstacle = pickFreeCell(
        foodRngFor(state.seed, 500 + newStage),
        state.gridSize,
        occupiedNow,
      );
      obstacles = [...obstacles, obstacle];
    }
    stage = newStage;
    intervalMs = intervalForStage(newStage);
  } else {
    intervalMs = Math.max(params.minIntervalMs, state.intervalMs - params.speedStepMs);
  }

  const occupied = new Set([...newSnake, ...obstacles].map(posKey));
  const food = pickFreeCell(foodRngFor(state.seed, newFoodCount), state.gridSize, occupied);

  return {
    ...state,
    snake: newSnake,
    direction,
    food,
    foodCount: newFoodCount,
    intervalMs,
    stage,
    obstacles,
    score: state.score + POINTS_PER_FOOD,
  };
}

export function buildResult(config: GameConfig, state: SnakeState, durationMs: number): GameResult {
  return {
    gameId: 'snake',
    mode: config.mode,
    score: state.score,
    completed: true, // llegar a game over (o terminar en Tranquilo) es un final natural
    durationMs,
    metrics: {
      length: state.snake.length,
      foodEaten: state.foodCount,
      crashes: state.crashes,
      maxStage: state.stage,
    },
    timestamp: new Date().toISOString(),
  };
}
