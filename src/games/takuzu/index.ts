import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { TakuzuGame } from './ui';

export const takuzu: GameModule = { metadata, Component: TakuzuGame };
export default takuzu;
