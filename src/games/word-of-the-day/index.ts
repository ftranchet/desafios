import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS } from './logic';
import { WordOfTheDayGame } from './ui';

export const wordOfTheDay: GameModule = {
  metadata: {
    id: 'word-of-the-day',
    name: 'Palabra del día',
    category: 'words',
    description: 'Adiviná la palabra secreta: cada intento te dice qué letras acertaste.',
    version: '1.0.0',
    modes: buildModes({
      easy: MODE_PARAMS.easy,
      medium: MODE_PARAMS.medium,
      hard: MODE_PARAMS.hard,
      zen: MODE_PARAMS.zen,
      progressive: PROGRESSIVE_PARAMS,
    }),
    estimatedSeconds: 150,
    icon,
  },
  Component: WordOfTheDayGame,
};
