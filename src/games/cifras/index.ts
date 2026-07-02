import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { CifrasGame } from './ui';

const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => ({
  level,
  label: LEVEL_LABELS[level],
  params: LEVEL_PARAMS[level],
}));

export const cifras: GameModule = {
  metadata: {
    id: 'cifras',
    name: 'Cifras',
    category: 'math',
    description: 'Combiná 6 números con las 4 operaciones para llegar al objetivo.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 75,
    icon,
  },
  Component: CifrasGame,
};
