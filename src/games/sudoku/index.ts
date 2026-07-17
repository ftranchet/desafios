import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SudokuGame } from './ui';

export const sudoku: GameModule = { metadata, Component: SudokuGame };
export default sudoku;
