import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { MinisudokuGame } from './ui';

export const minisudoku: GameModule = { metadata, Component: MinisudokuGame };
export default minisudoku;
