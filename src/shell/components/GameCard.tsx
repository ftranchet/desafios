import { Link } from 'react-router-dom';
import type { GameMetadata } from '../../core/contract';
import { CATEGORY_LABELS, strings } from '../../i18n/es';

interface GameCardProps {
  metadata: GameMetadata;
  bestScore: number | null;
}

export function GameCard({ metadata, bestScore }: GameCardProps) {
  return (
    <Link
      to={`/game/${metadata.id}`}
      className="flex flex-col gap-2 rounded-xl border border-surface-alt bg-surface p-4 transition-colors hover:border-accent-primary/60 focus:outline-none focus-visible:border-accent-primary"
    >
      <img src={metadata.icon} alt="" className="h-8 w-8" width={32} height={32} />
      <h2 className="font-display text-base font-bold text-text-primary">{metadata.name}</h2>
      <p className="text-sm text-text-secondary">{metadata.description}</p>
      <div className="mt-auto flex flex-col gap-1 pt-2 text-xs">
        <span className="text-accent-primary">{CATEGORY_LABELS[metadata.category]}</span>
        <span className="text-text-secondary">
          {bestScore === null ? strings.catalog.noScore : strings.catalog.bestScore(bestScore)}
        </span>
      </div>
    </Link>
  );
}
