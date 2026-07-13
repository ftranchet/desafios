import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  resolveSelection,
  selectCard,
  type RoundProgress,
  type RoundSpec,
} from './logic';

// Interfaz de "Memorama". Cada símbolo es un glifo distinto, no un color
// (RNF-05): emparejar depende de la forma, nunca de un tono. El tablero fijo
// en 4 columnas evita el problema de tamaño de celda que tuvo Tabla de
// Schulte (acá agrandar la dificultad agrega filas, no achica las celdas).

const SYMBOLS = ['●', '■', '▲', '◆', '★', '✚', '▼', '◇', '□', '△', '✦', '✕'];
const RESOLVE_DELAY_MS = 700;

export function MemoryMatchGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const [rounds] = useState<RoundSpec[]>(() => buildRounds(config.mode, config.seed ?? Date.now()));
  const [roundIndex, setRoundIndex] = useState(0);
  const [progress, setProgress] = useState<RoundProgress>(() => createRoundProgress(rounds[0]!));

  const sessionStartRef = useRef(performance.now());
  const moveCountsRef = useRef<number[]>([]);
  const resolveTimeoutRef = useRef<number | null>(null);

  const round = rounds[roundIndex];
  const showRoundCount = rounds.length > 1 && config.mode !== 'progressive';
  const isLastRound = roundIndex === rounds.length - 1;

  useEffect(
    () => () => {
      if (resolveTimeoutRef.current !== null) window.clearTimeout(resolveTimeoutRef.current);
    },
    [],
  );

  function finishGame(moveCounts: number[]) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, rounds, moveCounts, durationMs));
  }

  function handleCardTap(cellIndex: number) {
    if (!round || progress.done || progress.selectedCells.length >= 2) return;

    const next = selectCard(progress, cellIndex);
    audio?.tone(300, 60);
    setProgress(next);

    if (next.selectedCells.length === 2) {
      resolveTimeoutRef.current = window.setTimeout(() => {
        const resolved = resolveSelection(round, next);
        if (resolved.matchesFound > next.matchesFound) {
          audio?.play('success');
        } else {
          audio?.tone(180, 150);
        }
        setProgress(resolved);
        if (resolved.done) {
          moveCountsRef.current = [...moveCountsRef.current, resolved.moves];
        }
      }, RESOLVE_DELAY_MS);
    }
  }

  function continueSession() {
    if (isLastRound) {
      finishGame(moveCountsRef.current);
      return;
    }
    setRoundIndex((i) => i + 1);
    setProgress(createRoundProgress(rounds[roundIndex + 1]!));
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
      className="flex min-h-[70dvh] flex-col items-center gap-3 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Tablero ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Movimientos: {progress.moves}
      </div>

      <div
        className="grid w-full max-w-xs grid-cols-4 gap-2"
        role="group"
        aria-label="Tablero de memorama"
      >
        {round.board.map((symbolIndex, cellIndex) => {
          const isMatched = progress.matchedCells[cellIndex];
          const isSelected = progress.selectedCells.includes(cellIndex);
          const faceUp = isMatched || isSelected;
          const stateClass = isMatched
            ? 'border-accent-success/60 bg-accent-success/10 text-accent-success opacity-70'
            : isSelected
              ? 'border-accent-primary bg-surface text-accent-primary'
              : 'border-surface-alt bg-surface-alt text-transparent';
          return (
            <PressButton
              key={cellIndex}
              variant="bare"
              disabled={progress.done || isMatched || progress.selectedCells.length >= 2}
              onPress={() => handleCardTap(cellIndex)}
              ariaLabel={
                faceUp
                  ? `Carta ${cellIndex + 1}: ${SYMBOLS[symbolIndex]}`
                  : `Carta ${cellIndex + 1}, tapada`
              }
              className={`flex aspect-square items-center justify-center rounded-lg border font-display text-xl transition-colors duration-150 ${stateClass}`}
            >
              {faceUp ? SYMBOLS[symbolIndex] : ''}
            </PressButton>
          );
        })}
      </div>

      {progress.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Tablero completo!
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
