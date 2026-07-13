import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { HanoiTowersGame } from './ui';

export const hanoiTowers: GameModule = {
  metadata: {
    id: 'hanoi-towers',
    name: 'Torres de Hanoi',
    category: 'logic',
    description: 'Mové toda la torre de discos al último poste en el mínimo de movimientos.',
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
  Component: HanoiTowersGame,
};
