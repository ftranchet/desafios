import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { QuickMathGame } from './ui';

export const quickMath: GameModule = {
  metadata: {
    id: 'quick-math',
    name: 'Aritmética contra reloj',
    category: 'math',
    description: 'Resolvé operaciones antes de que se acabe el tiempo.',
    version: '2.0.0',
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
  Component: QuickMathGame,
};
