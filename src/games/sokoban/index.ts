import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { SokobanGame } from './ui';

// Sin Progresivo, a propósito (ADR-007): como Cifras, Sudoku y Nonograma, es
// una ronda única de pensamiento sobre un nivel curado, no un juego de rampa
// de 10 grados. Nombre original (PRD 11.2): "Sokoban" es una marca asociada
// históricamente a Thinking Rabbit; se usa un nombre descriptivo en español.
export const sokoban: GameModule = {
  metadata: {
    id: 'sokoban',
    name: 'Empuja cajas',
    category: 'logic',
    description: 'Empujá las cajas hasta que todas queden sobre su objetivo.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
    }),
    estimatedSeconds: 150,
    icon,
  },
  Component: SokobanGame,
};
