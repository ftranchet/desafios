import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { MinisudokuGame } from './ui';

// Sin Progresivo, a propósito (ADR-007): como Sudoku, es una ronda única de
// pensamiento, no un juego de rampa de 10 grados.
export const minisudoku: GameModule = {
  metadata: {
    id: 'minisudoku',
    name: 'Minisudoku',
    category: 'logic',
    description: 'Sudoku 6×6: completá la grilla sin repetir número en fila, columna o caja.',
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
  Component: MinisudokuGame,
};
