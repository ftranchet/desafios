import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'n-back',
  name: '¿Coincide?',
  category: 'memory',
  description: 'Decidí si el símbolo actual es igual al de N lugares atrás.',
  howToPlay:
    'Los símbolos pasan de a uno: decidí si el actual coincide con el que apareció N lugares atrás, con los botones Coincide / No coincide. N sube con la dificultad — el desafío es sostener la memoria en movimiento.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 90,
  icon,
};
