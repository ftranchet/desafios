import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'anagrams',
  name: 'Anagramas',
  category: 'words',
  description: 'Reordená las fichas de letras hasta formar la palabra oculta.',
  howToPlay:
    'Las letras de la palabra están desordenadas: tocá las fichas en orden para armarla en los casilleros. Si te trabás, tocá un casillero para devolver esa letra a la bandeja y probá otro camino.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 120,
  icon,
};
