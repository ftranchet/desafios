import type { GameMode, ModeId } from '../../core/contract';
import { DIFFICULTY_MODE_IDS } from '../../core/modes';
import { strings } from '../../i18n/es';

// Selector de dificultad y modos (ADR-007): una fila de 3 dificultades y,
// debajo, los modos especiales que el juego declare (tarjetas con descripción).
// El shell no sabe qué significa cada modo: renderiza lo declarado.

interface ModePickerProps {
  modes: GameMode[];
  selectedMode: ModeId;
  onSelect(mode: ModeId): void;
  onPlay(): void;
}

export function ModePicker({ modes, selectedMode, onSelect, onPlay }: ModePickerProps) {
  const difficulties = modes.filter((m) =>
    (DIFFICULTY_MODE_IDS as readonly string[]).includes(m.id),
  );
  const specials = modes.filter((m) => !(DIFFICULTY_MODE_IDS as readonly string[]).includes(m.id));

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="font-display text-lg font-bold text-text-primary">
        {strings.modePicker.title}
      </h2>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <p className="text-sm text-text-secondary">{strings.modePicker.difficulty}</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={strings.modePicker.difficulty}>
          {difficulties.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={mode.id === selectedMode}
              className={`min-h-touch rounded-lg border px-3 text-sm font-medium transition-colors ${
                mode.id === selectedMode
                  ? 'border-accent-primary bg-accent-primary text-bg'
                  : 'border-surface-alt bg-surface text-text-primary hover:border-accent-primary/60'
              }`}
              onClick={() => onSelect(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {specials.length > 0 && (
        <div
          className="flex w-full max-w-sm flex-col gap-2"
          role="group"
          aria-label={strings.modePicker.special}
        >
          <p className="text-sm text-text-secondary">{strings.modePicker.special}</p>
          {specials.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={mode.id === selectedMode}
              className={`flex min-h-touch flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors ${
                mode.id === selectedMode
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-surface-alt bg-surface hover:border-accent-primary/60'
              }`}
              onClick={() => onSelect(mode.id)}
            >
              <span
                className={`text-sm font-semibold ${
                  mode.id === selectedMode ? 'text-accent-primary' : 'text-text-primary'
                }`}
              >
                {mode.label}
              </span>
              {mode.description && (
                <span className="text-xs text-text-secondary">{mode.description}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="min-h-touch rounded-lg bg-accent-primary px-8 font-display text-base font-bold text-bg"
        onClick={onPlay}
      >
        {strings.modePicker.play}
      </button>
    </div>
  );
}
