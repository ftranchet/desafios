import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { ReactionTimeGame } from './ui';

const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => ({
  level,
  label: LEVEL_LABELS[level],
  params: LEVEL_PARAMS[level],
}));

export const reactionTime: GameModule = {
  metadata: {
    id: 'reaction-time',
    name: 'Tiempo de reacción',
    category: 'speed',
    description: 'Tocá en cuanto la pantalla cambie de color y evitá los señuelos.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 30,
    icon,
  },
  Component: ReactionTimeGame,
};
