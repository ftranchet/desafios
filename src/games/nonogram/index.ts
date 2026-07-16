import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { NonogramGame } from './ui';

// Sin Progresivo, a propósito (ADR-007): como Cifras y Sudoku, es una ronda
// única de pensamiento, no un juego de rampa de 10 grados.
export const nonogram: GameModule = {
  metadata: {
    id: 'nonogram',
    name: 'Nonograma',
    category: 'logic',
    description: 'Pintá las celdas según las pistas numéricas hasta revelar el dibujo.',
    howToPlay:
      'Los números de cada fila y columna indican los bloques de celdas pintadas consecutivas. Deducí cuáles pintar hasta revelar el dibujo: cada toque cicla entre vacía, pintada y marca de descarte (×).',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
    }),
    estimatedSeconds: 240,
    icon,
  },
  Component: NonogramGame,
};
