import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { SimonGame } from './ui';

const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => ({
  level,
  label: LEVEL_LABELS[level],
  params: LEVEL_PARAMS[level],
}));

export const simon: GameModule = {
  metadata: {
    id: 'simon',
    name: 'Simon',
    category: 'memory',
    description: 'Repetí la secuencia de colores, que crece una ronda a la vez.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 60,
    icon,
  },
  Component: SimonGame,
};
