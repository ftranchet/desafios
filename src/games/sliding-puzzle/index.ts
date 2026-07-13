import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { SlidingPuzzleGame } from './ui';

export const slidingPuzzle: GameModule = {
  metadata: {
    id: 'sliding-puzzle',
    name: 'Rompecabezas deslizante',
    category: 'spatial',
    description: 'Deslizá las fichas hacia el hueco hasta ordenarlas.',
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
  Component: SlidingPuzzleGame,
};
