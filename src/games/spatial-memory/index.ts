import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SpatialMemoryGame } from './ui';

export const spatialMemory: GameModule = { metadata, Component: SpatialMemoryGame };
export default spatialMemory;
