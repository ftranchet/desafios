import { useRef, useState } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, createInitialState, reveal, toggleFlag, type GameState } from './logic';

// Interfaz de "Buscaminas". Un botón de "modo bandera" reemplaza al clic
// derecho de la versión de escritorio (no hay una forma táctil estándar
// equivalente): activado, tocar una celda la marca o desmarca en vez de
// descubrirla. Cada celda descubierta muestra la cantidad de minas vecinas
// como número — nunca solo un color (RNF-05); las celdas sin marcar,
// marcadas y descubiertas se distinguen además por su contenido (vacía,
// bandera, número o mina), no solo por el estilo.

const NUMBER_COLORS = [
  '',
  'text-accent-primary',
  'text-accent-success',
  'text-game-3',
  'text-game-2',
  'text-game-4',
  'text-game-1',
  'text-accent-error',
  'text-text-primary',
];

export function MinesweeperGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );
  const [flagMode, setFlagMode] = useState(false);

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function handleCellPress(index: number) {
    if (flagMode) {
      const next = toggleFlag(state, index);
      if (next !== state) audio?.tone(260, 40);
      setState(next);
      return;
    }
    const next = reveal(state, index);
    if (next === state) return;
    if (next.status === 'lost') {
      audio?.play('error');
    } else if (next.status === 'won') {
      audio?.play('success');
    } else {
      audio?.tone(300, 40);
    }
    setState(next);
  }

  const flagsUsed = state.flagged.filter(Boolean).length;
  const minesLeft = state.mineCount - flagsUsed;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
    >
      <div className="flex w-full max-w-xs items-center justify-between text-sm text-text-secondary">
        <span>Minas: {minesLeft}</span>
        <PressButton
          variant="bare"
          ariaLabel="Modo bandera"
          onPress={() => setFlagMode((v) => !v)}
          className={`rounded-md border px-3 py-1 ${
            flagMode ? 'border-accent-primary text-accent-primary' : 'border-surface-alt text-text-secondary'
          }`}
        >
          🚩 {flagMode ? 'activo' : 'marcar'}
        </PressButton>
      </div>

      <div
        className="grid w-full max-w-xs gap-0.5"
        style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Tablero de Buscaminas"
      >
        {Array.from({ length: state.rows * state.cols }, (_, index) => {
          const isRevealed = state.revealed[index];
          const isFlagged = state.flagged[index];
          const isMine = state.generated && state.mines[index];
          const showMine = isMine && (isRevealed || state.status === 'lost');
          const count = state.neighborCounts[index]!;

          let label = 'Celda sin descubrir';
          if (isFlagged) label = 'Celda marcada con bandera';
          else if (showMine) label = 'Mina';
          else if (isRevealed) label = count > 0 ? `Celda descubierta: ${count} minas vecinas` : 'Celda descubierta, vacía';

          return (
            <PressButton
              key={index}
              variant="bare"
              disabled={state.status !== 'playing'}
              onPress={() => handleCellPress(index)}
              ariaLabel={label}
              className={`flex aspect-square items-center justify-center rounded-sm text-sm font-bold transition-colors ${
                isRevealed || showMine
                  ? showMine
                    ? 'bg-accent-error/25'
                    : 'bg-surface'
                  : 'bg-surface-alt active:bg-surface'
              }`}
            >
              {showMine ? '●' : isFlagged ? '🚩' : isRevealed && count > 0 ? (
                <span className={NUMBER_COLORS[count]}>{count}</span>
              ) : (
                ''
              )}
            </PressButton>
          );
        })}
      </div>

      {state.status === 'won' && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">¡Campo despejado!</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      )}

      {state.status === 'lost' && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-error">¡Boom!</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      )}

      {config.mode === 'zen' && state.status === 'playing' && (
        <PressButton
          variant="primary"
          ariaLabel="Terminar la partida"
          onPress={() => finishGame(state)}
          className="px-8"
        >
          Terminar
        </PressButton>
      )}
    </div>
  );
}
