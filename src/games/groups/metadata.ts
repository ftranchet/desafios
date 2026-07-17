import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'groups',
  name: 'Grupos',
  category: 'spatial',
  description: 'Tocá grupos de 2 o más fichas iguales conectadas para limpiarlas.',
  howToPlay:
    'Tocá grupos de 2 o más fichas iguales y conectadas para limpiarlas; las de arriba caen y las columnas se compactan. Cuantas más fichas saques en un mismo toque, más puntos: buscá los grupos grandes.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 120,
  icon,
};
