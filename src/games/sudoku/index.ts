import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { SudokuGame } from './ui';

// Sin Progresivo, a propósito (ADR-007): como Cifras, es una ronda única de
// pensamiento, no un juego de rampa de 10 grados.
export const sudoku: GameModule = {
  metadata: {
    id: 'sudoku',
    name: 'Sudoku',
    category: 'logic',
    description: 'El clásico 9×9: completá la grilla sin repetir número en fila, columna o caja.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
    }),
    estimatedSeconds: 300,
    icon,
  },
  Component: SudokuGame,
};
