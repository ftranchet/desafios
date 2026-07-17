import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'number-sequences',
  name: 'Secuencias numéricas',
  category: 'math',
  description: 'Detectá el patrón e indicá el siguiente término.',
  howToPlay:
    'Cada secuencia sigue un patrón oculto: descubrilo e ingresá el término que sigue con el teclado numérico (la tecla ± permite negativos). Confirmá con ✓ — o con Enter en escritorio — antes de que se acabe el tiempo.',
  version: '2.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 100,
  icon,
};
