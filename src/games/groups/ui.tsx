import { useRef, useState, type KeyboardEvent } from 'react';
import type { GameProps } from '../../core/contract';
import { PROGRESSIVE_STAGES } from '../../core/modes';
import { PressButton, useAutoFocus } from '../../core/ui';
import {
  buildResult,
  buildRounds,
  createRoundProgress,
  tapCell,
  type RoundProgress,
  type RoundSpec,
} from './logic';

// Interfaz de "Grupos". Tocá un grupo de 2 o más fichas iguales, conectadas
// en horizontal o vertical, para limpiarlas; cuantas más fichas tenga el
// grupo, más puntos. Cada tipo de ficha combina color y glifo (RNF-05):
// agrupar nunca depende solo del color, alcanza con la forma.

const TILE_META: { swatchClass: string; glyph: string; label: string }[] = [
  { swatchClass: 'bg-game-1 text-bg', glyph: '●', label: 'círculo amarillo' },
  { swatchClass: 'bg-game-2 text-bg', glyph: '■', label: 'cuadrado violeta' },
  { swatchClass: 'bg-game-3 text-bg', glyph: '▲', label: 'triángulo naranja' },
  { swatchClass: 'bg-game-4 text-bg', glyph: '◆', label: 'diamante celeste' },
  { swatchClass: 'bg-accent-success text-bg', glyph: '★', label: 'estrella verde' },
];

export function GroupsGame({ config, onFinish, audio }: GameProps) {
  const containerRef = useAutoFocus<HTMLDivElement>();
  const [rounds] = useState<RoundSpec[]>(() => buildRounds(config.mode, config.seed ?? Date.now()));
  const [roundIndex, setRoundIndex] = useState(0);
  const [progress, setProgress] = useState<RoundProgress>(() => createRoundProgress(rounds[0]!));

  const sessionStartRef = useRef(performance.now());
  const progressListRef = useRef<RoundProgress[]>([]);

  const round = rounds[roundIndex];
  const showRoundCount = rounds.length > 1 && config.mode !== 'progressive';
  const isLastRound = roundIndex === rounds.length - 1;

  function finishGame(progressList: RoundProgress[]) {
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    onFinish(buildResult(config, rounds, progressList, durationMs));
  }

  function handleCellPress(index: number) {
    if (!round || progress.done) return;
    const next = tapCell(round, progress, config.mode, index);
    if (next === progress) return; // no era parte de un grupo de 2+: no hace nada
    audio?.tone(280, 60);
    setProgress(next);
    if (next.done) {
      progressListRef.current = [...progressListRef.current, next];
      audio?.play('success');
    }
  }

  function continueSession() {
    if (isLastRound) {
      finishGame(progressListRef.current);
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

  const boardCleared = progress.grid.every((value) => value === -1);

  return (
    <div
      ref={containerRef}
      className="flex min-h-[70vh] flex-col items-center gap-3 p-6 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xs text-center text-sm text-text-secondary">
        {showRoundCount && `Tablero ${roundIndex + 1}/${rounds.length} · `}
        {config.mode === 'progressive' && `Grado ${round.stage}/${PROGRESSIVE_STAGES} · `}
        Puntos: {progress.score}
      </div>

      <div
        className="grid w-full max-w-xs gap-1"
        style={{ gridTemplateColumns: `repeat(${round.cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Tablero de Grupos"
      >
        {progress.grid.map((color, index) => {
          if (color === -1) {
            return <div key={index} className="aspect-square" aria-hidden="true" />;
          }
          const tile = TILE_META[color]!;
          return (
            <PressButton
              key={index}
              variant="bare"
              disabled={progress.done}
              onPress={() => handleCellPress(index)}
              ariaLabel={`Ficha: ${tile.label}`}
              className={`flex aspect-square items-center justify-center rounded-md text-base font-bold transition-colors ${tile.swatchClass}`}
            >
              {tile.glyph}
            </PressButton>
          );
        })}
      </div>

      {progress.done && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-surface-alt bg-surface p-4 text-center">
          <p className="font-display text-lg font-extrabold text-accent-success">
            {boardCleared ? '¡Tablero vacío!' : 'Sin más grupos'}
          </p>
          <p className="text-sm text-text-secondary">Puntos: {progress.score}</p>
          <PressButton variant="primary" onPress={continueSession} className="px-8">
            {isLastRound ? 'Ver resultado' : 'Siguiente tablero'}
          </PressButton>
        </div>
      )}
    </div>
  );
}
