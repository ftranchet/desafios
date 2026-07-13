import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { SecretCodeGame } from './ui';

export const secretCode: GameModule = {
  metadata: {
    id: 'secret-code',
    name: 'Código secreto',
    category: 'logic',
    description: 'Deducí el código secreto de dígitos a partir de las pistas de cada intento.',
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
  Component: SecretCodeGame,
};
