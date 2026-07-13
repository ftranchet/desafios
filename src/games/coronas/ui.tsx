import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, createInitialState, cycleCell, getConflicts, type GameState } from './logic';

// Interfaz de Coronas. Cada celda cicla vacía → marca (×, ayuda de descarte,
// no puntúa) → corona → vacía, igual patrón de tap-para-ciclar que Nonograma;
// el teclado ya queda cubierto por PressButton (Tab recorre los botones,
// Enter/Espacio activa), sin necesitar un cursor propio.
//
// La generación en vivo (logic.ts) puede tardar unos cientos de ms en la
// dificultad más alta (8×8, backtracking + reparación de regiones): se
// difiere un tick con setTimeout(0) para que el navegador pinte primero el
// estado "Generando…" en vez de congelar la pantalla mientras corre.
//
// Nota RNF-04: en 8×8 las celdas ya entran cómodas en 44px (8×44=352px),
// sin necesitar la excepción documentada en Sudoku/Nonograma.
//
// Cada región combina color de fondo Y un borde más grueso en el límite con
// otra región (RNF-05): la frontera nunca depende solo del matiz. Una corona
// en conflicto (misma fila/columna/región, o adyacente a otra) se marca en
// rojo y con un anillo, además de que el contador de errores ya lo registra.

const REGION_BG_CLASSES = [
  'bg-game-1/25',
  'bg-game-2/25',
  'bg-game-3/25',
  'bg-game-4/25',
  'bg-game-5/25',
  'bg-game-6/25',
  'bg-accent-primary/25',
  'bg-text-secondary/20',
];

// Clases completas y literales a propósito (igual criterio que
// categoryColors.ts): el JIT de Tailwind solo genera lo que encuentra escrito
// tal cual en el código, no lo que se arma con un template string.
const SIDE_BORDER_CLASSES: Record<'top' | 'bottom' | 'left' | 'right', [string, string]> = {
  top: ['border-t border-t-surface-alt', 'border-t-2 border-t-text-primary/60'],
  bottom: ['border-b border-b-surface-alt', 'border-b-2 border-b-text-primary/60'],
  left: ['border-l border-l-surface-alt', 'border-l-2 border-l-text-primary/60'],
  right: ['border-r border-r-surface-alt', 'border-r-2 border-r-text-primary/60'],
};

export function CoronasGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setState(createInitialState(config.mode, config.seed ?? Date.now()));
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function handlePress(index: number) {
    if (!state) return;
    const next = cycleCell(state, index);
    if (next === state) return;
    const createdConflict = next.mistakes > state.mistakes;
    audio?.tone(createdConflict ? 200 : 300, 45);
    setState(next);
    if (next.done) audio?.play('success');
  }

  if (!state) {
    return (
      <div
        ref={containerRef}
        className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 p-6 focus:outline-none"
        tabIndex={0}
      >
        <p className="text-sm text-text-secondary">Generando tablero…</p>
      </div>
    );
  }

  const { size, regions, board } = state;
  const conflicts = getConflicts(state);

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-3 p-4 focus:outline-none"
      tabIndex={0}
    >
      <div className="w-full max-w-[22rem] text-center text-sm text-text-secondary">
        Errores: {state.mistakes}
      </div>

      <div
        className="grid w-full max-w-[22rem]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Grilla de Coronas"
      >
        {board.map((mark, index) => {
          const row = Math.floor(index / size);
          const col = index % size;
          const region = regions[index]!;
          // Cada celda decide sus 4 bordes por su cuenta (el borde exterior de
          // la grilla cuenta como límite de región también, no solo el
          // contraste con la celda vecina).
          const isBoundary = {
            top: row === 0 || regions[index - size] !== region,
            bottom: row === size - 1 || regions[index + size] !== region,
            left: col === 0 || regions[index - 1] !== region,
            right: col === size - 1 || regions[index + 1] !== region,
          };
          const conflicted = mark === 'crown' && conflicts.has(index);

          const borderClasses = (['top', 'bottom', 'left', 'right'] as const)
            .map((side) => SIDE_BORDER_CLASSES[side][isBoundary[side] ? 1 : 0])
            .join(' ');

          const label =
            mark === 'crown'
              ? `corona${conflicted ? ', en conflicto' : ''}`
              : mark === 'x'
                ? 'marca'
                : 'vacía';

          return (
            <PressButton
              key={index}
              variant="bare"
              disabled={state.done}
              onPress={() => handlePress(index)}
              ariaLabel={`Fila ${row + 1}, columna ${col + 1}, ${label}`}
              className={`flex aspect-square items-center justify-center font-display text-lg transition-colors ${borderClasses} ${REGION_BG_CLASSES[region]}`}
            >
              {mark === 'crown' ? (
                <span className={conflicted ? 'text-accent-error' : 'text-text-primary'}>♛</span>
              ) : mark === 'x' ? (
                <span className="text-text-secondary">×</span>
              ) : (
                ''
              )}
            </PressButton>
          );
        })}
      </div>

      {state.done && (
        <div className="flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center shadow-card">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Coronas resuelto!
          </p>
          <p className="text-sm text-text-secondary">Errores: {state.mistakes}</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      )}
    </div>
  );
}
