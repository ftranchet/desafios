import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { CascadaGame } from './ui';

const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => ({
  level,
  label: LEVEL_LABELS[level],
  params: LEVEL_PARAMS[level],
}));

export const cascada: GameModule = {
  metadata: {
    id: 'cascada',
    name: 'Cascada',
    category: 'spatial',
    description: 'Encajá las piezas que caen y completá líneas.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 120,
    icon,
  },
  Component: CascadaGame,
};
