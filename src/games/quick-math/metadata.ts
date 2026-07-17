import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'quick-math',
  name: 'Aritmética contra reloj',
  category: 'math',
  description: 'Resolvé operaciones antes de que se acabe el tiempo.',
  howToPlay:
    'Resolvé la operación y escribí el resultado con el teclado numérico antes de que se agote la barra de tiempo; confirmá con ✓. En escritorio podés tipear los dígitos y confirmar con Enter.',
  version: '2.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 120,
  icon,
};
