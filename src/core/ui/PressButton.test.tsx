// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PressButton } from './PressButton';

// El botón de juego del kit (ADR-005): dispara en pointerdown, no duplica el
// disparo con el click posterior del mismo gesto, conserva la activación por
// teclado y auto-repite al mantener cuando se le pide.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PressButton', () => {
  it('dispara al apoyar (pointerdown) y no duplica con el click del mismo gesto', () => {
    const onPress = vi.fn();
    render(<PressButton onPress={onPress}>A</PressButton>);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerId: 1, button: 0, isPrimary: true });
    // El navegador emite después un click de puntero (detail >= 1): se ignora.
    fireEvent.click(button, { detail: 1 });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('se activa por teclado (click sintético con detail 0)', () => {
    const onPress = vi.fn();
    render(<PressButton onPress={onPress}>A</PressButton>);

    fireEvent.click(screen.getByRole('button'), { detail: 0 });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no dispara cuando está deshabilitado', () => {
    const onPress = vi.fn();
    render(
      <PressButton onPress={onPress} disabled>
        A
      </PressButton>,
    );
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerId: 1, button: 0, isPrimary: true });
    fireEvent.click(button, { detail: 0 });

    expect(onPress).not.toHaveBeenCalled();
  });

  it('auto-repite al mantener presionado y frena al soltar', () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    render(
      <PressButton onPress={onPress} repeatOnHold>
        A
      </PressButton>,
    );
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerId: 1, button: 0, isPrimary: true });
    expect(onPress).toHaveBeenCalledTimes(1); // el disparo inmediato

    // Espera inicial (260 ms) + 3 cadencias (110 ms cada una).
    vi.advanceTimersByTime(260 + 3 * 110);
    expect(onPress.mock.calls.length).toBeGreaterThanOrEqual(3);

    const callsAtRelease = onPress.mock.calls.length;
    fireEvent.pointerUp(button, { pointerId: 1 });
    vi.advanceTimersByTime(1000);
    expect(onPress).toHaveBeenCalledTimes(callsAtRelease); // nada después de soltar
  });

  it('ignora botones secundarios y punteros no primarios', () => {
    const onPress = vi.fn();
    render(<PressButton onPress={onPress}>A</PressButton>);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerId: 1, button: 2, isPrimary: true });
    fireEvent.pointerDown(button, { pointerId: 2, button: 0, isPrimary: false });

    expect(onPress).not.toHaveBeenCalled();
  });

  it('una cancelación de puntero corta la repetición pendiente', () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    render(
      <PressButton onPress={onPress} repeatOnHold>
        A
      </PressButton>,
    );
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerId: 1, button: 0, isPrimary: true });
    fireEvent.pointerCancel(button, { pointerId: 1 });
    vi.advanceTimersByTime(1000);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('un segundo puntero no dispara ni puede cortar el gesto activo', () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    render(
      <PressButton onPress={onPress} repeatOnHold>
        A
      </PressButton>,
    );
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerId: 1, button: 0, isPrimary: true });
    fireEvent.pointerDown(button, { pointerId: 2, button: 0, isPrimary: true });
    fireEvent.pointerUp(button, { pointerId: 2 });
    vi.advanceTimersByTime(260 + 110);

    expect(onPress.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
