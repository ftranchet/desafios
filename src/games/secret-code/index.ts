import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SecretCodeGame } from './ui';

export const secretCode: GameModule = { metadata, Component: SecretCodeGame };
export default secretCode;
