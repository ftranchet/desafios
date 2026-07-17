import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'takuzu',
  name: 'Sol y luna',
  category: 'logic',
  description:
    'Completá la grilla de soles y lunas siguiendo las pistas de igualdad y diferencia.',
  howToPlay:
    'Completá la grilla con soles y lunas: tres de cada uno por fila y columna, nunca tres iguales seguidos y sin filas ni columnas repetidas. Las pistas = y × indican si dos celdas vecinas llevan el mismo símbolo o distinto. Cada toque cicla: vacía, sol, luna.',
  version: '0.1.0',
  // Tranquilo: nivel medio, sin puntaje por eficiencia. Sin Progresivo, a
  // propósito: como Sudoku/Nonograma/Minisudoku/Coronas, es una ronda
  // única de pensamiento sobre una grilla fija, no una rampa de 10 grados.
  modes: buildModes({ zen: true }),
  estimatedSeconds: 180,
  icon,
};
