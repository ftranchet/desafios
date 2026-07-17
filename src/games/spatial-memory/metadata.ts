import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'spatial-memory',
  name: 'Memoria espacial',
  category: 'memory',
  description: 'Memorizá y repetí la secuencia de celdas que se van iluminando.',
  howToPlay:
    'Las celdas se iluminan en secuencia: memorizala y repetila tocándolas en el mismo orden. Cada ronda suma un paso más; un error termina la partida. En escritorio, las teclas numéricas tocan las celdas en orden de lectura.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
