import { useState } from 'react';
import { storage } from '../../core/storage';
import { strings } from '../../i18n/es';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSettingsStore } from '../store/useSettingsStore';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle(): void;
}

function ToggleRow({ label, value, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      className="flex min-h-touch w-full items-center justify-between rounded-lg border border-surface-alt bg-surface px-4 text-left"
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

function exportData() {
  const json = storage.exportAll();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `desafios-mentales-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ConfigScreen() {
  const sound = useSettingsStore((s) => s.sound);
  const vibration = useSettingsStore((s) => s.vibration);
  const reduceAnimations = useSettingsStore((s) => s.reduceAnimations);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleVibration = useSettingsStore((s) => s.toggleVibration);
  const toggleReduceAnimations = useSettingsStore((s) => s.toggleReduceAnimations);

  const [clearStep, setClearStep] = useState<'idle' | 'first' | 'final'>('idle');

  function handleClearConfirmed() {
    storage.clearAll();
    setClearStep('idle');
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-display text-xl font-extrabold text-text-primary">
        {strings.config.title}
      </h1>

      <div className="flex flex-col gap-2">
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
          className="min-h-touch rounded-lg bg-surface-alt px-4 text-left text-base text-text-primary"
          onClick={exportData}
        >
          {strings.config.exportData}
        </button>
        <p className="text-xs text-text-secondary">{strings.config.exportDataHint}</p>
      </div>

      <button
        type="button"
        className="min-h-touch rounded-lg border border-accent-error px-4 text-left text-base text-accent-error"
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
    </div>
  );
}
