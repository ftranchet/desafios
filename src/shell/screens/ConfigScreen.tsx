import { useState } from 'react';
import { storage } from '../../core/storage';
import { strings } from '../../i18n/es';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSettingsStore, type ThemePreference } from '../store/useSettingsStore';

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

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: strings.config.themeLight },
  { value: 'dark', label: strings.config.themeDark },
  { value: 'system', label: strings.config.themeSystem },
];

// Selector de tema (ADR-009): fila de 3 opciones exclusivas, mismo patrón
// accesible que el selector de dificultad (role group + aria-pressed).
function ThemeRow({
  value,
  onSelect,
}: {
  value: ThemePreference;
  onSelect(theme: ThemePreference): void;
}) {
  return (
    <div className="flex min-h-touch w-full items-center justify-between gap-3 rounded-lg border border-surface-alt bg-surface px-4 py-2 shadow-card">
      <span className="text-base text-text-primary">{strings.config.theme}</span>
      <div className="flex gap-1" role="group" aria-label={strings.config.theme}>
        {THEME_OPTIONS.map((option) => (
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
    </div>
  );
}

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
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleVibration = useSettingsStore((s) => s.toggleVibration);
  const toggleReduceAnimations = useSettingsStore((s) => s.toggleReduceAnimations);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [clearStep, setClearStep] = useState<'idle' | 'first' | 'final'>('idle');

  function handleClearConfirmed() {
    storage.clearAll();
    setClearStep('idle');
  }

  return (
    <div className="flex animate-fade-in flex-col gap-6 p-4">
      <h1 className="font-display text-xl font-extrabold text-text-primary">
        {strings.config.title}
      </h1>

      <div className="flex flex-col gap-2">
        <ThemeRow value={theme} onSelect={setTheme} />
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
