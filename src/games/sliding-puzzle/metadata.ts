import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'sliding-puzzle',
  name: 'Rompecabezas deslizante',
  category: 'spatial',
  description: 'Deslizá las fichas hacia el hueco hasta ordenarlas.',
  howToPlay:
    'Ordená las fichas deslizándolas hacia el hueco: tocá cualquier ficha vecina al espacio vacío para moverla. Cuando queden en orden, ganaste; menos movimientos es más puntaje.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
