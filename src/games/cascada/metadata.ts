import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'cascada',
  name: 'Cascada',
  category: 'spatial',
  description: 'Encajá las piezas que caen y completá líneas.',
  howToPlay:
    'Acomodá las piezas que caen para completar líneas horizontales: cada línea llena se limpia y suma puntos, y la caída se va acelerando. Arrastrá para mover, tocá para rotar y dale un envión hacia abajo para soltar la pieza; también sirven los botones en pantalla o las flechas del teclado.',
  version: '2.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 120,
  icon,
};
