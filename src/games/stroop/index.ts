import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { StroopGame } from './ui';

export const stroop: GameModule = { metadata, Component: StroopGame };
export default stroop;
