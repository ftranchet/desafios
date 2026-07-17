import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

// Sin Progresivo, a propósito (ADR-007): como Cifras y Sudoku, es una ronda
// única de pensamiento, no un juego de rampa de 10 grados.

export const metadata: GameMetadata = {
  id: 'nonogram',
  name: 'Nonograma',
  category: 'logic',
  description: 'Pintá las celdas según las pistas numéricas hasta revelar el dibujo.',
  howToPlay:
    'Los números de cada fila y columna indican los bloques de celdas pintadas consecutivas. Deducí cuáles pintar hasta revelar el dibujo: cada toque cicla entre vacía, pintada y marca de descarte (×).',
  version: '1.0.0',
  modes: buildModes({ zen: true }),
  estimatedSeconds: 240,
  icon,
};
