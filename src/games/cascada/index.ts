import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { CascadaGame } from './ui';

export const cascada: GameModule = {
  metadata: {
    id: 'cascada',
    name: 'Cascada',
    category: 'spatial',
    description: 'Encajá las piezas que caen y completá líneas.',
    howToPlay:
      'Acomodá las piezas que caen para completar líneas horizontales: cada línea llena se limpia y suma puntos, y la caída se va acelerando. Arrastrá para mover, tocá para rotar y dale un envión hacia abajo para soltar la pieza; también sirven los botones en pantalla o las flechas del teclado.',
    version: '2.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: MODE_PARAMS.progressive,
    }),
    estimatedSeconds: 120,
    icon,
  },
  Component: CascadaGame,
};
