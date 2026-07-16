import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { GroupsGame } from './ui';

export const groups: GameModule = {
  metadata: {
    id: 'groups',
    name: 'Grupos',
    category: 'spatial',
    description: 'Tocá grupos de 2 o más fichas iguales conectadas para limpiarlas.',
    howToPlay:
      'Tocá grupos de 2 o más fichas iguales y conectadas para limpiarlas; las de arriba caen y las columnas se compactan. Cuantas más fichas saques en un mismo toque, más puntos: buscá los grupos grandes.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: PROGRESSIVE_PARAMS,
    }),
    estimatedSeconds: 120,
    icon,
  },
  Component: GroupsGame,
};
