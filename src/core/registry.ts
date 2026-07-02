import type { GameModule } from './contract';
import { reactionTime } from '../games/reaction-time';
import { quickMath } from '../games/quick-math';
import { cifras } from '../games/cifras';

// Agregar un juego = importar y sumar una línea acá. Nada más (PRD sección 5.3).
export const GAMES: GameModule[] = [reactionTime, quickMath, cifras];

export function getGameById(id: string): GameModule | undefined {
  return GAMES.find((game) => game.metadata.id === id);
}
