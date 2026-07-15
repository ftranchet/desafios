import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { TakuzuGame } from './ui';

export const takuzu: GameModule = {
  metadata: {
    id: 'takuzu',
    name: 'Sol y luna',
    category: 'logic',
    description: 'Completá la grilla de soles y lunas siguiendo las pistas de igualdad y diferencia.',
    version: '0.1.0',
    // Tranquilo: nivel medio, sin puntaje por eficiencia. Sin Progresivo, a
    // propósito: como Sudoku/Nonograma/Minisudoku/Coronas, es una ronda
    // única de pensamiento sobre una grilla fija, no una rampa de 10 grados.
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
    }),
    estimatedSeconds: 180,
    icon,
  },
  Component: TakuzuGame,
};
