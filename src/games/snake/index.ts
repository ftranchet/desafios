import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { SnakeGame } from './ui';

const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => ({
  level,
  label: LEVEL_LABELS[level],
  params: LEVEL_PARAMS[level],
}));

export const snake: GameModule = {
  metadata: {
    id: 'snake',
    name: 'Snake',
    category: 'spatial',
    description: 'Comé y crecé sin chocarte contra las paredes, obstáculos o vos mismo.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 60,
    icon,
  },
  Component: SnakeGame,
};
