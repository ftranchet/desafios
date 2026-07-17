import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { GroupsGame } from './ui';

export const groups: GameModule = { metadata, Component: GroupsGame };
export default groups;
