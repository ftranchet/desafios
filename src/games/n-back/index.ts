import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { NBackGame } from './ui';

export const nBack: GameModule = { metadata, Component: NBackGame };
export default nBack;
