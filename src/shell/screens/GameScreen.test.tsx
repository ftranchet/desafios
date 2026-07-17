// @vitest-environment jsdom
import type { GameProps, GameResult } from '../../core/contract';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../store/useSettingsStore';
import { GameScreen } from './GameScreen';

const registryMock = vi.hoisted(() => {
  const metadata = {
    id: 'test-game',
    name: 'Juego de prueba',
    category: 'logic' as const,
    description: 'Descripción de prueba.',
    howToPlay: 'Completá la prueba.',
    version: '1.0.0',
    modes: [
      { id: 'easy' as const, label: 'Fácil' },
      { id: 'medium' as const, label: 'Medio' },
      { id: 'hard' as const, label: 'Difícil' },
    ],
    estimatedSeconds: 10,
    icon: '/icons/test.svg',
  };
  const load = vi.fn();
  return { metadata, load, definition: { metadata, load } };
});

const storageMock = vi.hoisted(() => ({
  saveResult: vi.fn(),
  getBest: vi.fn(),
}));

const soundMock = vi.hoisted(() => ({
  warmUpAudio: vi.fn(),
  playSound: vi.fn(),
  playTone: vi.fn(),
}));

const vibrationMock = vi.hoisted(() => ({ vibrate: vi.fn() }));

vi.mock('../../core/registry', () => ({
  getGameById: (id: string) =>
    id === registryMock.metadata.id ? registryMock.definition : undefined,
}));

vi.mock('../../core/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/storage')>();
  return { ...actual, storage: storageMock };
});

vi.mock('../../core/sound', () => soundMock);
vi.mock('../../core/vibration', () => vibrationMock);

const COMPLETE_RESULT: GameResult = {
  gameId: 'test-game',
  mode: 'medium',
  score: 100,
  completed: true,
  durationMs: 1000,
  metrics: { hits: 4 },
  timestamp: '2026-07-05T12:00:00.000Z',
};

function TestGame({ onFinish, onQuit }: GameProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onFinish({ ...COMPLETE_RESULT, score: 500, completed: false });
          onFinish(COMPLETE_RESULT);
        }}
      >
        Terminar incompleta dos veces
      </button>
      <button
        type="button"
        onClick={() => {
          onFinish(null as unknown as GameResult);
          onFinish(COMPLETE_RESULT);
        }}
      >
        Terminar con resultado hostil
      </button>
      <button
        type="button"
        onClick={() => {
          onQuit();
          onQuit();
        }}
      >
        Abandonar dos veces
      </button>
    </div>
  );
}

function renderScreen() {
  const router = createMemoryRouter(
    [
      { path: '/game/:gameId', element: <GameScreen /> },
      { path: '/', element: <p>Catálogo</p> },
    ],
    { initialEntries: ['/', '/game/test-game'], initialIndex: 1 },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

async function startGame() {
  fireEvent.click(screen.getByRole('button', { name: 'Jugar' }));
  return screen.findByRole('button', { name: 'Terminar incompleta dos veces' });
}

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.saveResult.mockReset();
  storageMock.getBest.mockReset();
  soundMock.warmUpAudio.mockReset();
  soundMock.playSound.mockReset();
  soundMock.playTone.mockReset();
  useSettingsStore.getState().resetSettings();
  storageMock.getBest.mockReturnValue({ ...COMPLETE_RESULT, score: 10 });
  registryMock.load.mockResolvedValue({
    metadata: registryMock.metadata,
    Component: TestGame,
  });
});

afterEach(cleanup);

describe('GameScreen: cierre robusto de sesión', () => {
  it('aísla un error al cargar el chunk del juego y ofrece salida segura', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    registryMock.load.mockRejectedValue(new Error('chunk roto'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Jugar' }));

    expect(await screen.findByText('El juego falló')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al catálogo' }));
    await waitFor(() => expect(screen.getByText('Catálogo')).toBeTruthy());
    expect(storageMock.saveResult).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('persiste una sola vez y una partida incompleta nunca es récord', async () => {
    renderScreen();
    const finish = await startGame();
    fireEvent.click(finish);

    expect(storageMock.saveResult).toHaveBeenCalledTimes(1);
    expect(storageMock.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ score: 500, completed: false }),
    );
    expect(soundMock.playSound).toHaveBeenLastCalledWith('error');
    expect(vibrationMock.vibrate).not.toHaveBeenCalled();
    expect(screen.getByText('Resultado')).toBeTruthy();
  });

  it('degrada un resultado totalmente hostil sin romper la pantalla', async () => {
    renderScreen();
    await startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Terminar con resultado hostil' }));

    expect(storageMock.saveResult).toHaveBeenCalledTimes(1);
    expect(storageMock.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'test-game',
        mode: 'medium',
        score: 0,
        completed: false,
        metrics: {},
      }),
    );
    expect(screen.getByText('Resultado')).toBeTruthy();
  });

  it('audio fallando no impide entrar a jugar', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    soundMock.warmUpAudio.mockImplementation(() => {
      throw new DOMException('Audio bloqueado');
    });
    renderScreen();

    await startGame();
    expect(screen.getByRole('button', { name: 'Abandonar dos veces' })).toBeTruthy();
    warn.mockRestore();
  });

  it('una falla inesperada de persistencia no impide mostrar el resultado', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storageMock.saveResult.mockImplementationOnce(() => {
      throw new DOMException('Storage blocked');
    });
    renderScreen();
    const finish = await startGame();

    expect(() => fireEvent.click(finish)).not.toThrow();
    expect(screen.getByText('Resultado')).toBeTruthy();
    warn.mockRestore();
  });

  it('procesa un abandono una sola vez aunque el juego lo emita dos veces', async () => {
    renderScreen();
    await startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Abandonar dos veces' }));

    await waitFor(() => expect(screen.getByText('Catálogo')).toBeTruthy());
    expect(storageMock.saveResult).toHaveBeenCalledTimes(1);
    expect(storageMock.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ score: 0, completed: false }),
    );
  });

  it('activa la advertencia nativa al recargar durante una partida', async () => {
    renderScreen();
    await startGame();
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('bloquea Back y persiste el abandono solo después de confirmar', async () => {
    const { router } = renderScreen();
    await startGame();

    await act(async () => router.navigate(-1));
    const firstDialog = await screen.findByRole('alertdialog');
    expect(storageMock.saveResult).not.toHaveBeenCalled();
    fireEvent.click(within(firstDialog).getByRole('button', { name: 'Seguir jugando' }));
    expect(screen.getByRole('button', { name: 'Abandonar dos veces' })).toBeTruthy();

    await act(async () => router.navigate(-1));
    const finalDialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(finalDialog).getByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(screen.getByText('Catálogo')).toBeTruthy());
    expect(storageMock.saveResult).toHaveBeenCalledTimes(1);
    expect(storageMock.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false }),
    );
  });

  it(
    'cancela el Back pendiente si la partida termina mientras el diálogo está abierto',
    async () => {
      const { router } = renderScreen();
      const finish = await startGame();

      await act(async () => router.navigate(-1));
      expect(await screen.findByRole('alertdialog')).toBeTruthy();
      fireEvent.click(finish);

      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(screen.getByText('Resultado')).toBeTruthy();
      expect(router.state.location.pathname).toBe('/game/test-game');

      await act(async () => router.navigate(-1));
      await waitFor(() => expect(screen.getByText('Catálogo')).toBeTruthy());
    },
  );
});
