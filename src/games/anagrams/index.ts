import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { AnagramsGame } from './ui';

export const anagrams: GameModule = { metadata, Component: AnagramsGame };
export default anagrams;
