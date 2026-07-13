import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GAMES, getGameById } from '../../core/registry';
import { storage } from '../../core/storage';
import { CATEGORY_LABELS, strings } from '../../i18n/es';
import { GameCard } from '../components/GameCard';
import { useSettingsStore } from '../store/useSettingsStore';

function bestScoreFor(gameId: string): number | null {
  // Solo partidas completadas: una abandonada (score 0) no cuenta como récord.
  // El modo Tranquilo no compite (ADR-007): queda fuera del récord del catálogo.
  const results = storage.getResults(gameId).filter((r) => r.completed && r.mode !== 'zen');
  if (results.length === 0) return null;
  return Math.max(...results.map((r) => r.score));
}

export function CatalogScreen() {
  const [category, setCategory] = useState<string>('all');
  const lastPlayed = useSettingsStore((s) => s.lastPlayed);
  const favorites = useSettingsStore((s) => s.favorites);
  const toggleFavorite = useSettingsStore((s) => s.toggleFavorite);

  const categories = useMemo(() => {
    const present = new Set(GAMES.map((g) => g.metadata.category));
    return Array.from(present);
  }, []);

  const filteredGames = useMemo(
    () => (category === 'all' ? GAMES : GAMES.filter((g) => g.metadata.category === category)),
    [category],
  );

  // Orden del catálogo, no el de marcado: agregar/quitar favoritos no
  // reordena la sección mientras se navega.
  const favoriteGames = useMemo(
    () => GAMES.filter((g) => favorites.includes(g.metadata.id)),
    [favorites],
  );

  const lastPlayedGame = lastPlayed ? getGameById(lastPlayed.gameId) : undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-display text-xl font-extrabold text-text-primary">
        {strings.catalog.title}
      </h1>

      {lastPlayedGame && (
        <Link
          to={`/game/${lastPlayedGame.metadata.id}`}
          className="min-h-touch flex items-center justify-center rounded-lg border border-accent-primary bg-surface px-4 text-sm text-accent-primary"
        >
          {strings.catalog.continueLast}: {lastPlayedGame.metadata.name}
        </Link>
      )}

      {favoriteGames.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-base font-bold text-text-primary">
            {strings.catalog.favoritesTitle}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {favoriteGames.map((game) => (
              <GameCard
                key={game.metadata.id}
                metadata={game.metadata}
                bestScore={bestScoreFor(game.metadata.id)}
                isFavorite
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`min-h-touch rounded-lg px-3 text-sm font-medium transition-colors ${
            category === 'all' ? 'bg-accent-primary text-bg' : 'bg-surface text-text-secondary'
          }`}
          onClick={() => setCategory('all')}
        >
          {strings.catalog.filterAll}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`min-h-touch rounded-lg px-3 text-sm font-medium transition-colors ${
              category === cat ? 'bg-accent-primary text-bg' : 'bg-surface text-text-secondary'
            }`}
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {filteredGames.length === 0 ? (
        <p className="text-sm text-text-secondary">{strings.catalog.empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredGames.map((game) => (
            <GameCard
              key={game.metadata.id}
              metadata={game.metadata}
              bestScore={bestScoreFor(game.metadata.id)}
              isFavorite={favorites.includes(game.metadata.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
