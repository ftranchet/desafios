import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { SnakeGame } from './ui';

export const snake: GameModule = {
  metadata: {
    id: 'snake',
    name: 'Snake',
    category: 'spatial',
    description: 'Comé y crecé sin chocarte contra las paredes, obstáculos o vos mismo.',
    version: '2.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: MODE_PARAMS.progressive,
    }),
    estimatedSeconds: 60,
    icon,
  },
  Component: SnakeGame,
};
