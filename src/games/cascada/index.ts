import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { CascadaGame } from './ui';

export const cascada: GameModule = { metadata, Component: CascadaGame };
export default cascada;
