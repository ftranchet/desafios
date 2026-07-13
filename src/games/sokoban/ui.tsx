import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PressButton, useAutoFocus } from '../../core/ui';
import { buildResult, createInitialState, move, resetLevel, type Direction, type GameState } from './logic';

// Interfaz de "Empuja cajas" (Sokoban). D-pad + flechas del teclado para
// mover; empujar una caja contra un rincón sin objetivo puede dejar el nivel
// sin solución, así que hay un botón de reinicio siempre disponible (en vez
// de un detector de puntos muertos). Cada caja sobre su objetivo se marca con
// un tilde además de cambiar de color (RNF-05): nunca depende solo del color.

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export function SokobanGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const sessionStartRef = useRef(performance.now());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(config.mode, config.seed ?? Date.now()),
  );

  const { level } = state;

  function finishGame(finalState: GameState) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, finalState, durationMs));
  }

  function handleMove(direction: Direction) {
    if (state.done) return;
    const next = move(state, direction);
    if (next === state) return;
    audio?.tone(next.done ? 340 : 260, 50);
    setState(next);
    if (next.done) audio?.play('success');
  }

  function handleReset() {
    setState(resetLevel(state));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction) {
      event.preventDefault();
      handleMove(direction);
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      handleReset();
    }
  }

  const goalSet = new Set(level.goals);

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full max-w-xs items-center justify-between text-sm text-text-secondary">
        <span>Movimientos: {state.moves}</span>
        <PressButton variant="bare" ariaLabel="Reiniciar nivel" onPress={handleReset} className="text-accent-error">
          Reiniciar
        </PressButton>
      </div>

      <div
        className="grid w-full max-w-xs gap-0.5"
        style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Nivel de Empuja cajas"
      >
        {Array.from({ length: level.rows * level.cols }, (_, index) => {
          if (level.walls[index]) {
            return <div key={index} className="aspect-square rounded-sm bg-surface-alt" aria-hidden="true" />;
          }
          const isGoal = goalSet.has(index);
          const hasBox = state.boxes.includes(index);
          const hasPlayer = state.playerPos === index;
          const boxOnGoal = hasBox && isGoal;

          let label = 'Piso';
          if (isGoal) label = 'Objetivo';
          if (hasBox) label = boxOnGoal ? 'Caja en el objetivo' : 'Caja';
          if (hasPlayer) label += ', jugador';

          return (
            <div
              key={index}
              aria-label={label}
              className={`relative flex aspect-square items-center justify-center rounded-sm ${
                isGoal ? 'bg-accent-primary/10' : 'bg-surface'
              }`}
            >
              {isGoal && !hasBox && (
                <span className="h-2.5 w-2.5 rounded-full border-2 border-accent-primary/60" />
              )}
              {hasBox && (
                <span
                  className={`flex h-[80%] w-[80%] items-center justify-center rounded-sm text-xs font-bold ${
                    boxOnGoal ? 'bg-accent-success text-bg' : 'bg-game-2 text-text-primary'
                  }`}
                >
                  {boxOnGoal ? '✓' : ''}
                </span>
              )}
              {hasPlayer && (
                <span className="absolute h-[55%] w-[55%] rounded-full border-2 border-bg bg-game-1" />
              )}
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-3 grid-rows-3 gap-2"
        role="group"
        aria-label="Controles direccionales"
      >
        <PressButton
          ariaLabel="Mover arriba"
          disabled={state.done}
          onPress={() => handleMove('up')}
          className="col-start-2 row-start-1"
        >
          ▲
        </PressButton>
        <PressButton
          ariaLabel="Mover a la izquierda"
          disabled={state.done}
          onPress={() => handleMove('left')}
          className="col-start-1 row-start-2"
        >
          ◀
        </PressButton>
        <PressButton
          ariaLabel="Mover a la derecha"
          disabled={state.done}
          onPress={() => handleMove('right')}
          className="col-start-3 row-start-2"
        >
          ▶
        </PressButton>
        <PressButton
          ariaLabel="Mover abajo"
          disabled={state.done}
          onPress={() => handleMove('down')}
          className="col-start-2 row-start-3"
        >
          ▼
        </PressButton>
      </div>

      {state.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">¡Nivel resuelto!</p>
          <p className="text-sm text-text-secondary">Movimientos: {state.moves}</p>
          <PressButton variant="primary" onPress={() => finishGame(state)} className="px-8">
            Ver resultado
          </PressButton>
        </div>
      )}
    </div>
  );
}
