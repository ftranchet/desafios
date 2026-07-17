import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { ReactionTimeGame } from './ui';

export const reactionTime: GameModule = { metadata, Component: ReactionTimeGame };
export default reactionTime;
