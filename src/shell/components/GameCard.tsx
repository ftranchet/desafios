import { Link } from 'react-router-dom';
import type { GameMetadata } from '../../core/contract';
import { CATEGORY_LABELS, strings } from '../../i18n/es';
import { CATEGORY_ACCENT } from '../categoryColors';

interface GameCardProps {
  metadata: GameMetadata;
  bestScore: number | null;
  isFavorite: boolean;
  onToggleFavorite(gameId: string): void;
}

export function GameCard({ metadata, bestScore, isFavorite, onToggleFavorite }: GameCardProps) {
  const accent = CATEGORY_ACCENT[metadata.category];
  return (
    // El botón de favorito es hermano del Link (no anidado dentro), posicionado
    // encima con absolute: evita anidar un <button> dentro de un <a> y un toque
    // ahí nunca navega, sin necesitar preventDefault/stopPropagation.
    <div className="relative">
      <Link
        to={`/game/${metadata.id}`}
        className="flex flex-col gap-2 rounded-xl border border-surface-alt bg-surface p-4 pr-11 shadow-card transition hover:border-accent-primary/60 active:scale-[0.98] focus:outline-none focus-visible:border-accent-primary"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent.chipBg}`}
        >
          <img src={metadata.icon} alt="" className="h-7 w-7" width={28} height={28} />
        </div>
        <h2 className="font-display text-base font-bold text-text-primary">{metadata.name}</h2>
        <p className="text-sm text-text-secondary">{metadata.description}</p>
        <div className="mt-auto flex flex-col gap-1 pt-2 text-xs">
          <span className={accent.text}>{CATEGORY_LABELS[metadata.category]}</span>
          {/* Sin partidas todavía pesa menos que un récord real: no compite
              con la descripción del juego por atención (jerarquía, ADR-008). */}
          <span className={bestScore === null ? 'text-text-secondary/70' : 'text-text-secondary'}>
            {bestScore === null ? strings.catalog.noScore : strings.catalog.bestScore(bestScore)}
          </span>
        </div>
      </Link>
      <button
        type="button"
        aria-label={isFavorite ? strings.catalog.favoriteRemove : strings.catalog.favoriteAdd}
        aria-pressed={isFavorite}
        onClick={() => onToggleFavorite(metadata.id)}
        className="absolute right-1 top-1 z-10 flex min-h-touch min-w-touch items-center justify-center rounded-full text-xl leading-none transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        <span aria-hidden="true" className={isFavorite ? 'text-game-1' : 'text-text-secondary'}>
          {isFavorite ? '★' : '☆'}
        </span>
      </button>
    </div>
  );
}
