import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'stroop',
  name: 'Nombra el color',
  category: 'speed',
  description: 'Tocá el color en el que está pintada la palabra, no lo que dice.',
  howToPlay:
    'Vas a leer el nombre de un color pintado de otro color: tocá el botón de la tinta, no el de la palabra. Suena fácil hasta que el cerebro te traiciona — velocidad y precisión suman.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
