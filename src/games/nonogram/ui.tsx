import { Fragment, useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, cluesForLine, createInitialState, toggleCell, type GameState } from './logic';

// Interfaz de Nonograma (Picross). Nota sobre RNF-04: igual que en Sudoku, una
// grilla de hasta 10 columnas no puede tener celdas de 44 px en un celular
// angosto — restricción matemática de la grilla clásica, no una elección; acá
// no hay forma de separar selección de acción (cada toque pinta una celda),
// así que se acepta el mismo trade-off que usan las apps de Picross en
// móvil. La celda pintada se distingue por un salto grande de luminancia
// (no por matiz, RNF-05) y, además, cada pista de fila/columna que ya queda
// satisfecha se atenúa y tacha — una señal tipográfica, no solo de color.

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

export function NonogramGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );

  const { rows, cols, rowClues, colClues } = state.puzzle;

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function handleToggle(index: number) {
    if (state.done) return;
    const next = toggleCell(state, index);
    audio?.tone(next.board[index] ? 320 : 220, 50);
    setState(next);
    if (next.done) audio?.play('success');
  }

  function rowLine(r: number): number[] {
    return state.board.slice(r * cols, r * cols + cols);
  }

  function colLine(c: number): number[] {
    const line: number[] = [];
    for (let r = 0; r < rows; r += 1) line.push(state.board[r * cols + c]!);
    return line;
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-3 p-4 focus:outline-none"
      tabIndex={0}
    >
      <div className="w-full max-w-[24rem] text-center text-sm text-text-secondary">
        Toques: {state.taps}
      </div>

      <div
        className="grid w-full max-w-[24rem] gap-0.5"
        style={{
          gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))`,
        }}
        role="group"
        aria-label="Grilla de Nonograma"
      >
        <div />
        {colClues.map((clue, c) => {
          const satisfied = arraysEqual(cluesForLine(colLine(c)), clue);
          return (
            <div
              key={`col-${c}`}
              className={`flex flex-col items-center justify-end gap-0.5 pb-1 text-xs leading-none ${
                satisfied ? 'text-text-secondary/40 line-through' : 'text-text-secondary'
              }`}
            >
              {clue.length === 0 ? <span>0</span> : clue.map((n, i) => <span key={i}>{n}</span>)}
            </div>
          );
        })}
        {Array.from({ length: rows }, (_, r) => {
          const clue = rowClues[r]!;
          const satisfied = arraysEqual(cluesForLine(rowLine(r)), clue);
          return (
            <Fragment key={`row-${r}`}>
              <div
                className={`flex items-center justify-end gap-1 pr-1.5 text-xs leading-none ${
                  satisfied ? 'text-text-secondary/40 line-through' : 'text-text-secondary'
                }`}
              >
                {clue.length === 0 ? '0' : clue.join(' ')}
              </div>
              {Array.from({ length: cols }, (_, c) => {
                const index = r * cols + c;
                const filled = state.board[index] === 1;
                return (
                  <PressButton
                    key={index}
                    variant="bare"
                    disabled={state.done}
                    onPress={() => handleToggle(index)}
                    ariaLabel={`Fila ${r + 1}, columna ${c + 1}, ${filled ? 'pintada' : 'vacía'}`}
                    className={`aspect-square border border-surface-alt transition-colors ${
                      filled ? 'bg-game-4' : 'bg-surface'
                    }`}
                  >
                    {''}
                  </PressButton>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {state.done && (
        <div className="flex w-full max-w-[24rem] flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Dibujo revelado!
          </p>
          <p className="text-sm text-text-secondary">Toques: {state.taps}</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      )}
    </div>
  );
}
