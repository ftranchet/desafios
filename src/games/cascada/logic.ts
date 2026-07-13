import type { GameConfig, GameResult, ModeId } from '../../core/contract';
import { lerp, PROGRESSIVE_STAGES, progressiveT } from '../../core/modes';
import { createRng, randomInt, type Rng } from '../../core/random';

// Lógica pura de "Cascada" (estilo Tetris) — sin React ni canvas. Construida
// sobre el mismo bucle de tiempo real que validó Snake (PRD 11.1). Nombre
// original (PRD 11.2): "Tetris" es marca registrada de The Tetris Company.

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Orden fijo: también define el color de tablero (índice + 1) de cada pieza.
export const PIECE_ORDER: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export interface Cell {
  x: number;
  y: number;
}

interface PieceShape {
  size: number; // tamaño de la caja de referencia (2, 3 o 4)
  cells: Cell[]; // celdas ocupadas en la rotación 0
}

// Rotación 0 de cada pieza. Las otras 3 rotaciones se calculan girando estas
// celdas 90° dentro de su caja — sin tabla de "wall kicks" (PRD/plan: v1 simple).
const PIECE_SHAPES: Record<PieceType, PieceShape> = {
  I: {
    size: 4,
    cells: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
  },
  O: {
    size: 2,
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  T: {
    size: 3,
    cells: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  S: {
    size: 3,
    cells: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  Z: {
    size: 3,
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  J: {
    size: 3,
    cells: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  L: {
    size: 3,
    cells: [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
};

function rotateCell(cell: Cell, size: number): Cell {
  return { x: size - 1 - cell.y, y: cell.x };
}

export function getCellsForRotation(type: PieceType, rotation: number): Cell[] {
  const shape = PIECE_SHAPES[type];
  let cells = shape.cells;
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i += 1) {
    cells = cells.map((c) => rotateCell(c, shape.size));
  }
  return cells;
}

export interface ActivePiece {
  type: PieceType;
  rotation: number;
  x: number; // posición del ancla (esquina superior izquierda de la caja) en el tablero
  y: number;
}

export function getOccupiedCells(piece: ActivePiece): Cell[] {
  return getCellsForRotation(piece.type, piece.rotation).map((c) => ({
    x: piece.x + c.x,
    y: piece.y + c.y,
  }));
}

function getCell(board: number[][], x: number, y: number): number {
  return board[y]?.[x] ?? 0;
}

function setCell(board: number[][], x: number, y: number, value: number): void {
  const row = board[y];
  if (row) row[x] = value;
}

function isValidPosition(board: number[][], piece: ActivePiece): boolean {
  return getOccupiedCells(piece).every((cell) => {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) return false;
    if (cell.y < 0) return true; // por encima del tablero visible: siempre válido
    return getCell(board, cell.x, cell.y) === 0;
  });
}

// Randomizador de "bolsa de 7": se reparten las 7 piezas en orden aleatorio;
// cuando se vacía, se reparte una bolsa nueva. Cada bolsa usa un offset de
// semilla distinto y determinístico (mismo criterio que la comida de Snake).
function bagRngFor(seed: number, bagIndex: number): Rng {
  return createRng(seed + 1 + bagIndex);
}

function createBag(rng: Rng): PieceType[] {
  const bag = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const tmp = bag[i] as PieceType;
    bag[i] = bag[j] as PieceType;
    bag[j] = tmp;
  }
  return bag;
}

function drawNextPiece(
  queue: PieceType[],
  seed: number,
  bagIndex: number,
): { type: PieceType; queue: PieceType[]; bagIndex: number } {
  let q = queue;
  let bi = bagIndex;
  if (q.length === 0) {
    q = createBag(bagRngFor(seed, bi));
    bi += 1;
  }
  const [type, ...rest] = q;
  if (!type) throw new Error('drawNextPiece: bolsa vacía inesperadamente');
  return { type, queue: rest, bagIndex: bi };
}

export interface LevelParams extends Record<string, number> {
  initialIntervalMs: number;
  minIntervalMs: number;
  speedStepPerLine: number;
}

// easy/medium/hard equivalen a los niveles 1/3/5 del esquema anterior (ADR-007).
export const MODE_PARAMS: Record<'easy' | 'medium' | 'hard' | 'zen' | 'progressive', LevelParams> =
  {
    easy: { initialIntervalMs: 800, minIntervalMs: 300, speedStepPerLine: 15 },
    medium: { initialIntervalMs: 600, minIntervalMs: 200, speedStepPerLine: 20 },
    hard: { initialIntervalMs: 400, minIntervalMs: 100, speedStepPerLine: 25 },
    // Tranquilo: caída fija y suave, sin aceleración; el top-out limpia el
    // tablero en vez de terminar (ADR-007).
    zen: { initialIntervalMs: 700, minIntervalMs: 700, speedStepPerLine: 0 },
    // Progresivo: la velocidad la pone el grado (stage), no las líneas sueltas.
    progressive: { initialIntervalMs: 800, minIntervalMs: 150, speedStepPerLine: 0 },
  };

// --- Modo progresivo ---------------------------------------------------------

const LINES_PER_STAGE = 2;

/** Grado según líneas completadas: sube uno cada 2 líneas, tope 10. */
export function stageForLines(linesCleared: number): number {
  return Math.min(PROGRESSIVE_STAGES, Math.floor(linesCleared / LINES_PER_STAGE) + 1);
}

/** Velocidad del grado: interpola fácil→difícil y extrapola en 9-10 (ADR-007). */
export function intervalForStage(stage: number): number {
  const t = progressiveT(stage);
  return Math.max(
    MODE_PARAMS.progressive.minIntervalMs,
    Math.round(lerp(MODE_PARAMS.easy.initialIntervalMs, 300, t)),
  );
}

export function getModeParams(mode: ModeId): LevelParams {
  const params = MODE_PARAMS[mode as keyof typeof MODE_PARAMS];
  if (!params) throw new Error(`Modo no soportado: ${mode}`);
  return params;
}

export interface CascadaState {
  mode: ModeId;
  board: number[][]; // BOARD_HEIGHT x BOARD_WIDTH, 0=vacío, 1-7=pieza bloqueada
  current: ActivePiece;
  queue: PieceType[];
  seed: number;
  bagIndex: number;
  linesCleared: number;
  score: number;
  intervalMs: number;
  speedStepPerLine: number;
  minIntervalMs: number;
  stage: number; // grado del modo progresivo; 1 en el resto
  topOuts: number; // limpiezas por top-out en Tranquilo (no terminan la partida)
  gameOver: boolean;
}

function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<number>(BOARD_WIDTH).fill(0));
}

function spawnPiece(state: CascadaState): CascadaState {
  const { type, queue, bagIndex } = drawNextPiece(state.queue, state.seed, state.bagIndex);
  const shape = PIECE_SHAPES[type];
  const piece: ActivePiece = {
    type,
    rotation: 0,
    x: Math.floor((BOARD_WIDTH - shape.size) / 2),
    y: 0,
  };
  if (!isValidPosition(state.board, piece)) {
    if (state.mode === 'zen') {
      // Tranquilo: el top-out limpia el tablero en vez de terminar (ADR-007);
      // el puntaje se conserva y la pieza aparece sobre el tablero vacío.
      return {
        ...state,
        board: createEmptyBoard(),
        current: piece,
        queue,
        bagIndex,
        topOuts: state.topOuts + 1,
        gameOver: false,
      };
    }
    return { ...state, current: piece, queue, bagIndex, gameOver: true };
  }
  return { ...state, current: piece, queue, bagIndex, gameOver: false };
}

export function createInitialState(mode: ModeId, seed: number): CascadaState {
  const params = getModeParams(mode);
  const base: CascadaState = {
    mode,
    board: createEmptyBoard(),
    current: { type: 'I', rotation: 0, x: 0, y: 0 }, // spawnPiece lo reemplaza enseguida
    queue: [],
    seed,
    bagIndex: 0,
    linesCleared: 0,
    score: 0,
    intervalMs: params.initialIntervalMs,
    speedStepPerLine: params.speedStepPerLine,
    minIntervalMs: params.minIntervalMs,
    stage: 1,
    topOuts: 0,
    gameOver: false,
  };
  return spawnPiece(base);
}

export function tryMove(state: CascadaState, dx: number, dy: number): CascadaState | null {
  if (state.gameOver) return null;
  const moved: ActivePiece = { ...state.current, x: state.current.x + dx, y: state.current.y + dy };
  if (!isValidPosition(state.board, moved)) return null;
  return { ...state, current: moved };
}

export function tryRotate(state: CascadaState): CascadaState {
  if (state.gameOver) return state;
  const rotated: ActivePiece = { ...state.current, rotation: (state.current.rotation + 1) % 4 };
  return isValidPosition(state.board, rotated) ? { ...state, current: rotated } : state;
}

function mergePieceIntoBoard(board: number[][], piece: ActivePiece): number[][] {
  const next = board.map((row) => [...row]);
  const colorIndex = PIECE_ORDER.indexOf(piece.type) + 1;
  for (const cell of getOccupiedCells(piece)) {
    if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
      setCell(next, cell.x, cell.y, colorIndex);
    }
  }
  return next;
}

function clearLines(board: number[][]): { board: number[][]; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = BOARD_HEIGHT - remaining.length;
  const emptyRows: number[][] = Array.from({ length: cleared }, () =>
    Array<number>(BOARD_WIDTH).fill(0),
  );
  return { board: [...emptyRows, ...remaining], cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];
const HARD_DROP_POINTS_PER_CELL = 2;

export function lockPiece(state: CascadaState): CascadaState {
  const merged = mergePieceIntoBoard(state.board, state.current);
  const { board, cleared } = clearLines(merged);
  const linesCleared = state.linesCleared + cleared;
  const score = state.score + (LINE_SCORES[cleared] ?? 0);

  let { intervalMs, stage } = state;
  if (state.mode === 'progressive') {
    stage = stageForLines(linesCleared);
    intervalMs = intervalForStage(stage);
  } else {
    intervalMs = Math.max(state.minIntervalMs, state.intervalMs - cleared * state.speedStepPerLine);
  }

  return spawnPiece({ ...state, board, linesCleared, score, intervalMs, stage });
}

export function step(state: CascadaState): CascadaState {
  if (state.gameOver) return state;
  const moved = tryMove(state, 0, 1);
  return moved ?? lockPiece(state);
}

export function hardDrop(state: CascadaState): CascadaState {
  if (state.gameOver) return state;
  let current = state;
  let dropDistance = 0;
  for (let i = 0; i < BOARD_HEIGHT; i += 1) {
    const moved = tryMove(current, 0, 1);
    if (!moved) break;
    current = moved;
    dropDistance += 1;
  }
  return lockPiece({ ...current, score: current.score + dropDistance * HARD_DROP_POINTS_PER_CELL });
}

export function getGhostPiece(state: CascadaState): ActivePiece {
  let piece = state.current;
  for (let i = 0; i < BOARD_HEIGHT; i += 1) {
    const moved: ActivePiece = { ...piece, y: piece.y + 1 };
    if (!isValidPosition(state.board, moved)) break;
    piece = moved;
  }
  return piece;
}

export function buildResult(
  config: GameConfig,
  state: CascadaState,
  durationMs: number,
): GameResult {
  return {
    gameId: 'cascada',
    mode: config.mode,
    score: state.score,
    completed: true, // llegar a game over es un final natural, no un abandono
    durationMs,
    metrics: {
      linesCleared: state.linesCleared,
      finalIntervalMs: state.intervalMs,
      maxStage: state.stage,
      topOuts: state.topOuts,
    },
    timestamp: new Date().toISOString(),
  };
}
