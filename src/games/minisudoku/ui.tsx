import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  BOX_COLS,
  BOX_ROWS,
  SIZE,
  buildResult,
  createInitialState,
  isGivenCell,
  setCell,
  type GameState,
} from './logic';

// Interfaz de Minisudoku. Grilla de 6 columnas (a diferencia del Sudoku 9×9
// de este catálogo, acá 6 celdas de ~64px entran cómodas en un celular de
// 360px sin necesitar la excepción de RNF-04 que sí documenta el Sudoku
// grande). La corrección de cada celda combina color y peso de fuente
// (RNF-05): dada = negrita, ingresada bien = semibold en acento, mal =
// semibold en error — nunca depende solo del color.

const DIGITS = [1, 2, 3, 4, 5, 6];

export function MinisudokuGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );
  const [selected, setSelected] = useState<number | null>(null);

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function fillSelected(digit: number | null) {
    if (state.done || selected === null) return;
    const next = setCell(state, selected, digit);
    if (next === state) return;
    if (digit !== null) {
      const wrong = digit !== state.solution[selected];
      audio?.tone(wrong ? 200 : 340, 60);
    }
    setState(next);
    if (next.done) audio?.play('success');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (/^[1-6]$/.test(event.key)) {
      event.preventDefault();
      fillSelected(Number(event.key));
    } else if (event.key === 'Backspace' || event.key === '0') {
      event.preventDefault();
      fillSelected(null);
    }
  }

  const selectedRow = selected !== null ? Math.floor(selected / SIZE) : null;
  const selectedCol = selected !== null ? selected % SIZE : null;
  const selectedBox =
    selected !== null
      ? Math.floor(selectedRow! / BOX_ROWS) * BOX_COLS + Math.floor(selectedCol! / BOX_COLS)
      : null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-3 p-4 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-[22rem] text-center text-sm text-text-secondary">
        Errores: {state.mistakes}
      </div>

      <div
        className="grid w-full max-w-[22rem] grid-cols-6"
        role="group"
        aria-label="Grilla de Minisudoku"
      >
        {state.board.map((value, index) => {
          const row = Math.floor(index / SIZE);
          const col = index % SIZE;
          const box = Math.floor(row / BOX_ROWS) * BOX_COLS + Math.floor(col / BOX_COLS);
          const given = isGivenCell(state, index);
          const isSelected = selected === index;
          const isRelated =
            !isSelected &&
            selected !== null &&
            (row === selectedRow || col === selectedCol || box === selectedBox);
          const wrong = value !== null && value !== state.solution[index];

          const borderClasses = [
            'border border-surface-alt',
            col % BOX_COLS === BOX_COLS - 1 && col !== SIZE - 1
              ? 'border-r-2 border-r-text-secondary/50'
              : '',
            row % BOX_ROWS === BOX_ROWS - 1 && row !== SIZE - 1
              ? 'border-b-2 border-b-text-secondary/50'
              : '',
          ].join(' ');
          const bgClass = isSelected
            ? 'bg-accent-primary/25'
            : isRelated
              ? 'bg-surface-alt/60'
              : 'bg-surface';
          const textClass = given
            ? 'font-extrabold text-text-primary'
            : wrong
              ? 'font-semibold text-accent-error'
              : 'font-semibold text-accent-primary';

          return (
            <PressButton
              key={index}
              variant="bare"
              onPress={() => setSelected(index)}
              ariaLabel={`Fila ${row + 1}, columna ${col + 1}${given ? `, dado ${value}` : value ? `, ingresado ${value}` : ', vacío'}`}
              className={`flex aspect-square items-center justify-center font-display text-lg transition-colors ${borderClasses} ${bgClass} ${textClass}`}
            >
              {value ?? ''}
            </PressButton>
          );
        })}
      </div>

      {state.done ? (
        <div className="flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center shadow-card">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Minisudoku resuelto!
          </p>
          <p className="text-sm text-text-secondary">Errores: {state.mistakes}</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      ) : (
        <div className="grid w-full max-w-[22rem] grid-cols-4 gap-1.5">
          {DIGITS.map((digit) => (
            <PressButton
              key={digit}
              variant="key"
              disabled={selected === null}
              onPress={() => fillSelected(digit)}
            >
              {digit}
            </PressButton>
          ))}
          <PressButton
            variant="key"
            ariaLabel="Borrar celda"
            disabled={selected === null}
            onPress={() => fillSelected(null)}
            className="col-span-2"
          >
            ⌫
          </PressButton>
        </div>
      )}
    </div>
  );
}
