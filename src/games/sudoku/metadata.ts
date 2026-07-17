import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

// Sin Progresivo, a propósito (ADR-007): como Cifras, es una ronda única de
// pensamiento, no un juego de rampa de 10 grados.

export const metadata: GameMetadata = {
  id: 'sudoku',
  name: 'Sudoku',
  category: 'logic',
  description: 'El clásico 9×9: completá la grilla sin repetir número en fila, columna o caja.',
  howToPlay:
    'Completá la grilla 9×9 sin repetir número en fila, columna ni caja de 3×3. Tocá una celda vacía y elegí el dígito en el teclado de abajo; cada tablero tiene una única solución.',
  version: '1.0.0',
  modes: buildModes({ zen: true }),
  estimatedSeconds: 300,
  icon,
};
