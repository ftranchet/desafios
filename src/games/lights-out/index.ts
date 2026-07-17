import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { LightsOutGame } from './ui';

export const lightsOut: GameModule = { metadata, Component: LightsOutGame };
export default lightsOut;
