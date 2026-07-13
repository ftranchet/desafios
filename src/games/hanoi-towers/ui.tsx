import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createHanoiState,
  optimalMoves,
  tapPeg,
  type HanoiState,
  type RoundSpec,
} from './logic';

// Interfaz de "Torres de Hanoi". Tocá un poste para levantar su disco de
// arriba, tocá otro para soltarlo; un movimiento inválido (disco grande sobre
// uno chico) se rechaza con un destello, sin consumir el movimiento.

const SHAKE_DURATION_MS = 320;

export function HanoiTowersGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const [rounds] = useState<RoundSpec[]>(() => buildRounds(config.mode));
  const [roundIndex, setRoundIndex] = useState(0);
  const [hanoi, setHanoi] = useState<HanoiState>(() => createHanoiState(rounds[0]!.diskCount));
  const [shakePeg, setShakePeg] = useState<number | null>(null);

  const sessionStartRef = useRef(performance.now());
  const moveCountsRef = useRef<number[]>([]);
  const shakeTimeoutRef = useRef<number | null>(null);

  const round = rounds[roundIndex];
  const showRoundCount = rounds.length > 1 && config.mode !== 'progressive';
  const isLastRound = roundIndex === rounds.length - 1;

  useEffect(
    () => () => {
      if (shakeTimeoutRef.current !== null) window.clearTimeout(shakeTimeoutRef.current);
    },
    [],
  );

  function finishGame(moveCounts: number[]) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, rounds, moveCounts, durationMs));
  }

  function handlePegTap(pegIndex: number) {
    if (!round || hanoi.done) return;
    const { state: next, illegalMove } = tapPeg(hanoi, pegIndex);

    if (illegalMove) {
      audio?.play('error');
      setShakePeg(pegIndex);
      if (shakeTimeoutRef.current !== null) window.clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = window.setTimeout(() => setShakePeg(null), SHAKE_DURATION_MS);
      setHanoi(next);
      return;
    }

    if (next.moves > hanoi.moves) audio?.tone(280, 60);
    setHanoi(next);
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
    setHanoi(createHanoiState(rounds[nextIndex]!.diskCount));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (hanoi.done) {
      if (event.key === 'Enter') {
        event.preventDefault();
        continueSession();
      }
      return;
    }
    const pegIndex = ['1', '2', '3'].indexOf(event.key);
    if (pegIndex !== -1) {
      event.preventDefault();
      handlePegTap(pegIndex);
    }
  }

  if (!round) return null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Torre ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Movimientos: {hanoi.moves} · Óptimo: {optimalMoves(round.diskCount)}
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-3" role="group" aria-label="Postes">
        {hanoi.pegs.map((peg, pegIndex) => {
          const isSelected = hanoi.selectedPeg === pegIndex;
          const isShaking = shakePeg === pegIndex;
          return (
            <PressButton
              key={pegIndex}
              variant="bare"
              disabled={hanoi.done}
              onPress={() => handlePegTap(pegIndex)}
              ariaLabel={`Poste ${pegIndex + 1}, ${peg.length} disco${peg.length === 1 ? '' : 's'}`}
              className={`relative flex h-44 flex-col-reverse items-center justify-start gap-1 rounded-lg border pb-2 pt-2 transition-colors ${
                isShaking
                  ? 'border-accent-error bg-accent-error/10'
                  : isSelected
                    ? 'border-accent-primary bg-surface'
                    : 'border-surface-alt bg-surface'
              }`}
            >
              <div className="pointer-events-none absolute bottom-2 left-1/2 top-2 -z-10 w-1 -translate-x-1/2 rounded-full bg-surface-alt" />
              {peg.map((diskSize) => (
                <div
                  key={diskSize}
                  className="relative z-10 h-4 shrink-0 rounded-full bg-game-2"
                  style={{ width: `${30 + (diskSize / round.diskCount) * 60}%` }}
                />
              ))}
            </PressButton>
          );
        })}
      </div>

      {hanoi.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            ¡Torre completa!
          </p>
          <p className="text-sm text-text-secondary">
            Movimientos: {hanoi.moves} (óptimo: {optimalMoves(round.diskCount)})
          </p>
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {isLastRound ? 'Ver resultado' : 'Siguiente torre'}
          </PressButton>
        </div>
      )}
    </div>
  );
}
