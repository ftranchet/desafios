import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent } from 'react';
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
  const acceptRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  // El foco entra al diálogo al abrirse — sobre Cancelar, la opción segura:
  // un Enter/Espacio apurado no dispara la acción destructiva.
  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    return () => {
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  // Escape cancela; Tab circula solo entre los dos botones (trampa de foco:
  // el contenido de fondo no es alcanzable mientras el diálogo está abierto).
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const next = document.activeElement === cancelRef.current ? acceptRef : cancelRef;
      next.current?.focus();
    }
  }

  // Tocar el fondo oscurecido también cancela (gesto estándar en móvil).
  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xs animate-fade-in rounded-xl border border-surface-alt bg-surface p-5 shadow-raised">
        <h2
          id={titleId}
          className="mb-2 font-display text-base font-bold text-text-primary"
        >
          {title}
        </h2>
        <p id={bodyId} className="mb-5 text-sm text-text-secondary">
          {body}
        </p>
        <div className="flex flex-col gap-2">
          <button
            ref={acceptRef}
            type="button"
            className="min-h-touch rounded-lg bg-accent-error px-4 font-body text-base font-semibold text-bg transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            onClick={onAccept}
          >
            {acceptLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            className="min-h-touch rounded-lg bg-surface-alt px-4 font-body text-base text-text-primary transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
