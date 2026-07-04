import type { GameModule } from '../../core/contract';
import { buildModes } from '../../core/modes';
import icon from './icon.svg';
import { MODE_PARAMS, PROGRESSIVE_PARAMS, type ModeParams } from './logic';
import { NumberSequencesGame } from './ui';

// GameMode.params solo admite valores primitivos (contrato, sección 5.2);
// `patternTypes` (array) se serializa a texto acá. La lógica usa MODE_PARAMS.
function toMeta(params: ModeParams) {
  return { ...params, patternTypes: params.patternTypes.join(',') };
}

export const numberSequences: GameModule = {
  metadata: {
    id: 'number-sequences',
    name: 'Secuencias numéricas',
    category: 'math',
    description: 'Detectá el patrón e indicá el siguiente término.',
    version: '2.0.0',
    modes: buildModes({
      easy: toMeta(MODE_PARAMS.easy),
      medium: toMeta(MODE_PARAMS.medium),
      hard: toMeta(MODE_PARAMS.hard),
      zen: toMeta(MODE_PARAMS.zen),
      progressive: toMeta(PROGRESSIVE_PARAMS),
    }),
    estimatedSeconds: 100,
    icon,
  },
  Component: NumberSequencesGame,
};
