import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { CifrasGame } from './ui';

export const cifras: GameModule = { metadata, Component: CifrasGame };
export default cifras;
