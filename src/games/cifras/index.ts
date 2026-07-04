import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { CifrasGame } from './ui';

export const cifras: GameModule = {
  metadata: {
    id: 'cifras',
    name: 'Cifras',
    category: 'math',
    description: 'Combiná 6 números con las 4 operaciones para llegar al objetivo.',
    version: '2.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
    }),
    estimatedSeconds: 75,
    icon,
  },
  Component: CifrasGame,
};
