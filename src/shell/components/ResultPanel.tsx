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
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className="font-display text-lg font-bold text-text-primary">{strings.result.title}</h2>
      <p className="font-display text-xl font-extrabold tracking-tight text-accent-primary">
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
          className="min-h-touch rounded-lg bg-accent-primary px-4 font-display text-base font-bold text-bg"
          onClick={onRetry}
        >
          {strings.result.retry}
        </button>
        <button
          type="button"
          className="min-h-touch rounded-lg bg-surface-alt px-4 font-body text-base text-text-primary"
          onClick={onBackToCatalog}
        >
          {strings.result.backToCatalog}
        </button>
      </div>
    </div>
  );
}
