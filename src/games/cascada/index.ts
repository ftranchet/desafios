import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { CascadaGame } from './ui';

export const cascada: GameModule = {
  metadata: {
    id: 'cascada',
    name: 'Cascada',
    category: 'spatial',
    description: 'Encajá las piezas que caen y completá líneas.',
    version: '2.0.0',
    // Tranquilo y Progresivo llegan en una próxima sesión (ADR-007): el juego
    // declara solo lo que implementa y el selector muestra lo declarado.
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
    }),
    estimatedSeconds: 120,
    icon,
  },
  Component: CascadaGame,
};
