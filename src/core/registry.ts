import type { GameDefinition, GameMetadata, GameModule } from './contract';
import { metadata as reactionTimeMetadata } from '../games/reaction-time/metadata';
import { metadata as quickMathMetadata } from '../games/quick-math/metadata';
import { metadata as cifrasMetadata } from '../games/cifras/metadata';
import { metadata as snakeMetadata } from '../games/snake/metadata';
import { metadata as cascadaMetadata } from '../games/cascada/metadata';
import { metadata as numberSequencesMetadata } from '../games/number-sequences/metadata';
import { metadata as quickEstimateMetadata } from '../games/quick-estimate/metadata';
import { metadata as simonMetadata } from '../games/simon/metadata';
import { metadata as secretCodeMetadata } from '../games/secret-code/metadata';
import { metadata as spatialMemoryMetadata } from '../games/spatial-memory/metadata';
import { metadata as schulteTableMetadata } from '../games/schulte-table/metadata';
import { metadata as wordOfTheDayMetadata } from '../games/word-of-the-day/metadata';
import { metadata as memoryMatchMetadata } from '../games/memory-match/metadata';
import { metadata as hanoiTowersMetadata } from '../games/hanoi-towers/metadata';
import { metadata as lightsOutMetadata } from '../games/lights-out/metadata';
import { metadata as sudokuMetadata } from '../games/sudoku/metadata';
import { metadata as nonogramMetadata } from '../games/nonogram/metadata';
import { metadata as anagramsMetadata } from '../games/anagrams/metadata';
import { metadata as stroopMetadata } from '../games/stroop/metadata';
import { metadata as slidingPuzzleMetadata } from '../games/sliding-puzzle/metadata';
import { metadata as triosMetadata } from '../games/trios/metadata';
import { metadata as nBackMetadata } from '../games/n-back/metadata';
import { metadata as sokobanMetadata } from '../games/sokoban/metadata';
import { metadata as minesweeperMetadata } from '../games/minesweeper/metadata';
import { metadata as groupsMetadata } from '../games/groups/metadata';
import { metadata as minisudokuMetadata } from '../games/minisudoku/metadata';
import { metadata as coronasMetadata } from '../games/coronas/metadata';
import { metadata as takuzuMetadata } from '../games/takuzu/metadata';
// new-game:metadata-imports

function defineGame(metadata: GameMetadata, load: () => Promise<GameModule>): GameDefinition {
  for (const mode of metadata.modes) Object.freeze(mode);
  Object.freeze(metadata.modes);
  return Object.freeze({ metadata: Object.freeze(metadata), load });
}

// El catálogo importa solo metadatos y assets pequeños. La UI y la lógica de
// cada juego quedan en chunks separados y se evalúan recién al abrir su ruta.
export const GAMES: readonly GameDefinition[] = Object.freeze([
  defineGame(reactionTimeMetadata, () =>
    import('../games/reaction-time').then(({ default: game }) => game),
  ),
  defineGame(quickMathMetadata, () =>
    import('../games/quick-math').then(({ default: game }) => game),
  ),
  defineGame(cifrasMetadata, () => import('../games/cifras').then(({ default: game }) => game)),
  defineGame(snakeMetadata, () => import('../games/snake').then(({ default: game }) => game)),
  defineGame(cascadaMetadata, () => import('../games/cascada').then(({ default: game }) => game)),
  defineGame(numberSequencesMetadata, () =>
    import('../games/number-sequences').then(({ default: game }) => game),
  ),
  defineGame(quickEstimateMetadata, () =>
    import('../games/quick-estimate').then(({ default: game }) => game),
  ),
  defineGame(simonMetadata, () => import('../games/simon').then(({ default: game }) => game)),
  defineGame(secretCodeMetadata, () =>
    import('../games/secret-code').then(({ default: game }) => game),
  ),
  defineGame(spatialMemoryMetadata, () =>
    import('../games/spatial-memory').then(({ default: game }) => game),
  ),
  defineGame(schulteTableMetadata, () =>
    import('../games/schulte-table').then(({ default: game }) => game),
  ),
  defineGame(wordOfTheDayMetadata, () =>
    import('../games/word-of-the-day').then(({ default: game }) => game),
  ),
  defineGame(memoryMatchMetadata, () =>
    import('../games/memory-match').then(({ default: game }) => game),
  ),
  defineGame(hanoiTowersMetadata, () =>
    import('../games/hanoi-towers').then(({ default: game }) => game),
  ),
  defineGame(lightsOutMetadata, () =>
    import('../games/lights-out').then(({ default: game }) => game),
  ),
  defineGame(sudokuMetadata, () => import('../games/sudoku').then(({ default: game }) => game)),
  defineGame(nonogramMetadata, () =>
    import('../games/nonogram').then(({ default: game }) => game),
  ),
  defineGame(anagramsMetadata, () =>
    import('../games/anagrams').then(({ default: game }) => game),
  ),
  defineGame(stroopMetadata, () => import('../games/stroop').then(({ default: game }) => game)),
  defineGame(slidingPuzzleMetadata, () =>
    import('../games/sliding-puzzle').then(({ default: game }) => game),
  ),
  defineGame(triosMetadata, () => import('../games/trios').then(({ default: game }) => game)),
  defineGame(nBackMetadata, () => import('../games/n-back').then(({ default: game }) => game)),
  defineGame(sokobanMetadata, () => import('../games/sokoban').then(({ default: game }) => game)),
  defineGame(minesweeperMetadata, () =>
    import('../games/minesweeper').then(({ default: game }) => game),
  ),
  defineGame(groupsMetadata, () => import('../games/groups').then(({ default: game }) => game)),
  defineGame(minisudokuMetadata, () =>
    import('../games/minisudoku').then(({ default: game }) => game),
  ),
  defineGame(coronasMetadata, () => import('../games/coronas').then(({ default: game }) => game)),
  defineGame(takuzuMetadata, () => import('../games/takuzu').then(({ default: game }) => game)),
  // new-game:entries
]);

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.metadata.id === id);
}
