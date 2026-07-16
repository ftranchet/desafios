import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { TriosGame } from './ui';

export const trios: GameModule = {
  metadata: {
    id: 'trios',
    name: 'Tríos',
    category: 'logic',
    description: 'Encontrá 3 cartas cuyos atributos sean siempre iguales o siempre distintos.',
    howToPlay:
      'Elegí 3 cartas que formen un trío válido: en cada atributo, las tres tienen que ser todas iguales o todas distintas. Si el trío no vale, la selección se limpia y probás de nuevo.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: PROGRESSIVE_PARAMS,
    }),
    estimatedSeconds: 150,
    icon,
  },
  Component: TriosGame,
};
