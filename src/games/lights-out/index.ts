import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { LightsOutGame } from './ui';

// Nombre original (11.2): el juguete electrónico "Lights Out" de Tiger
// Electronics es una marca registrada; la mecánica se llama acá "Apagá todo".
export const lightsOut: GameModule = {
  metadata: {
    id: 'lights-out',
    name: 'Apagá todo',
    category: 'logic',
    description: 'Tocá las celdas para apagar toda la grilla: cada toque prende o apaga vecinas.',
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
  Component: LightsOutGame,
};
