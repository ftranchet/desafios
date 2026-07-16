import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GAMES } from '../../core/registry';
import { storage } from '../../core/storage';
import { CATEGORY_LABELS, strings } from '../../i18n/es';
import { CATEGORY_ACCENT } from '../categoryColors';
import { GameCard } from '../components/GameCard';
import { IconFlame, IconSettings, IconStats } from '../components/icons';
import { useSettingsStore } from '../store/useSettingsStore';

function bestScoreFor(gameId: string): number | null {
  // Solo partidas completadas: una abandonada (score 0) no cuenta como récord.
  // El modo Tranquilo no compite (ADR-007): queda fuera del récord del catálogo.
  const results = storage.getResults(gameId).filter((r) => r.completed && r.mode !== 'zen');
  if (results.length === 0) return null;
  return Math.max(...results.map((r) => r.score));
}

// Grilla responsiva: 2 columnas en celular, más columnas a medida que hay
// lugar en tablet/PC, sin achicar nunca las tarjetas por debajo de un tamaño
// cómodo (el tope de ancho general vive en App.tsx).
const CARD_GRID_CLASSES = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

// Acceso a Estadísticas y Configuración: botones-ícono en el encabezado del
// catálogo (patrón Elevate) — reemplazan a la barra de navegación inferior,
// que ocupaba una franja entera de pantalla en celular para tres destinos.
const HEADER_ICON_CLASSES =
  'flex h-11 w-11 items-center justify-center rounded-lg border border-surface-alt bg-surface text-text-secondary shadow-card transition hover:border-accent-primary/60 hover:text-text-primary active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary';

export function CatalogScreen() {
  const [category, setCategory] = useState<string>('all');
  const favorites = useSettingsStore((s) => s.favorites);
  const toggleFavorite = useSettingsStore((s) => s.toggleFavorite);
  // Racha de días con al menos una partida: visible desde el hogar, no solo
  // enterrada en Estadísticas — volver cada día tiene una recompensa a la
  // vista. Tocarla lleva al detalle.
  const streak = useMemo(() => storage.getStreak(), []);

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

  // Se calcula una sola vez por montaje: los puntajes no cambian mientras se
  // navega dentro del catálogo (solo cambian al jugar una partida, y volver
  // del juego remonta esta pantalla desde cero). Marcar/desmarcar favoritos
  // no debería recorrer localStorage para las ~25 tarjetas de nuevo.
  const bestScores = useMemo(() => {
    const scores = new Map<string, number | null>();
    for (const game of GAMES) scores.set(game.metadata.id, bestScoreFor(game.metadata.id));
    return scores;
  }, []);

  return (
    <div className="flex animate-fade-in flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-text-primary">
          {strings.catalog.title}
        </h1>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Link
              to="/stats"
              aria-label={strings.stats.streak(streak)}
              className="flex h-11 items-center gap-1 rounded-lg border border-surface-alt bg-surface px-3 text-sm font-bold text-game-3 shadow-card transition hover:border-accent-primary/60 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <IconFlame className="h-4 w-4" />
              {streak}
            </Link>
          )}
          <Link to="/stats" aria-label={strings.nav.stats} className={HEADER_ICON_CLASSES}>
            <IconStats />
          </Link>
          <Link to="/config" aria-label={strings.nav.config} className={HEADER_ICON_CLASSES}>
            <IconSettings />
          </Link>
        </div>
      </header>

      {favoriteGames.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-base font-bold text-text-primary">
            {strings.catalog.favoritesTitle}
          </h2>
          <div className={CARD_GRID_CLASSES}>
            {favoriteGames.map((game) => (
              <GameCard
                key={game.metadata.id}
                metadata={game.metadata}
                bestScore={bestScores.get(game.metadata.id) ?? null}
                isFavorite
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={strings.catalog.filterByCategory}
      >
        <button
          type="button"
          aria-pressed={category === 'all'}
          className={`min-h-touch rounded-lg px-3 text-sm font-medium transition active:scale-95 ${
            category === 'all' ? 'bg-accent-primary text-bg' : 'bg-surface text-text-secondary'
          }`}
          onClick={() => setCategory('all')}
        >
          {strings.catalog.filterAll}
        </button>
        {categories.map((cat) => {
          const accent = CATEGORY_ACCENT[cat];
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              className={`min-h-touch rounded-lg px-3 text-sm font-medium transition active:scale-95 ${
                category === cat ? `${accent.activeBg} text-bg` : 'bg-surface text-text-secondary'
              }`}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {filteredGames.length === 0 ? (
        <p className="text-sm text-text-secondary">{strings.catalog.empty}</p>
      ) : (
        <div className={CARD_GRID_CLASSES}>
          {filteredGames.map((game) => (
            <GameCard
              key={game.metadata.id}
              metadata={game.metadata}
              bestScore={bestScores.get(game.metadata.id) ?? null}
              isFavorite={favorites.includes(game.metadata.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
