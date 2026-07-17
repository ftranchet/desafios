import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { MemoryMatchGame } from './ui';

export const memoryMatch: GameModule = { metadata, Component: MemoryMatchGame };
export default memoryMatch;
