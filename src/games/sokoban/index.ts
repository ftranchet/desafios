import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SokobanGame } from './ui';

export const sokoban: GameModule = { metadata, Component: SokobanGame };
export default sokoban;
