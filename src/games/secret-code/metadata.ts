import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

export const metadata: GameMetadata = {
  id: 'secret-code',
  name: 'Código secreto',
  category: 'logic',
  description: 'Deducí el código secreto de dígitos a partir de las pistas de cada intento.',
  howToPlay:
    'Descubrí el código de dígitos distintos: proponé un intento y las pistas te dicen cuántos dígitos están en la posición correcta y cuántos existen pero en otro lugar. Deducilo antes de quedarte sin intentos.',
  version: '1.0.0',
  modes: buildModes({ zen: true, progressive: true }),
  estimatedSeconds: 150,
  icon,
};
