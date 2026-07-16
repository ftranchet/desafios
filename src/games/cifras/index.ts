import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS } from './logic';
import { CifrasGame } from './ui';

export const cifras: GameModule = {
  metadata: {
    id: 'cifras',
    name: 'Cifras',
    category: 'math',
    description: 'Combiná 6 números con las 4 operaciones para llegar al objetivo.',
    howToPlay:
      'Combiná los 6 números con las cuatro operaciones para acercarte al objetivo de tres cifras: elegí dos fichas y una operación, y el resultado se vuelve una ficha nueva. No hace falta usar todos los números, y llegar exacto vale más.',
    version: '2.0.0',
    // Sin Progresivo a propósito: Cifras es una ronda única de pensamiento,
    // no un juego de rampa — los modos se declaran donde tienen sentido (ADR-007).
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
    }),
    estimatedSeconds: 75,
    icon,
  },
  Component: CifrasGame,
};
