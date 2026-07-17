import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { MinesweeperGame } from './ui';

export const minesweeper: GameModule = { metadata, Component: MinesweeperGame };
export default minesweeper;
