import type { GameResult } from '../../core/contract';
import { strings } from '../../i18n/es';

interface ResultPanelProps {
  result: GameResult;
  previousBest: number | null;
  isNewRecord: boolean;
  onRetry(): void;
  onBackToCatalog(): void;
}

/** ms → "m:ss" (o "0:ss"); las partidas nunca llegan a la hora. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function ResultPanel({
  result,
  previousBest,
  isNewRecord,
  onRetry,
  onBackToCatalog,
}: ResultPanelProps) {
  return (
    <div className="flex animate-fade-in flex-col items-center gap-4 p-6 text-center">
      <h2 className="font-display text-lg font-bold text-text-primary">{strings.result.title}</h2>
      {/* 2xl (ADR-008): el puntaje es el número más importante de la pantalla,
          no puede pesar lo mismo que un título de sección (xl). Un récord
          nuevo suma color de éxito y una pequeña animación de celebración —
          ya sonaba y vibraba (ADR-006/GameScreen), ahora también se ve. */}
      <p
        className={`font-display text-2xl font-extrabold tracking-tight ${
          isNewRecord && result.mode !== 'zen'
            ? 'animate-pop text-accent-success'
            : 'text-accent-primary'
        }`}
      >
        {result.score}
      </p>
      {/* El modo Tranquilo no compite (ADR-007): sin récords ni fanfarria. */}
      {result.mode === 'zen' ? (
        <p className="text-sm text-text-secondary">{strings.result.zenNote}</p>
      ) : isNewRecord ? (
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-semibold text-accent-success">
            {strings.result.newRecord}
          </p>
          {/* Superar una marca real merece decir cuál era; la primera partida
              no tiene marca que mostrar. */}
          {previousBest !== null && previousBest > 0 && (
            <p className="text-sm text-text-secondary">
              {strings.result.recordBeaten(previousBest)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          {previousBest === null
            ? strings.result.noPreviousRecord
            : strings.result.previousRecord(previousBest)}
        </p>
      )}

      <p className="text-xs text-text-secondary">
        {strings.result.duration(formatDuration(result.durationMs))}
      </p>
      <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          className="min-h-touch rounded-lg bg-accent-primary px-4 font-display text-base font-bold text-bg shadow-card transition active:scale-95"
          onClick={onRetry}
        >
          {strings.result.retry}
        </button>
        <button
          type="button"
          className="min-h-touch rounded-lg bg-surface-alt px-4 font-body text-base text-text-primary transition active:scale-95"
          onClick={onBackToCatalog}
        >
          {strings.result.backToCatalog}
        </button>
      </div>
    </div>
  );
}
