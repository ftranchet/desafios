import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { ReactionTimeGame } from './ui';

export const reactionTime: GameModule = {
  metadata: {
    id: 'reaction-time',
    name: 'Tiempo de reacción',
    category: 'speed',
    description: 'Tocá en cuanto la pantalla cambie de color y evitá los señuelos.',
    version: '2.0.0',
    // "Tranquilo" no tiene sentido acá: el juego ES un reloj (ADR-007).
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
    }),
    estimatedSeconds: 30,
    icon,
  },
  Component: ReactionTimeGame,
};
