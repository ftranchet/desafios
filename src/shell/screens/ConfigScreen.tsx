import { useState } from 'react';
import { MODE_LABELS } from '../../core/modes';
import { storage } from '../../core/storage';
import { strings } from '../../i18n/es';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  useSettingsStore,
  type DefaultDifficulty,
  type ThemePreference,
} from '../store/useSettingsStore';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle(): void;
}

function ToggleRow({ label, value, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      className="flex min-h-touch w-full items-center justify-between rounded-lg border border-surface-alt bg-surface px-4 text-left shadow-card transition active:scale-[0.98]"
      onClick={onToggle}
      role="switch"
      aria-checked={value}
    >
      <span className="text-base text-text-primary">{label}</span>
      <span className={value ? 'text-accent-success' : 'text-text-secondary'}>
        {value ? strings.common.on : strings.common.off}
      </span>
    </button>
  );
}

// Fila de opciones exclusivas (tema, dificultad por defecto): mismo patrón
// accesible que el selector de dificultad de la portada (group + aria-pressed).
// El label va arriba y las opciones abajo con wrap: cuatro opciones entran
// bien hasta en un celular angosto.
function SegmentedRow<T extends string>({
  label,
  hint,
  options,
  value,
  onSelect,
}: {
  label: string;
  hint?: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onSelect(value: T): void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-surface-alt bg-surface px-4 py-3 shadow-card">
      <span className="text-base text-text-primary">{label}</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onSelect(option.value)}
            className={`min-h-touch rounded-lg px-3 text-sm font-bold transition active:scale-95 ${
              value === option.value
                ? 'bg-accent-primary text-bg'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: strings.config.themeLight },
  { value: 'dark', label: strings.config.themeDark },
  { value: 'system', label: strings.config.themeSystem },
];

const DIFFICULTY_OPTIONS: Array<{ value: DefaultDifficulty; label: string }> = [
  { value: 'last', label: strings.config.defaultDifficultyLast },
  { value: 'easy', label: MODE_LABELS.easy },
  { value: 'medium', label: MODE_LABELS.medium },
  { value: 'hard', label: MODE_LABELS.hard },
];

const AUTHOR_LINKEDIN_URL = 'https://www.linkedin.com/in/ftranchet/';

function exportData() {
  const json = storage.exportAll();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `desafios-mentales-${new Date().toISOString().slice(0, 10)}.json`;
  // El enlace tiene que estar en el DOM para que el click sintético dispare la
  // descarga en Safari; revocar recién después de que el navegador la tomó.
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ConfigScreen() {
  const sound = useSettingsStore((s) => s.sound);
  const vibration = useSettingsStore((s) => s.vibration);
  const reduceAnimations = useSettingsStore((s) => s.reduceAnimations);
  const theme = useSettingsStore((s) => s.theme);
  const defaultDifficulty = useSettingsStore((s) => s.defaultDifficulty);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleVibration = useSettingsStore((s) => s.toggleVibration);
  const toggleReduceAnimations = useSettingsStore((s) => s.toggleReduceAnimations);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setDefaultDifficulty = useSettingsStore((s) => s.setDefaultDifficulty);

  const [clearStep, setClearStep] = useState<'idle' | 'first' | 'final'>('idle');

  function handleClearConfirmed() {
    storage.clearAll();
    setClearStep('idle');
  }

  return (
    <div className="flex animate-fade-in flex-col gap-6 p-4">
      <ScreenHeader title={strings.config.title} />

      <div className="flex flex-col gap-2">
        <SegmentedRow
          label={strings.config.theme}
          options={THEME_OPTIONS}
          value={theme}
          onSelect={setTheme}
        />
        <SegmentedRow
          label={strings.config.defaultDifficulty}
          hint={strings.config.defaultDifficultyHint}
          options={DIFFICULTY_OPTIONS}
          value={defaultDifficulty}
          onSelect={setDefaultDifficulty}
        />
        <ToggleRow label={strings.config.sound} value={sound} onToggle={toggleSound} />
        <ToggleRow label={strings.config.vibration} value={vibration} onToggle={toggleVibration} />
        <ToggleRow
          label={strings.config.reduceAnimations}
          value={reduceAnimations}
          onToggle={toggleReduceAnimations}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="min-h-touch rounded-lg bg-surface-alt px-4 text-left text-base text-text-primary transition active:scale-[0.98]"
          onClick={exportData}
        >
          {strings.config.exportData}
        </button>
        <p className="text-xs text-text-secondary">{strings.config.exportDataHint}</p>
      </div>

      <button
        type="button"
        className="min-h-touch rounded-lg border border-accent-error px-4 text-left text-base text-accent-error transition active:scale-[0.98]"
        onClick={() => setClearStep('first')}
      >
        {strings.config.clearData}
      </button>

      {clearStep === 'first' && (
        <ConfirmDialog
          title={strings.config.clearConfirmTitle}
          body={strings.config.clearConfirmBody}
          acceptLabel={strings.config.clearConfirmAccept}
          cancelLabel={strings.config.clearConfirmCancel}
          onAccept={() => setClearStep('final')}
          onCancel={() => setClearStep('idle')}
        />
      )}

      {clearStep === 'final' && (
        <ConfirmDialog
          title={strings.config.clearConfirmFinalTitle}
          body={strings.config.clearConfirmFinalBody}
          acceptLabel={strings.config.clearConfirmAccept}
          cancelLabel={strings.config.clearConfirmCancel}
          onAccept={handleClearConfirmed}
          onCancel={() => setClearStep('idle')}
        />
      )}

      <p className="text-center text-xs text-text-secondary">
        {strings.config.creditBefore}
        <a
          href={AUTHOR_LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold"
        >
          {strings.config.creditName}
        </a>
        {strings.config.creditAfter}
      </p>
    </div>
  );
}
