import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { CoronasGame } from './ui';

export const coronas: GameModule = { metadata, Component: CoronasGame };
export default coronas;
