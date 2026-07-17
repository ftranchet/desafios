import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { TriosGame } from './ui';

export const trios: GameModule = { metadata, Component: TriosGame };
export default trios;
