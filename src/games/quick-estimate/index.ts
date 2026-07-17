import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { QuickEstimateGame } from './ui';

export const quickEstimate: GameModule = { metadata, Component: QuickEstimateGame };
export default quickEstimate;
