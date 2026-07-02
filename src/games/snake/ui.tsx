import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { buildResult, createInitialState, step, type Direction, type SnakeState } from './logic';

// Colores del sistema (tailwind.config.ts) — el canvas necesita valores
// hexadecimales reales, no puede consumir clases de Tailwind.
const COLOR_SURFACE = '#1a1826';
const COLOR_SNAKE = '#6bcf63';
const COLOR_SNAKE_HEAD = '#3fd0c9';
const COLOR_FOOD = '#f4557a';
const COLOR_OBSTACLE = '#a6a2bd';

const CANVAS_SIZE = 320;
const SWIPE_THRESHOLD = 24;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

interface DPadButtonProps {
  label: string;
  ariaLabel: string;
  onPress: () => void;
  className?: string;
}

function DPadButton({ label, ariaLabel, onPress, className = '' }: DPadButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={ariaLabel}
      className={`min-h-touch min-w-touch rounded-lg border border-surface-alt bg-surface font-display text-lg font-bold text-text-primary transition-colors hover:border-accent-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:bg-accent-primary active:text-bg ${className}`}
    >
      {label}
    </button>
  );
}

function drawState(ctx: CanvasRenderingContext2D, state: SnakeState) {
  const cell = CANVAS_SIZE / state.gridSize;
  const gap = Math.max(1, cell * 0.08);

  ctx.fillStyle = COLOR_SURFACE;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  function drawCell(x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x * cell + gap / 2, y * cell + gap / 2, cell - gap, cell - gap);
  }

  for (const obstacle of state.obstacles) drawCell(obstacle.x, obstacle.y, COLOR_OBSTACLE);
  drawCell(state.food.x, state.food.y, COLOR_FOOD);
  state.snake.forEach((segment, i) => {
    drawCell(segment.x, segment.y, i === 0 ? COLOR_SNAKE_HEAD : COLOR_SNAKE);
  });
}

export function SnakeGame({ config, onFinish }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState | null>(null);
  const directionRef = useRef<Direction>('right');
  const timeoutRef = useRef<number | null>(null);
  const sessionStartRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [score, setScore] = useState(0);

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
    const next = step(current, directionRef.current);
    stateRef.current = next;
    setScore(next.score);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) drawState(ctx, next);

    if (next.gameOver) {
      finishGame();
    } else {
      scheduleTick(next.intervalMs);
    }
  }

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const initial = createInitialState(config.level, config.seed ?? Date.now());
    stateRef.current = initial;
    directionRef.current = initial.direction;
    sessionStartRef.current = performance.now();
    setScore(0);

    const ctx = canvas?.getContext('2d');
    if (ctx) drawState(ctx, initial);

    scheduleTick(initial.intervalMs);

    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestDirection(direction: Direction) {
    directionRef.current = direction;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    requestDirection(direction);
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
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      requestDirection(dx > 0 ? 'right' : 'left');
    } else {
      requestDirection(dy > 0 ? 'down' : 'up');
    }
  }

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center gap-4 rounded-lg p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      role="application"
      aria-label="Tablero de Snake: usá los botones, las flechas o deslizá para moverte"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <p className="font-display text-lg font-extrabold text-text-primary">Puntaje: {score}</p>
      <canvas
        ref={canvasRef}
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        className="touch-none rounded-lg border border-surface-alt"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
      <div
        className="grid grid-cols-3 grid-rows-3 gap-2"
        role="group"
        aria-label="Controles direccionales"
      >
        <DPadButton
          label="▲"
          ariaLabel="Mover arriba"
          onPress={() => requestDirection('up')}
          className="col-start-2 row-start-1"
        />
        <DPadButton
          label="◀"
          ariaLabel="Mover a la izquierda"
          onPress={() => requestDirection('left')}
          className="col-start-1 row-start-2"
        />
        <DPadButton
          label="▶"
          ariaLabel="Mover a la derecha"
          onPress={() => requestDirection('right')}
          className="col-start-3 row-start-2"
        />
        <DPadButton
          label="▼"
          ariaLabel="Mover abajo"
          onPress={() => requestDirection('down')}
          className="col-start-2 row-start-3"
        />
      </div>
      <p className="max-w-xs text-center text-sm text-text-secondary">
        Tocá los botones, deslizá sobre el tablero o usá las flechas del teclado para moverte.
      </p>
    </div>
  );
}
