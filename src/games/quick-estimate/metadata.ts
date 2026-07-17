import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'quick-estimate',
  name: 'Estimación relámpago',
  category: 'math',
  description: 'Elegí rápido cuál de las dos expresiones vale más.',
  howToPlay:
    'Aparecen dos expresiones: tocá rápido la que valga más. No hace falta calcular exacto — estimar alcanza, y el reloj no espera.',
  version: '2.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 60,
  icon,
};
