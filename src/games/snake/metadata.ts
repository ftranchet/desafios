import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'snake',
  name: 'Snake',
  category: 'spatial',
  description: 'Comé y crecé sin chocarte contra las paredes, obstáculos o vos mismo.',
  howToPlay:
    'Llevá a la víbora hasta la comida: con cada bocado crece y acelera, y la partida termina si choca contra una pared, un obstáculo o su propio cuerpo. Mantené el dedo sobre el tablero y te sigue; también funcionan el D-pad en pantalla y las flechas del teclado.',
  version: '2.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 60,
  icon,
};
