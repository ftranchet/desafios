import type { GameMetadata } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';

// Sin Progresivo, a propósito (ADR-007): como Cifras, Sudoku y Nonograma, es
// una ronda única de pensamiento sobre un nivel curado, no un juego de rampa
// de 10 grados. Nombre original (PRD 11.2): "Sokoban" es una marca asociada
// históricamente a Thinking Rabbit; se usa un nombre descriptivo en español.

export const metadata: GameMetadata = {
  id: 'sokoban',
  name: 'Empuja cajas',
  category: 'logic',
  description: 'Empujá las cajas hasta que todas queden sobre su objetivo.',
  howToPlay:
    'Empujá cada caja hasta dejarla sobre su objetivo: solo podés empujar (nunca tirar) y de a una por vez. Si te encerrás, reiniciá el nivel con el botón; resolverlo cerca del óptimo de movimientos vale más.',
  version: '1.0.0',
  modes: buildModes({ zen: true }),
  estimatedSeconds: 150,
  icon,
};
