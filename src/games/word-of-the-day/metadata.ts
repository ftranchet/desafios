import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'word-of-the-day',
  name: 'Palabra del día',
  category: 'words',
  description: 'Adiviná la palabra secreta: cada intento te dice qué letras acertaste.',
  howToPlay:
    'Adiviná la palabra secreta antes de quedarte sin intentos. Después de cada intento, cada letra te indica si está en el lugar correcto, si existe en otra posición o si no aparece en la palabra.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 150,
  icon,
};
