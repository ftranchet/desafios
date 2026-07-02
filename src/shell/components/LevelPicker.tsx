import type { DifficultyLevel } from '../../core/contract';
import { strings } from '../../i18n/es';

interface LevelPickerProps {
  levels: DifficultyLevel[];
  selectedLevel: number;
  onSelect(level: number): void;
  onPlay(): void;
}

export function LevelPicker({ levels, selectedLevel, onSelect, onPlay }: LevelPickerProps) {
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="font-display text-lg font-bold text-text-primary">
        {strings.levelPicker.title}
      </h2>
      <div className="flex flex-wrap justify-center gap-2">
        {levels.map((level) => (
          <button
            key={level.level}
            type="button"
            className={`min-h-touch min-w-touch rounded-lg border px-3 text-sm font-medium transition-colors ${
              level.level === selectedLevel
                ? 'border-accent-primary bg-accent-primary text-bg'
                : 'border-surface-alt bg-surface text-text-primary hover:border-accent-primary/60'
            }`}
            onClick={() => onSelect(level.level)}
          >
            {level.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="min-h-touch rounded-lg bg-accent-primary px-8 font-display text-base font-bold text-bg"
        onClick={onPlay}
      >
        {strings.levelPicker.play}
      </button>
    </div>
  );
}
