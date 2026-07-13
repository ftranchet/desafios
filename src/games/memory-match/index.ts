import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { MemoryMatchGame } from './ui';

export const memoryMatch: GameModule = {
  metadata: {
    id: 'memory-match',
    name: 'Memorama',
    category: 'memory',
    description: 'Encontrá las parejas de cartas iguales dando vuelta de a dos.',
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
  Component: MemoryMatchGame,
};
