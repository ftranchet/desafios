import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { NBackGame } from './ui';

export const nBack: GameModule = {
  metadata: {
    id: 'n-back',
    name: '¿Coincide?',
    category: 'memory',
    description: 'Decidí si el símbolo actual es igual al de N lugares atrás.',
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
  Component: NBackGame,
};
