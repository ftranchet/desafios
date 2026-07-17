import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { themeColor } from '../../core/theme';
import { GameLayout, PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  consumeDirection,
  createInitialState,
  steerToward,
  step,
  type Direction,
  type Position,
  type SnakeState,
} from './logic';

// Colores del sistema — el canvas necesita valores de color reales, no puede
// consumir clases de Tailwind. Se resuelven del tema activo (ADR-009), en vez
// de copiar los hex de tailwind.config.ts a mano.
interface BoardColors {
  surface: string;
  snake: string;
  snakeHead: string;
  food: string;
  obstacle: string;
}

function readBoardColors(): BoardColors {
  return {
    surface: themeColor('surface'),
    snake: themeColor('accent-success'),
    snakeHead: themeColor('accent-primary'),
    food: themeColor('accent-error'),
    obstacle: themeColor('text-secondary'),
  };
}

const CANVAS_SIZE = 320;

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

function drawState(ctx: CanvasRenderingContext2D, state: SnakeState, colors: BoardColors) {
  const cell = CANVAS_SIZE / state.gridSize;
  const gap = Math.max(1, cell * 0.08);

  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  function drawCell(x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x * cell + gap / 2, y * cell + gap / 2, cell - gap, cell - gap);
  }

  for (const obstacle of state.obstacles) drawCell(obstacle.x, obstacle.y, colors.obstacle);
  drawCell(state.food.x, state.food.y, colors.food);
  state.snake.forEach((segment, i) => {
    drawCell(segment.x, segment.y, i === 0 ? colors.snakeHead : colors.snake);
  });
}

export function SnakeGame({ config, onFinish }: GameProps) {
  // Foco inmediato al contenedor: las flechas funcionan apenas arranca la
  // partida, sin exigir un clic previo sobre el tablero (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState | null>(null);
  // Cola de inputs pendientes (no una sola dirección): así encadenar dos giros
  // rápidos antes de un tick no pierde el intermedio (ver consumeDirection).
  const directionQueueRef = useRef<Direction[]>([]);
  // Celda hacia la que apunta el dedo mientras se toca/arrastra el tablero; la
  // víbora se orienta hacia ahí en cada tick (control por seguimiento).
  const targetRef = useRef<Position | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const sessionStartRef = useRef(0);
  // Paleta del tema activo. `system` puede cambiar mientras la partida sigue
  // abierta, por eso se actualiza al mutar data-theme en <html>. useState usa
  // inicializador perezoso: getComputedStyle no se repite en cada tick/render.
  const [initialColors] = useState<BoardColors>(readBoardColors);
  const colorsRef = useRef<BoardColors>(initialColors);

  const [hud, setHud] = useState({ score: 0, stage: 1 });

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
    // Con el dedo en el tablero, la víbora se orienta hacia él; si no, se
    // consumen los giros de la cola (teclado / D-pad).
    const head = current.snake[0];
    const target = targetRef.current;
    const direction =
      target && head
        ? steerToward(head, target, current.direction)
        : consumeDirection(current.direction, directionQueueRef.current);
    const next = step(current, direction);
    stateRef.current = next;
    setHud({ score: next.score, stage: next.stage });

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) drawState(ctx, next, colorsRef.current);

    if (next.gameOver) {
      finishGame();
    } else {
      scheduleTick(next.intervalMs);
    }
  }

  useEffect(() => {
    colorsRef.current = readBoardColors();
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const initial = createInitialState(config.mode, config.seed ?? Date.now());
    stateRef.current = initial;
    directionQueueRef.current = [];
    targetRef.current = null;
    sessionStartRef.current = performance.now();
    setHud({ score: 0, stage: 1 });

    const ctx = canvas?.getContext('2d');
    if (ctx) drawState(ctx, initial, colorsRef.current);

    const themeObserver = new MutationObserver(() => {
      colorsRef.current = readBoardColors();
      const current = stateRef.current;
      const currentCtx = canvasRef.current?.getContext('2d');
      if (current && currentCtx) drawState(currentCtx, current, colorsRef.current);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    scheduleTick(initial.intervalMs);

    return () => {
      themeObserver.disconnect();
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestDirection(direction: Direction) {
    const queue = directionQueueRef.current;
    // Dedup del último input y cap de 2 para no acumular un backlog que haga
    // sentir los controles con lag. consumeDirection valida lo opuesto en el tick.
    const last = queue.length > 0 ? queue[queue.length - 1] : stateRef.current?.direction;
    if (direction === last) return;
    if (queue.length >= 2) return;
    queue.push(direction);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    requestDirection(direction);
  }

  // Convierte las coordenadas del puntero a una celda del tablero.
  function pointerToCell(event: PointerEvent<HTMLCanvasElement>): Position | null {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cell = rect.width / state.gridSize;
    const clamp = (v: number) => Math.max(0, Math.min(state.gridSize - 1, v));
    return {
      x: clamp(Math.floor((event.clientX - rect.left) / cell)),
      y: clamp(Math.floor((event.clientY - rect.top) / cell)),
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = pointerToCell(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (targetRef.current === null) return; // solo mientras se mantiene el toque
    targetRef.current = pointerToCell(event);
  }

  function handlePointerUp() {
    targetRef.current = null;
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-4 rounded-lg p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary short:min-h-0 short:p-2"
      role="application"
      aria-label="Tablero de Snake: mantené el dedo para que la víbora te siga, o usá los botones o las flechas"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <GameLayout
        hud={
          <p className="font-display text-lg font-extrabold text-text-primary">
            Puntaje: {hud.score}
            {config.mode === 'progressive' && (
              <span className="ml-3 text-sm font-semibold text-text-secondary">
                Grado {hud.stage}/{PROGRESSIVE_STAGES}
              </span>
            )}
          </p>
        }
        board={
          /* Ancho fluido con tope (320px = CANVAS_SIZE; el JIT de Tailwind
             necesita el literal): en celulares angostos no desborda, y en
             apaisado corto (short:) se acota por la ALTURA del viewport para
             convivir con los controles al costado sin scrollear. */
          <canvas
            ref={canvasRef}
            className="aspect-square w-[min(320px,calc(100vw-2rem))] touch-none rounded-lg border border-surface-alt short:w-[min(320px,calc(100dvh-8.5rem))]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        }
        panel={
          <>
            <div
              className="grid grid-cols-3 grid-rows-3 gap-2"
              role="group"
              aria-label="Controles direccionales"
            >
              <PressButton
                ariaLabel="Mover arriba"
                onPress={() => requestDirection('up')}
                className="col-start-2 row-start-1"
              >
                ▲
              </PressButton>
              <PressButton
                ariaLabel="Mover a la izquierda"
                onPress={() => requestDirection('left')}
                className="col-start-1 row-start-2"
              >
                ◀
              </PressButton>
              <PressButton
                ariaLabel="Mover a la derecha"
                onPress={() => requestDirection('right')}
                className="col-start-3 row-start-2"
              >
                ▶
              </PressButton>
              <PressButton
                ariaLabel="Mover abajo"
                onPress={() => requestDirection('down')}
                className="col-start-2 row-start-3"
              >
                ▼
              </PressButton>
            </div>
            {/* Tranquilo: sin game over, así que el final lo pone el jugador. */}
            {config.mode === 'zen' && (
              <PressButton
                variant="primary"
                ariaLabel="Terminar la partida"
                onPress={finishGame}
                className="px-8"
              >
                Terminar
              </PressButton>
            )}
            <p className="max-w-xs text-center text-sm text-text-secondary short:hidden">
              Mantené el dedo sobre el tablero y la víbora te sigue. También podés usar los botones
              o las flechas del teclado.
            </p>
          </>
        }
      />
    </div>
  );
}
