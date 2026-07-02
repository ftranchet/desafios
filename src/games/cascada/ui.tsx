import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { GameProps } from '../../core/contract';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PIECE_ORDER,
  buildResult,
  createInitialState,
  getCellsForRotation,
  getGhostPiece,
  getOccupiedCells,
  hardDrop,
  step,
  tryMove,
  tryRotate,
  type CascadaState,
  type PieceType,
} from './logic';

const CELL_SIZE = 22;
const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE;
const CANVAS_HEIGHT = BOARD_HEIGHT * CELL_SIZE;
const SWIPE_THRESHOLD = 24;

// Colores del sistema (tailwind.config.ts) — el canvas necesita valores
// hexadecimales reales. Una entrada por tipo de pieza, en el orden de
// PIECE_ORDER (I,O,T,S,Z,J,L): usa los 7 colores "vivos" de la paleta.
const COLOR_SURFACE = '#1a1826';
const COLOR_SURFACE_ALT = '#26223a';
const COLOR_GHOST = 'rgba(244, 244, 242, 0.3)';
const PIECE_COLORS = ['#3fd0c9', '#6bcf63', '#f4557a', '#ffcd4b', '#8a6dff', '#ff8b3d', '#3fa7d6'];

function pieceColor(type: PieceType): string {
  return PIECE_COLORS[PIECE_ORDER.indexOf(type)] ?? COLOR_SURFACE_ALT;
}

function drawState(ctx: CanvasRenderingContext2D, state: CascadaState) {
  ctx.fillStyle = COLOR_SURFACE;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const gap = 1.5;
  function drawCell(x: number, y: number, color: string) {
    if (y < 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(
      x * CELL_SIZE + gap / 2,
      y * CELL_SIZE + gap / 2,
      CELL_SIZE - gap,
      CELL_SIZE - gap,
    );
  }

  state.board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) drawCell(x, y, PIECE_COLORS[value - 1] ?? COLOR_SURFACE_ALT);
    });
  });

  ctx.strokeStyle = COLOR_GHOST;
  ctx.lineWidth = 2;
  for (const cell of getOccupiedCells(getGhostPiece(state))) {
    if (cell.y >= 0) {
      ctx.strokeRect(cell.x * CELL_SIZE + 2, cell.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
  }

  const color = pieceColor(state.current.type);
  for (const cell of getOccupiedCells(state.current)) {
    drawCell(cell.x, cell.y, color);
  }
}

function NextPiecePreview({ type }: { type: PieceType | undefined }) {
  const cells = type ? getCellsForRotation(type, 0) : [];
  const filled = new Set(cells.map((c) => `${c.x},${c.y}`));
  const color = type ? pieceColor(type) : 'transparent';
  return (
    <div className="grid grid-cols-4 gap-0.5" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const x = i % 4;
        const y = Math.floor(i / 4);
        const isFilled = filled.has(`${x},${y}`);
        return (
          <div
            key={i}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: isFilled ? color : 'transparent' }}
          />
        );
      })}
    </div>
  );
}

export function CascadaGame({ config, onFinish }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CascadaState | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const sessionStartRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [score, setScore] = useState(0);
  const [nextType, setNextType] = useState<PieceType | undefined>(undefined);

  function render(state: CascadaState) {
    stateRef.current = state;
    setScore(state.score);
    setNextType(state.queue[0]);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawState(ctx, state);
  }

  function finishGame() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    const finalState = stateRef.current;
    if (!finalState) return;
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function scheduleTick(intervalMs: number) {
    timeoutRef.current = window.setTimeout(tick, intervalMs);
  }

  function tick() {
    const current = stateRef.current;
    if (!current || current.gameOver) return;
    const next = step(current);
    render(next);
    if (next.gameOver) {
      finishGame();
    } else {
      scheduleTick(next.intervalMs);
    }
  }

  function applyAction(mutate: (s: CascadaState) => CascadaState | null) {
    const current = stateRef.current;
    if (!current || current.gameOver) return;
    const next = mutate(current);
    if (!next) return;
    render(next);
    // Una acción (hard drop) puede provocar el fin del juego al no poder
    // aparecer la próxima pieza. El tick de gravedad pendiente vería gameOver
    // y saldría sin finalizar, congelando la partida — hay que finalizar acá.
    if (next.gameOver) finishGame();
  }

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const initial = createInitialState(config.level, config.seed ?? Date.now());
    sessionStartRef.current = performance.now();
    render(initial);
    scheduleTick(initial.intervalMs);

    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      applyAction((s) => tryMove(s, -1, 0));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      applyAction((s) => tryMove(s, 1, 0));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      applyAction((s) => tryMove(s, 0, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      applyAction(tryRotate);
    } else if (event.key === ' ') {
      event.preventDefault();
      applyAction(hardDrop);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < SWIPE_THRESHOLD) {
      applyAction(tryRotate);
      return;
    }
    if (absX > absY) {
      applyAction((s) => tryMove(s, dx > 0 ? 1 : -1, 0));
    } else if (dy > 0) {
      applyAction(hardDrop);
    }
  }

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center gap-4 rounded-lg p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      role="application"
      aria-label="Tablero de Cascada: usá las flechas o deslizá para mover, arriba o tocá para rotar"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full max-w-xs items-center justify-between">
        <p className="font-display text-lg font-extrabold text-text-primary">Puntaje: {score}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-text-secondary">Próxima</span>
          <NextPiecePreview type={nextType} />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        className="touch-none rounded-lg border border-surface-alt"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
      <p className="max-w-xs text-center text-sm text-text-secondary">
        Deslizá para mover, hacia abajo para caída rápida, tocá para rotar.
      </p>
    </div>
  );
}
