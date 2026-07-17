import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

// Sin Progresivo, a propósito (ADR-007): como Sudoku, es una ronda única de
// pensamiento, no un juego de rampa de 10 grados.

export const metadata: GameMetadata = {
  id: 'minisudoku',
  name: 'Minisudoku',
  category: 'logic',
  description: 'Sudoku 6×6: completá la grilla sin repetir número en fila, columna o caja.',
  howToPlay:
    'Completá la grilla 6×6 sin repetir del 1 al 6 en fila, columna ni caja de 2×3. Tocá una celda vacía y elegí el dígito en el teclado; cada tablero tiene una única solución. Ideal para una partida corta.',
  version: '1.0.0',
  modes: buildModes({ zen: true }),
  estimatedSeconds: 150,
  icon,
};
