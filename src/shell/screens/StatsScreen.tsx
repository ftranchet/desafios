import { useMemo } from 'react';
import { MODE_LABELS } from '../../core/modes';
import { GAMES, getGameById } from '../../core/registry';
import { storage } from '../../core/storage';
import { strings } from '../../i18n/es';
import { ScreenHeader } from '../components/ScreenHeader';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function gameName(gameId: string): string {
  return getGameById(gameId)?.metadata.name ?? gameId;
}

export function StatsScreen() {
  const streak = useMemo(() => storage.getStreak(), []);
  const history = useMemo(() => {
    return storage
      .getResults()
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 20);
  }, []);

  const records = useMemo(() => {
    return GAMES.flatMap((game) =>
      game.metadata.modes
        // El modo Tranquilo no compite (ADR-007): no aparece en récords.
        .filter((mode) => mode.id !== 'zen')
        .map((mode) => ({
          gameName: game.metadata.name,
          modeLabel: mode.label,
          best: storage.getBest(game.metadata.id, mode.id),
        }))
        .filter((entry) => entry.best !== null),
    );
  }, []);

  return (
    <div className="flex animate-fade-in flex-col gap-6 p-4">
      <ScreenHeader title={strings.stats.title} />

      <p className="text-sm text-text-primary">
        {streak === 0 ? strings.stats.streakEmpty : strings.stats.streak(streak)}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold text-text-secondary">
          {strings.stats.records}
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-text-secondary">{strings.stats.historyEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {records.map((entry, i) => (
              <li
                key={i}
                className="flex min-h-touch items-center justify-between gap-3 rounded-lg border border-surface-alt bg-surface px-3 py-2 text-sm text-text-primary shadow-card"
              >
                <span className="min-w-0 break-words">
                  {entry.gameName} · {entry.modeLabel}
                </span>
                <span className="shrink-0 font-semibold text-accent-primary">
                  {entry.best?.score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold text-text-secondary">
          {strings.stats.history}
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-secondary">{strings.stats.historyEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((result, i) => (
              <li
                key={i}
                className="flex min-h-touch items-center justify-between gap-3 rounded-lg border border-surface-alt bg-surface px-3 py-2 text-sm text-text-primary shadow-card"
              >
                <span className="min-w-0 break-words">
                  {formatDate(result.timestamp)} · {gameName(result.gameId)} ·{' '}
                  {MODE_LABELS[result.mode]}
                </span>
                <span
                  className={`shrink-0 text-right font-semibold ${result.completed ? 'text-accent-primary' : 'text-text-secondary'}`}
                >
                  {result.completed ? result.score : strings.stats.abandoned}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
