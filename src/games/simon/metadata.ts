import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'simon',
  name: 'Simon',
  category: 'memory',
  description: 'Repetí la secuencia de colores, que crece una ronda a la vez.',
  howToPlay:
    'Mirá (y escuchá) la secuencia de pads que se encienden, y repetila tocándolos en el mismo orden. Cada ronda agrega un paso; un error termina la partida. En escritorio, las teclas 1-4 tocan los pads en orden de lectura.',
  version: '2.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 60,
  icon,
};
