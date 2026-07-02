import type { DifficultyLevel, GameModule } from '../../core/contract';
import icon from './icon.svg';
import { LEVEL_LABELS, LEVEL_PARAMS } from './logic';
import { NumberSequencesGame } from './ui';

// DifficultyLevel.params solo admite valores primitivos (contrato, sección 5.2);
// `patternTypes` (array) se serializa a texto acá. La lógica real usa LEVEL_PARAMS.
const levels: DifficultyLevel[] = ([1, 2, 3, 4, 5] as const).map((level) => {
  const params = LEVEL_PARAMS[level];
  return {
    level,
    label: LEVEL_LABELS[level],
    params: {
      patternTypes: params.patternTypes.join(','),
      termCount: params.termCount,
      secondsPerQuestion: params.secondsPerQuestion,
      questionCount: params.questionCount,
    },
  };
});

export const numberSequences: GameModule = {
  metadata: {
    id: 'number-sequences',
    name: 'Secuencias numéricas',
    category: 'math',
    description: 'Detectá el patrón e indicá el siguiente término.',
    version: '1.0.0',
    levels,
    estimatedSeconds: 80,
    icon,
  },
  Component: NumberSequencesGame,
};
