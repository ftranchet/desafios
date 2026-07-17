import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { WordOfTheDayGame } from './ui';

export const wordOfTheDay: GameModule = { metadata, Component: WordOfTheDayGame };
export default wordOfTheDay;
