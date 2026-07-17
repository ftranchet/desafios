import type { GameModule } from '../../core/contract';
import { metadata } from './metadata';
import { SnakeGame } from './ui';

export const snake: GameModule = { metadata, Component: SnakeGame };
export default snake;
