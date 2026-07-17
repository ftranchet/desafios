// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoundPlans } from './logic';
import { ReactionTimeGame } from './ui';

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function renderGame() {
  return render(
    <ReactionTimeGame
      config={{ mode: 'easy', seed: 1 }}
      onFinish={vi.fn()}
      onQuit={vi.fn()}
    />,
  );
}

describe('ReactionTimeGame', () => {
  it('usa un único botón real en la introducción y no consume su Enter desde el root', () => {
    vi.useFakeTimers();
    const { container } = renderGame();
    const start = screen.getByRole('button', { name: 'Empezar' });
    const gameArea = container.querySelector<HTMLElement>('[data-phase]')!;

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(start.closest('[role="button"]')).toBeNull();
    expect(document.activeElement).toBe(start);

    // Testing Library no sintetiza el click nativo que sigue a Enter. Esto
    // permite comprobar por separado que el keydown burbujeado no inicializa
    // desde el contenedor y que el click del botón lo hace una sola vez.
    fireEvent.keyDown(start, { key: 'Enter' });
    expect(gameArea.dataset.phase).toBe('intro');
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(start, { detail: 0 });
    expect(gameArea.dataset.phase).toBe('waiting');
    expect(vi.getTimerCount()).toBe(2);
  });

  it('anuncia una señal textual y simbólica que no depende solamente del color', () => {
    vi.useFakeTimers();
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    let status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('assertive');
    expect(status.textContent).toContain('Esperá');
    expect(status.textContent).toContain('No toques todavía');

    const firstPlan = createRoundPlans('easy', 1)[0]!;
    act(() => vi.advanceTimersByTime(firstPlan.delayMs));

    status = screen.getByRole('status');
    expect(status.textContent).toContain('¡Ahora!');
    expect(status.textContent).toContain('Tocá la pantalla');
    expect(screen.getByText('●').getAttribute('aria-hidden')).toBe('true');
  });

  it('distingue un falso arranque de una respuesta demasiado lenta', () => {
    vi.useFakeTimers();
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    fireEvent.pointerDown(screen.getByRole('button', { name: /Esperá/ }), {
      pointerId: 1,
      button: 0,
      isPrimary: true,
    });

    expect(screen.getByText('Muy pronto')).not.toBeNull();
    expect(screen.queryByText('Muy lento')).toBeNull();
  });
});
