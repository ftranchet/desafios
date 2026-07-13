import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { SchulteTableGame } from './ui';

export const schulteTable: GameModule = {
  metadata: {
    id: 'schulte-table',
    name: 'Tabla de Schulte',
    category: 'speed',
    description: 'Tocá los números de la grilla en orden ascendente, lo más rápido posible.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: PROGRESSIVE_PARAMS,
    }),
    estimatedSeconds: 60,
    icon,
  },
  Component: SchulteTableGame,
};
