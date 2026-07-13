import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { MinesweeperGame } from './ui';

// Sin Progresivo, a propósito (ADR-007): como Sudoku, Nonograma y Empuja
// cajas, es una ronda única de pensamiento, no un juego de rampa de 10 grados.
export const minesweeper: GameModule = {
  metadata: {
    id: 'minesweeper',
    name: 'Buscaminas',
    category: 'logic',
    description: 'Descubrí todas las celdas sin minas, guiándote por los números vecinos.',
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
  Component: MinesweeperGame,
};
