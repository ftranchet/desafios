import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { QuickMathGame } from './ui';

// DifficultyLevel.params solo admite valores primitivos (contrato, sección 5.2);
// `operations` (array) se serializa a texto acá. La lógica real usa LEVEL_PARAMS.
const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => {
  const params = LEVEL_PARAMS[level];
  return {
    level,
    label: LEVEL_LABELS[level],
    params: {
      operations: params.operations.join(','),
      addSubMin: params.addSubMin,
      addSubMax: params.addSubMax,
      mulDivMax: params.mulDivMax,
      secondsPerQuestion: params.secondsPerQuestion,
      questionCount: params.questionCount,
    },
  };
});

export const quickMath: GameModule = {
  metadata: {
    id: 'quick-math',
    name: 'Aritmética contra reloj',
    category: 'math',
    description: 'Resolvé operaciones antes de que se acabe el tiempo.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 90,
    icon,
  },
  Component: QuickMathGame,
};
