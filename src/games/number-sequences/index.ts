import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { NumberSequencesGame } from './ui';

export const numberSequences: GameModule = { metadata, Component: NumberSequencesGame };
export default numberSequences;
