import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'trios',
  name: 'Tríos',
  category: 'logic',
  description: 'Encontrá 3 cartas cuyos atributos sean siempre iguales o siempre distintos.',
  howToPlay:
    'Elegí 3 cartas que formen un trío válido: en cada atributo, las tres tienen que ser todas iguales o todas distintas. Si el trío no vale, la selección se limpia y probás de nuevo.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 150,
  icon,
};
