import { strings } from '../../i18n/es';

interface ConfirmDialogProps {
  title: string;
  body: string;
  acceptLabel?: string;
  cancelLabel?: string;
  onAccept(): void;
  onCancel(): void;
}

export function ConfirmDialog({
  title,
  body,
  acceptLabel = strings.common.confirm,
  cancelLabel = strings.common.cancel,
  onAccept,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-xs rounded-xl border border-surface-alt bg-surface p-5 shadow-lg">
        <h2 id="confirm-dialog-title" className="mb-2 font-display text-base font-bold text-text-primary">
          {title}
        </h2>
        <p className="mb-5 text-sm text-text-secondary">{body}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="min-h-touch rounded-lg bg-accent-error px-4 font-body text-base font-semibold text-bg"
            onClick={onAccept}
          >
            {acceptLabel}
          </button>
          <button
            type="button"
            className="min-h-touch rounded-lg bg-surface-alt px-4 font-body text-base text-text-primary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
