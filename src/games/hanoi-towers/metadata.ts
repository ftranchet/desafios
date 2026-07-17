import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'hanoi-towers',
  name: 'Torres de Hanoi',
  category: 'logic',
  description: 'Mové toda la torre de discos al último poste en el mínimo de movimientos.',
  howToPlay:
    'Mové la torre completa al último poste: un disco por vez, y nunca uno grande sobre uno más chico. Tocá un poste para levantar su disco de arriba y otro para apoyarlo; cuanto más cerca del óptimo de movimientos, mejor puntaje.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
