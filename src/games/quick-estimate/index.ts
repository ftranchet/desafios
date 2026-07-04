import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { QuickEstimateGame } from './ui';

export const quickEstimate: GameModule = {
  metadata: {
    id: 'quick-estimate',
    name: 'Estimación relámpago',
    category: 'math',
    description: 'Elegí rápido cuál de las dos expresiones vale más.',
    version: '2.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
    }),
    estimatedSeconds: 45,
    icon,
  },
  Component: QuickEstimateGame,
};
