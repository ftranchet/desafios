import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { HanoiTowersGame } from './ui';

export const hanoiTowers: GameModule = { metadata, Component: HanoiTowersGame };
export default hanoiTowers;
