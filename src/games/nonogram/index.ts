import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { NonogramGame } from './ui';

export const nonogram: GameModule = { metadata, Component: NonogramGame };
export default nonogram;
