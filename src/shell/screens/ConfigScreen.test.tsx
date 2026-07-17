// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../store/useSettingsStore';
import { ConfigScreen } from './ConfigScreen';

const storageMock = vi.hoisted(() => ({
  clearAll: vi.fn(),
  exportAll: vi.fn(() => '{"schemaVersion":2,"results":[]}'),
}));

vi.mock('../../core/storage', () => ({ storage: storageMock }));

beforeEach(() => {
  vi.clearAllMocks();
  useSettingsStore.getState().resetSettings();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('ConfigScreen: borrado seguro', () => {
  it('vuelve a enfocar Cancelar al pasar a la confirmación final', () => {
    render(
      <MemoryRouter>
        <ConfigScreen />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'Borrar todos los datos' });
    trigger.focus();
    fireEvent.click(trigger);

    const firstDialog = screen.getByRole('alertdialog', { name: '¿Borrar todos los datos?' });
    expect(document.activeElement).toBe(
      within(firstDialog).getByRole('button', { name: 'Cancelar' }),
    );
    fireEvent.click(within(firstDialog).getByRole('button', { name: 'Borrar todo' }));

    const finalDialog = screen.getByRole('alertdialog', { name: 'Confirmá de nuevo' });
    expect(document.activeElement).toBe(
      within(finalDialog).getByRole('button', { name: 'Cancelar' }),
    );
    expect(storageMock.clearAll).not.toHaveBeenCalled();

    fireEvent.click(within(finalDialog).getByRole('button', { name: 'Borrar todo' }));
    expect(storageMock.clearAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
