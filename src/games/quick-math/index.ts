import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { QuickMathGame } from './ui';

export const quickMath: GameModule = { metadata, Component: QuickMathGame };
export default quickMath;
