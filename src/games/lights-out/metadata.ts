import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

// Nombre original (11.2): el juguete electrónico "Lights Out" de Tiger
// Electronics es una marca registrada; la mecánica se llama acá "Apagá todo".

export const metadata: GameMetadata = {
  id: 'lights-out',
  name: 'Apagá todo',
  category: 'logic',
  description: 'Tocá las celdas para apagar toda la grilla: cada toque prende o apaga vecinas.',
  howToPlay:
    'Apagá toda la grilla: cada toque invierte esa celda y sus vecinas. A veces prender unas cuantas es el único camino para apagar todo — planificá. Menos toques, más puntaje.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
