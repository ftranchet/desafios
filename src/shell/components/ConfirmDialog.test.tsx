// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

function Harness({ onCancel = vi.fn() }: { onCancel?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open ? (
        <ConfirmDialog
          title="Borrar progreso"
          body="Esta acción no se puede deshacer."
          onAccept={() => setOpen(false)}
          onCancel={() => {
            onCancel();
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

describe('ConfirmDialog', () => {
  it('expone nombre y descripción accesibles y enfoca la opción segura', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('alertdialog', { name: 'Borrar progreso' });
    const descriptionId = dialog.getAttribute('aria-describedby');

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)?.textContent).toBe(
      'Esta acción no se puede deshacer.',
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('atrapa Tab, cancela con Escape y devuelve el foco al disparador', () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('alertdialog');
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmar' }));

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('cancela al tocar el fondo, pero no al tocar el panel', () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialog = screen.getByRole('alertdialog');
    const panel = screen.getByRole('heading', { name: 'Borrar progreso' }).parentElement!;
    fireEvent.click(panel);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
