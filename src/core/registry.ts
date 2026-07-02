import type { GameModule } from './contract';
import { reactionTime } from '../games/reaction-time';

// Agregar un juego = importar y sumar una línea acá. Nada más (PRD sección 5.3).
export const GAMES: GameModule[] = [reactionTime];

export function getGameById(id: string): GameModule | undefined {
  return GAMES.find((game) => game.metadata.id === id);
}
