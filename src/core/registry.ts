import type { GameModule } from './contract';
import { reactionTime } from '../games/reaction-time';
import { quickMath } from '../games/quick-math';
import { cifras } from '../games/cifras';
import { snake } from '../games/snake';
import { cascada } from '../games/cascada';
import { numberSequences } from '../games/number-sequences';
import { quickEstimate } from '../games/quick-estimate';
import { simon } from '../games/simon';
import { secretCode } from '../games/secret-code';
import { spatialMemory } from '../games/spatial-memory';
import { schulteTable } from '../games/schulte-table';

// Agregar un juego = importar y sumar una línea acá. Nada más (PRD sección 5.3).
export const GAMES: GameModule[] = [
  reactionTime,
  quickMath,
  cifras,
  snake,
  cascada,
  numberSequences,
  quickEstimate,
  simon,
  secretCode,
  spatialMemory,
  schulteTable,
];

export function getGameById(id: string): GameModule | undefined {
  return GAMES.find((game) => game.metadata.id === id);
}
