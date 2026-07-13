import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  placeTile,
  removeTile,
  type RoundProgress,
  type RoundSpec,
} from './logic';

// Interfaz de "Anagramas". Reordená las fichas de la bandeja tocándolas: cada
// toque la coloca en el próximo casillero libre de la respuesta; tocar un
// casillero ya ocupado la devuelve a la bandeja. Sin límite de intentos: se
// puede reacomodar libremente, el puntaje premia la eficiencia de
// movimientos, no un game over.

export function AnagramsGame({ config, onFinish, audio }: GameProps) {
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

  function handlePlace(poolPosition: number) {
    if (!round) return;
    const next = placeTile(round, progress, poolPosition);
    if (next === progress) return;
    audio?.tone(280, 50);
    setProgress(next);
    if (next.done) {
      moveCountsRef.current = [...moveCountsRef.current, next.moves];
      audio?.play('success');
    }
  }

  function handleRemove(answerPosition: number) {
    const next = removeTile(progress, answerPosition);
    if (next === progress) return;
    audio?.tone(200, 50);
    setProgress(next);
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
      className="flex min-h-[70vh] flex-col items-center gap-6 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Palabra ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Movimientos: {progress.moves}
      </div>

      <div className="flex w-full max-w-xs flex-wrap justify-center gap-2" role="group" aria-label="Respuesta">
        {Array.from({ length: round.word.length }, (_, i) => {
          const tileIndex = progress.answerIndices[i];
          const letter = tileIndex !== undefined ? round.tiles[tileIndex] : null;
          return (
            <PressButton
              key={i}
              variant="bare"
              disabled={progress.done || letter === null}
              onPress={() => handleRemove(i)}
              ariaLabel={letter ? `Casillero ${i + 1}: ${letter}, tocá para quitar` : `Casillero ${i + 1}, vacío`}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border font-display text-lg font-extrabold transition-colors ${
                letter
                  ? 'border-game-3 bg-game-3/20 text-game-3'
                  : 'border-dashed border-surface-alt bg-surface text-transparent'
              }`}
            >
              {letter ?? '·'}
            </PressButton>
          );
        })}
      </div>

      <div className="flex w-full max-w-xs flex-wrap justify-center gap-2" role="group" aria-label="Bandeja de fichas">
        {progress.poolIndices.map((tileIndex, poolPosition) => (
          <PressButton
            key={tileIndex}
            variant="bare"
            disabled={progress.done}
            onPress={() => handlePlace(poolPosition)}
            ariaLabel={`Ficha en bandeja: ${round.tiles[tileIndex]}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-surface-alt bg-surface-alt font-display text-lg font-extrabold text-text-primary transition-colors active:bg-surface"
          >
            {round.tiles[tileIndex]}
          </PressButton>
        ))}
      </div>

      {progress.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">¡Correcto!</p>
          <p className="text-sm text-text-secondary">Movimientos: {progress.moves}</p>
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {isLastRound ? 'Ver resultado' : 'Siguiente palabra'}
          </PressButton>
        </div>
      )}
    </div>
  );
}
