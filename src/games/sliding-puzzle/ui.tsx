import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  tapTile,
  type RoundProgress,
  type RoundSpec,
} from './logic';

// Interfaz de "Rompecabezas deslizante". Tocá una ficha adyacente al hueco
// para deslizarla; tocar una ficha que no es vecina del hueco no hace nada
// (la grilla misma muestra qué movimientos son válidos, sin hacer falta un
// aviso aparte). Los números ya distinguen cada ficha por sí solos —sin
// depender de ningún color (RNF-05)—, así que la única variable visual es la
// posición.

export function SlidingPuzzleGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const [rounds] = useState<RoundSpec[]>(() => buildRounds(config.mode, config.seed ?? Date.now()));
  const [roundIndex, setRoundIndex] = useState(0);
  const [progress, setProgress] = useState<RoundProgress>(() => createRoundProgress(rounds[0]!));

  const sessionStartRef = useRef(performance.now());
  const moveCountsRef = useRef<number[]>([]);

  const round = rounds[roundIndex];
  const showRoundCount = rounds.length > 1 && config.mode !== 'progressive';
  const isLastRound = roundIndex === rounds.length - 1;

  function finishGame(moveCounts: number[]) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, rounds, moveCounts, durationMs));
  }

  function handleTilePress(index: number) {
    if (!round || progress.done) return;
    const next = tapTile(round, progress, index);
    if (next === progress) return; // ficha no adyacente al hueco: no hace nada
    audio?.tone(260, 50);
    setProgress(next);
    if (next.done) {
      moveCountsRef.current = [...moveCountsRef.current, next.moves];
      audio?.play('success');
    }
  }

  function continueSession() {
    if (isLastRound) {
      finishGame(moveCountsRef.current);
      return;
    }
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setProgress(createRoundProgress(rounds[nextIndex]!));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (progress.done && event.key === 'Enter') {
      event.preventDefault();
      continueSession();
    }
  }

  if (!round) return null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70dvh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Tablero ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Movimientos: {progress.moves}
      </div>

      <div
        className="grid w-full max-w-xs gap-1.5"
        style={{ gridTemplateColumns: `repeat(${round.gridSize}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Tablero deslizante"
      >
        {progress.board.map((value, index) => {
          if (value === 0) {
            return <div key={index} className="aspect-square" aria-hidden="true" />;
          }
          return (
            <PressButton
              key={index}
              variant="bare"
              disabled={progress.done}
              onPress={() => handleTilePress(index)}
              ariaLabel={`Ficha ${value}`}
              className="flex aspect-square items-center justify-center rounded-lg border border-surface-alt bg-surface-alt font-display text-lg font-extrabold text-text-primary transition-colors active:bg-surface"
            >
              {value}
            </PressButton>
          );
        })}
      </div>

      {progress.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Tablero ordenado!
          </p>
          <p className="text-sm text-text-secondary">Movimientos: {progress.moves}</p>
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {isLastRound ? 'Ver resultado' : 'Siguiente tablero'}
          </PressButton>
        </div>
      )}
    </div>
  );
}
