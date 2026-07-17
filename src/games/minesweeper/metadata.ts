import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

// Sin Progresivo, a propósito (ADR-007): como Sudoku, Nonograma y Empuja
// cajas, es una ronda única de pensamiento, no un juego de rampa de 10 grados.

export const metadata: GameMetadata = {
  id: 'minesweeper',
  name: 'Buscaminas',
  category: 'logic',
  description: 'Descubrí todas las celdas sin minas, guiándote por los números vecinos.',
  howToPlay:
    'Destapá todas las celdas que no tienen mina: cada número te dice cuántas minas hay alrededor. Activá el modo bandera para marcar las minas sospechadas sin destaparlas. El primer toque siempre es seguro.',
  version: '1.0.0',
  modes: buildModes({ zen: true }),
  estimatedSeconds: 150,
  icon,
};
