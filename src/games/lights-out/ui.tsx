import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  pressCellInRound,
  type RoundProgress,
  type RoundSpec,
} from './logic';

// Interfaz de "Apagá todo". Prendido/apagado se distingue por brillo, no por
// matiz (RNF-05): una diferencia de luminancia se percibe igual con
// daltonismo, a diferencia de un contraste de colores como verde/rojo.

export function LightsOutGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const [rounds] = useState<RoundSpec[]>(() => buildRounds(config.mode, config.seed ?? Date.now()));
  const [roundIndex, setRoundIndex] = useState(0);
  const [progress, setProgress] = useState<RoundProgress>(() => createRoundProgress(rounds[0]!));

  const sessionStartRef = useRef(performance.now());
  const pressCountsRef = useRef<number[]>([]);

  const round = rounds[roundIndex];
  const showRoundCount = rounds.length > 1 && config.mode !== 'progressive';
  const isLastRound = roundIndex === rounds.length - 1;

  function finishGame(pressCounts: number[]) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, rounds, pressCounts, durationMs));
  }

  function handleCellPress(index: number) {
    if (!round || progress.done) return;
    const next = pressCellInRound(round, progress, index);
    audio?.tone(260, 50);
    setProgress(next);
    if (next.done) {
      pressCountsRef.current = [...pressCountsRef.current, next.presses];
      audio?.play('success');
    }
  }

  function continueSession() {
    if (isLastRound) {
      finishGame(pressCountsRef.current);
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
      className="flex min-h-[70vh] flex-col items-center gap-4 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Grilla ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Toques: {progress.presses}
      </div>

      <div
        className="grid w-full max-w-xs gap-1.5"
        style={{ gridTemplateColumns: `repeat(${round.gridSize}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Grilla de luces"
      >
        {progress.grid.map((isOn, cellIndex) => (
          <PressButton
            key={cellIndex}
            variant="bare"
            disabled={progress.done}
            onPress={() => handleCellPress(cellIndex)}
            ariaLabel={`Celda ${cellIndex + 1}, ${isOn ? 'prendida' : 'apagada'}`}
            className={`aspect-square rounded-md border transition-colors duration-150 ${
              isOn
                ? 'border-game-1 bg-game-1 shadow-[0_0_10px_rgba(255,205,75,0.5)]'
                : 'border-surface-alt bg-surface-alt'
            }`}
          >
            {''}
          </PressButton>
        ))}
      </div>

      {progress.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">¡Todo apagado!</p>
          <p className="text-sm text-text-secondary">Toques: {progress.presses}</p>
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {isLastRound ? 'Ver resultado' : 'Siguiente grilla'}
          </PressButton>
        </div>
      )}
    </div>
  );
}
