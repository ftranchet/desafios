import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
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
      zen: MODE_PARAMS.zen,
      progressive: PROGRESSIVE_PARAMS,
    }),
    estimatedSeconds: 60,
    icon,
  },
  Component: QuickEstimateGame,
};
