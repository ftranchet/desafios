import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SimonGame } from './ui';

export const simon: GameModule = { metadata, Component: SimonGame };
export default simon;
