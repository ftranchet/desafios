import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { QuickEstimateGame } from './ui';

const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => ({
  level,
  label: LEVEL_LABELS[level],
  params: LEVEL_PARAMS[level],
}));

export const quickEstimate: GameModule = {
  metadata: {
    id: 'quick-estimate',
    name: 'Estimación relámpago',
    category: 'math',
    description: 'Elegí rápido cuál de las dos expresiones vale más.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 45,
    icon,
  },
  Component: QuickEstimateGame,
};
