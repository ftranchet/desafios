import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'memory-match',
  name: 'Memorama',
  category: 'memory',
  description: 'Encontrá las parejas de cartas iguales dando vuelta de a dos.',
  howToPlay:
    'Las cartas están boca abajo: dá vuelta dos por turno buscando parejas iguales. Las que coinciden quedan descubiertas; las que no, se ocultan de nuevo — memorizá dónde estaba cada una. Menos intentos, más puntaje.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
