import { useMemo } from 'react';
import { GAMES, getGameById } from '../../core/registry';
import { storage } from '../../core/storage';
import { strings } from '../../i18n/es';

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
      game.metadata.levels
        .map((level) => ({
          gameName: game.metadata.name,
          levelLabel: level.label,
          best: storage.getBest(game.metadata.id, level.level),
        }))
        .filter((entry) => entry.best !== null),
    );
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-display text-xl font-extrabold text-text-primary">
        {strings.stats.title}
      </h1>

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
                className="flex justify-between rounded-lg border border-surface-alt bg-surface px-3 py-2 text-sm text-text-primary"
              >
                <span>
                  {entry.gameName} · {entry.levelLabel}
                </span>
                <span className="text-accent-primary">{entry.best?.score}</span>
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
                className="flex justify-between rounded-lg border border-surface-alt bg-surface px-3 py-2 text-sm text-text-primary"
              >
                <span>
                  {formatDate(result.timestamp)} · {gameName(result.gameId)} · Nivel {result.level}
                </span>
                <span className={result.completed ? 'text-accent-primary' : 'text-text-secondary'}>
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
