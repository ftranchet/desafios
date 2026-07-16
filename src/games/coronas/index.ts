import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { CoronasGame } from './ui';

// Sin Progresivo, a propósito (ADR-007): como Sudoku/Nonograma, es una ronda
// única de pensamiento, no un juego de rampa de 10 grados.
export const coronas: GameModule = {
  metadata: {
    id: 'coronas',
    name: 'Coronas',
    category: 'logic',
    description: 'Una corona por fila, columna y región de color, sin que se toquen entre sí.',
    howToPlay:
      'Colocá exactamente una corona por fila, columna y región de color, sin que dos coronas se toquen ni siquiera en diagonal. Cada toque cicla la celda: vacía, marca de descarte (×), corona. Una sola solución posible.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
    }),
    estimatedSeconds: 180,
    icon,
  },
  Component: CoronasGame,
};
