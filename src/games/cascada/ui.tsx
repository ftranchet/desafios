import { useRef, useState, useEffect, type KeyboardEvent, type PointerEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { themeColor, themeColorWithAlpha } from '../../core/theme';
import { GameLayout, PressButton, useAutoFocus } from '../../core/ui';
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
const TAP_THRESHOLD = 10; // px: por debajo de esto un toque cuenta como "tap" (rotar)
const FLICK_THRESHOLD = 40; // px hacia abajo: un envión que dispara la caída rápida

// Colores del sistema — el canvas necesita valores de color reales, no puede
// consumir clases de Tailwind. Se resuelven del tema activo al montar
// (ADR-009), en vez de copiar los hex de tailwind.config.ts a mano. Una
// entrada por tipo de pieza, en el orden de PIECE_ORDER (I,O,T,S,Z,J,L):
// usa los 7 colores "vivos" de la paleta.
interface BoardColors {
  surface: string;
  surfaceAlt: string;
  ghost: string;
  pieces: string[];
}

function readBoardColors(): BoardColors {
  return {
    surface: themeColor('surface'),
    surfaceAlt: themeColor('surface-alt'),
    ghost: themeColorWithAlpha('text-primary', 0.3),
    pieces: [
      themeColor('accent-primary'),
      themeColor('accent-success'),
      themeColor('accent-error'),
      themeColor('game-1'),
      themeColor('game-2'),
      themeColor('game-3'),
      themeColor('game-4'),
    ],
  };
}

function pieceColor(colors: BoardColors, type: PieceType): string {
  return colors.pieces[PIECE_ORDER.indexOf(type)] ?? colors.surfaceAlt;
}

function drawState(ctx: CanvasRenderingContext2D, state: CascadaState, colors: BoardColors) {
  ctx.fillStyle = colors.surface;
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
      if (value !== 0) drawCell(x, y, colors.pieces[value - 1] ?? colors.surfaceAlt);
    });
  });

  ctx.strokeStyle = colors.ghost;
  ctx.lineWidth = 2;
  for (const cell of getOccupiedCells(getGhostPiece(state))) {
    if (cell.y >= 0) {
      ctx.strokeRect(cell.x * CELL_SIZE + 2, cell.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
  }

  const color = pieceColor(colors, state.current.type);
  for (const cell of getOccupiedCells(state.current)) {
    drawCell(cell.x, cell.y, color);
  }
}

function NextPiecePreview({ type, colors }: { type: PieceType | undefined; colors: BoardColors }) {
  const cells = type ? getCellsForRotation(type, 0) : [];
  const filled = new Set(cells.map((c) => `${c.x},${c.y}`));
  const color = type ? pieceColor(colors, type) : 'transparent';
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
  // Foco inmediato al contenedor: las flechas funcionan apenas arranca la
  // partida, sin exigir un clic previo sobre el tablero (RNF-11).
  const containerRef = useAutoFocus<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CascadaState | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const sessionStartRef = useRef(0);
  // Estado del arrastre: se sigue la columna del dedo para mover la pieza de
  // forma relativa (varias columnas en un gesto), y se distingue tap de flick.
  const dragRef = useRef<{
    startX: number;
    startY: number;
    lastCol: number;
    moved: boolean;
  } | null>(null);
  // Paleta del tema activo, resuelta una vez al montar: el tema no puede
  // cambiar en medio de una partida (se elige en Configuración).
  const colorsRef = useRef<BoardColors>(readBoardColors());

  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [nextType, setNextType] = useState<PieceType | undefined>(undefined);

  function render(state: CascadaState) {
    stateRef.current = state;
    setScore(state.score);
    setStage(state.stage);
    setNextType(state.queue[0]);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawState(ctx, state, colorsRef.current);
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

    const initial = createInitialState(config.mode, config.seed ?? Date.now());
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

  // Columna del tablero bajo el puntero.
  function pointerColumn(event: PointerEvent<HTMLCanvasElement>): number | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / (rect.width / BOARD_WIDTH));
    return Math.max(0, Math.min(BOARD_WIDTH - 1, col));
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const col = pointerColumn(event);
    if (col === null) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, lastCol: col, moved: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const col = pointerColumn(event);
    if (col === null) return;
    const delta = col - drag.lastCol;
    if (delta === 0) return;
    // Mover la pieza tantas columnas como se desplazó el dedo (arrastre relativo).
    const stepDir = delta > 0 ? 1 : -1;
    const steps = Math.abs(delta);
    applyAction((s) => {
      let cur: CascadaState | null = s;
      let moved: CascadaState | null = null;
      for (let i = 0; i < steps && cur; i += 1) {
        cur = tryMove(cur, stepDir, 0);
        if (cur) moved = cur;
      }
      return moved;
    });
    drag.lastCol = col;
    drag.moved = true;
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (dy > FLICK_THRESHOLD && dy > Math.abs(dx)) {
      applyAction(hardDrop); // envión hacia abajo = caída rápida
    } else if (!drag.moved && Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
      applyAction(tryRotate); // toque sin arrastre = rotar
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-3 rounded-lg p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary short:min-h-0 short:p-2"
      role="application"
      aria-label="Tablero de Cascada: arrastrá la pieza con el dedo, tocá para rotar, envión hacia abajo para caída rápida; también botones y flechas"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <GameLayout
        hud={
          <div className="flex w-full items-center justify-between">
            <p className="font-display text-lg font-extrabold text-text-primary">
              Puntaje: {score}
              {config.mode === 'progressive' && (
                <span className="ml-3 text-sm font-semibold text-text-secondary">
                  Grado {stage}/{PROGRESSIVE_STAGES}
                </span>
              )}
            </p>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-text-secondary">Próxima</span>
              <NextPiecePreview type={nextType} colors={colorsRef.current} />
            </div>
          </div>
        }
        board={
          /* Alto acotado al viewport (440px = CANVAS_HEIGHT; el JIT necesita
             el literal): en pantallas bajas el tablero se achica en vez de
             empujar los controles fuera de la vista, y en apaisado corto
             (short:) se acota por la altura para convivir con los controles
             al costado. El buffer interno queda fijo y el navegador lo escala
             manteniendo la proporción. */
          <canvas
            ref={canvasRef}
            className="aspect-[10/20] h-[min(440px,52dvh)] touch-none rounded-lg border border-surface-alt short:h-[min(440px,calc(100dvh-7.5rem))]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        }
        panel={
          <>
            <div className="flex w-full items-center justify-between gap-4">
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Mover pieza">
                <PressButton
                  ariaLabel="Mover a la izquierda"
                  repeatOnHold
                  onPress={() => applyAction((s) => tryMove(s, -1, 0))}
                >
                  ◀
                </PressButton>
                <PressButton
                  ariaLabel="Bajar"
                  repeatOnHold
                  onPress={() => applyAction((s) => tryMove(s, 0, 1))}
                >
                  ▼
                </PressButton>
                <PressButton
                  ariaLabel="Mover a la derecha"
                  repeatOnHold
                  onPress={() => applyAction((s) => tryMove(s, 1, 0))}
                >
                  ▶
                </PressButton>
              </div>
              <div className="flex gap-2" role="group" aria-label="Acciones de la pieza">
                <PressButton ariaLabel="Rotar" onPress={() => applyAction(tryRotate)}>
                  ↻
                </PressButton>
                <PressButton ariaLabel="Caída rápida" onPress={() => applyAction(hardDrop)}>
                  ⤓
                </PressButton>
              </div>
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
              Arrastrá la pieza con el dedo, tocá para rotar y hacé un envión hacia abajo para la
              caída rápida. También podés usar los botones o las flechas.
            </p>
          </>
        }
      />
    </div>
  );
}
