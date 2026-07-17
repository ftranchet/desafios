import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SchulteTableGame } from './ui';

export const schulteTable: GameModule = { metadata, Component: SchulteTableGame };
export default schulteTable;
