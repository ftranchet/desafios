import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, createInitialState, isGivenCell, setCell, type GameState } from './logic';

// Interfaz de Sudoku. Nota deliberada sobre RNF-04: una grilla de 9 columnas
// no puede tener celdas de 44 px en un celular de 360 px (9×44 = 396 px sin
// contar bordes ni relleno) — es una restricción matemática de la grilla
// clásica, no una elección. Se compensa así: el toque en la grilla solo
// selecciona una celda (una acción puntual, no repetida); completar el
// número se hace en el teclado de abajo, con teclas de sobra de 44 px.
// La corrección de cada celda combina color y peso de fuente (RNF-05): dada
// = negrita, ingresada bien = semibold en acento, mal = semibold en error —
// y las reglas del Sudoku siempre se pueden verificar mirando los números,
// nunca dependen solo del color.

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function SudokuGame({ config, onFinish, audio }: GameProps) {
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
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      fillSelected(Number(event.key));
    } else if (event.key === 'Backspace' || event.key === '0') {
      event.preventDefault();
      fillSelected(null);
    }
  }

  const selectedRow = selected !== null ? Math.floor(selected / 9) : null;
  const selectedCol = selected !== null ? selected % 9 : null;
  const selectedBox =
    selected !== null ? Math.floor(selectedRow! / 3) * 3 + Math.floor(selectedCol! / 3) : null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-3 p-4 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-[24rem] text-center text-sm text-text-secondary">
        Errores: {state.mistakes}
      </div>

      <div
        className="grid w-full max-w-[24rem] grid-cols-9"
        role="group"
        aria-label="Grilla de Sudoku"
      >
        {state.board.map((value, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          const given = isGivenCell(state, index);
          const isSelected = selected === index;
          const isRelated =
            !isSelected &&
            selected !== null &&
            (row === selectedRow || col === selectedCol || box === selectedBox);
          const wrong = value !== null && value !== state.solution[index];

          const borderClasses = [
            'border border-surface-alt',
            col % 3 === 2 && col !== 8 ? 'border-r-2 border-r-text-secondary/50' : '',
            row % 3 === 2 && row !== 8 ? 'border-b-2 border-b-text-secondary/50' : '',
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
              className={`flex aspect-square items-center justify-center font-display text-base transition-colors ${borderClasses} ${bgClass} ${textClass}`}
            >
              {value ?? ''}
            </PressButton>
          );
        })}
      </div>

      {state.done ? (
        <div className="flex w-full max-w-[24rem] flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Sudoku resuelto!
          </p>
          <p className="text-sm text-text-secondary">Errores: {state.mistakes}</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      ) : (
        <div className="grid w-full max-w-[24rem] grid-cols-5 gap-1.5">
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
          >
            ⌫
          </PressButton>
        </div>
      )}
    </div>
  );
}
