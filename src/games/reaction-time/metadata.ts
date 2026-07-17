import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'reaction-time',
  name: 'Tiempo de reacción',
  category: 'speed',
  description: 'Tocá en cuanto la pantalla cambie de color y evitá los señuelos.',
  howToPlay:
    'Esperá atento y tocá la pantalla apenas aparezca la señal objetivo — pero quedate quieto ante los señuelos que se le parecen. Reaccionar más rápido vale más puntos; adelantarse o caer en un señuelo, los cuesta.',
  version: '2.0.0',
  // "Tranquilo" no tiene sentido acá: el juego ES un reloj (ADR-007).
  modes: buildModes(),
  estimatedSeconds: 30,
  icon,
};
