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
    howToPlay:
      'Las cartas están boca abajo: dá vuelta dos por turno buscando parejas iguales. Las que coinciden quedan descubiertas; las que no, se ocultan de nuevo — memorizá dónde estaba cada una. Menos intentos, más puntaje.',
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
