import { useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  createInitialState,
  cycleCell,
  isGivenCell,
  MOON,
  SIZE,
  SUN,
  type EdgeClue,
  type GameState,
} from './logic';

// Interfaz de "Sol y luna". Cada celda editable cicla vacía → sol → luna →
// vacía, mismo patrón de tap-para-ciclar que Coronas/Nonograma; el teclado
// ya queda cubierto por PressButton (Tab recorre los botones, Enter/Espacio
// activa), sin necesitar un cursor propio.
//
// Las pistas de relación (=/×) se dibujan como una insignia chica sobre el
// borde compartido entre dos celdas: cada celda solo dibuja su propio borde
// derecho e inferior (cada arista le pertenece a un único par ordenado, ver
// logic.ts), así ninguna arista se dibuja dos veces.
//
// RNF-05: sol y luna se distinguen por glifo (☀/☾), nunca solo por color —
// el color es un agregado decorativo encima de esa diferencia de forma.

const SUN_GLYPH = '☀';
const MOON_GLYPH = '☾';

function cellLabel(
  state: GameState,
  index: number,
  row: number,
  col: number,
  right: EdgeClue | undefined,
  bottom: EdgeClue | undefined,
): string {
  const value = state.board[index];
  const symbol = value === SUN ? 'sol' : value === MOON ? 'luna' : 'vacía';
  const given = isGivenCell(state, index) ? ' (dato)' : '';
  const clueParts: string[] = [];
  if (right) clueParts.push(right.same ? 'igual que la de la derecha' : 'distinta a la de la derecha');
  if (bottom) clueParts.push(bottom.same ? 'igual que la de abajo' : 'distinta a la de abajo');
  const clueText = clueParts.length > 0 ? `. Pista: ${clueParts.join(', ')}` : '';
  return `Fila ${row + 1}, columna ${col + 1}, ${symbol}${given}${clueText}`;
}

export function TakuzuGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function handlePress(index: number) {
    const next = cycleCell(state, index);
    if (next === state) return;
    const madeMistake = next.mistakes > state.mistakes;
    audio?.tone(madeMistake ? 200 : 300, 45);
    setState(next);
    if (next.done) audio?.play('success');
  }

  // Cada arista pertenece a un único par ordenado (a = celda de arriba-
  // izquierda, ver logic.ts): la indexamos por su celda de origen y por si
  // es horizontal (borde derecho de esa celda) o vertical (borde inferior).
  const rightEdge = new Map<number, EdgeClue>();
  const bottomEdge = new Map<number, EdgeClue>();
  for (const edge of state.edgeClues) {
    if (edge.b === edge.a + 1) rightEdge.set(edge.a, edge);
    else bottomEdge.set(edge.a, edge);
  }

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
        className="grid w-full max-w-[22rem] gap-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Grilla de Sol y luna"
      >
        {state.board.map((value, index) => {
          const row = Math.floor(index / SIZE);
          const col = index % SIZE;
          const given = isGivenCell(state, index);
          const right = col + 1 < SIZE ? rightEdge.get(index) : undefined;
          const bottom = row + 1 < SIZE ? bottomEdge.get(index) : undefined;

          return (
            <div key={index} className="relative aspect-square">
              <PressButton
                variant="bare"
                disabled={given || state.done}
                onPress={() => handlePress(index)}
                ariaLabel={cellLabel(state, index, row, col, right, bottom)}
                className={`flex h-full w-full items-center justify-center rounded-md border font-display text-xl transition-colors ${
                  given
                    ? 'border-surface-alt bg-surface-alt/60'
                    : 'border-surface-alt bg-surface hover:border-accent-primary/60'
                }`}
              >
                {value === SUN ? (
                  <span className="text-game-1">{SUN_GLYPH}</span>
                ) : value === MOON ? (
                  <span className="text-game-4">{MOON_GLYPH}</span>
                ) : (
                  ''
                )}
              </PressButton>
              {right && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-1/2 z-10 flex h-4 w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-surface-alt bg-surface text-[10px] font-bold text-text-secondary"
                >
                  {right.same ? '=' : '×'}
                </span>
              )}
              {bottom && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-1/2 z-10 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-surface-alt bg-surface text-[10px] font-bold text-text-secondary"
                >
                  {bottom.same ? '=' : '×'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {state.done && (
        <div className="flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center shadow-card">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Sol y luna resuelto!
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
