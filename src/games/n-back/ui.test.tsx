// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NBackGame } from './ui';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NBackGame: muestras de preparación', () => {
  it('memoriza sin marcar un error y recién después habilita la respuesta', () => {
    render(
      <NBackGame
        config={{ mode: 'easy', seed: 123 }}
        onFinish={() => undefined}
        onQuit={() => undefined}
      />,
    );

    expect(screen.getByText(/Memorizá este símbolo/)).toBeTruthy();
    expect(screen.getByText(/Símbolo actual:/).closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByText('Incorrecto')).toBeNull();
    expect(screen.queryByRole('button', { name: 'No coincide' })).toBeNull();

    act(() => vi.advanceTimersByTime(1200));

    expect(screen.getByText(/Coincide con el símbolo de hace 1 lugar/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No coincide' })).toBeTruthy();
  });
});
