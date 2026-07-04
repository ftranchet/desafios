import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { SimonGame } from './ui';

export const simon: GameModule = {
  metadata: {
    id: 'simon',
    name: 'Simon',
    category: 'memory',
    description: 'Repetí la secuencia de colores, que crece una ronda a la vez.',
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
  Component: SimonGame,
};
