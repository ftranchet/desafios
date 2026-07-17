import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'schulte-table',
  name: 'Tabla de Schulte',
  category: 'speed',
  description: 'Tocá los números de la grilla en orden ascendente, lo más rápido posible.',
  howToPlay:
    'Los números están desparramados por la grilla: tocalos en orden ascendente lo más rápido que puedas. Cada acierto suena un tono más agudo; menos tiempo es más puntaje.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 60,
  icon,
};
