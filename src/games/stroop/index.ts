import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { StroopGame } from './ui';

export const stroop: GameModule = {
  metadata: {
    id: 'stroop',
    name: 'Nombra el color',
    category: 'speed',
    description: 'Tocá el color en el que está pintada la palabra, no lo que dice.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: PROGRESSIVE_PARAMS,
    }),
    estimatedSeconds: 90,
    icon,
  },
  Component: StroopGame,
};
