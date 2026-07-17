import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SlidingPuzzleGame } from './ui';

export const slidingPuzzle: GameModule = { metadata, Component: SlidingPuzzleGame };
export default slidingPuzzle;
