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
import { wordOfTheDay } from '../games/word-of-the-day';
import { memoryMatch } from '../games/memory-match';
import { hanoiTowers } from '../games/hanoi-towers';
import { lightsOut } from '../games/lights-out';
import { sudoku } from '../games/sudoku';
import { nonogram } from '../games/nonogram';
import { anagrams } from '../games/anagrams';
import { stroop } from '../games/stroop';
import { slidingPuzzle } from '../games/sliding-puzzle';
import { trios } from '../games/trios';
import { nBack } from '../games/n-back';
import { sokoban } from '../games/sokoban';

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
  wordOfTheDay,
  memoryMatch,
  hanoiTowers,
  lightsOut,
  sudoku,
  nonogram,
  anagrams,
  stroop,
  slidingPuzzle,
  trios,
  nBack,
  sokoban,
];

export function getGameById(id: string): GameModule | undefined {
  return GAMES.find((game) => game.metadata.id === id);
}
