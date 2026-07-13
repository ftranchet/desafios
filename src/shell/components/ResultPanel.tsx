import type { GameResult } from '../../core/contract';
import { strings } from '../../i18n/es';

interface ResultPanelProps {
  result: GameResult;
  previousBest: number | null;
  isNewRecord: boolean;
  onRetry(): void;
  onBackToCatalog(): void;
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
          isNewRecord && result.mode !== 'zen' ? 'animate-pop text-accent-success' : 'text-accent-primary'
        }`}
      >
        {result.score}
      </p>
      {/* El modo Tranquilo no compite (ADR-007): sin récords ni fanfarria. */}
      {result.mode === 'zen' ? (
        <p className="text-sm text-text-secondary">{strings.result.zenNote}</p>
      ) : isNewRecord ? (
        <p className="font-display text-sm font-semibold text-accent-success">
          {strings.result.newRecord}
        </p>
      ) : (
        <p className="text-sm text-text-secondary">
          {previousBest === null
            ? strings.result.noPreviousRecord
            : strings.result.previousRecord(previousBest)}
        </p>
      )}
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
