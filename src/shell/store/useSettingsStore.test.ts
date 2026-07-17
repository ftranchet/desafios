// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSettingsSnapshot,
  normalizePersistedSettings,
  useSettingsStore,
} from './useSettingsStore';

const SETTINGS_KEY = 'dm:settings';

beforeEach(() => {
  useSettingsStore.getState().resetSettings();
  localStorage.clear();
});

describe('normalizePersistedSettings', () => {
  it('normaliza todos los campos aunque el payload declare la versión actual', () => {
    expect(
      normalizePersistedSettings({
        sound: 'sí',
        vibration: false,
        reduceAnimations: 1,
        theme: 'sepia',
        defaultDifficulty: 'imposible',
        lastPlayed: { gameId: 'snake', mode: 'constructor' },
        favorites: ['snake', '', 'snake', 4, 'simon'],
      }),
    ).toEqual({
      sound: true,
      vibration: false,
      reduceAnimations: false,
      theme: 'light',
      defaultDifficulty: 'last',
      lastPlayed: null,
      favorites: ['snake', 'simon'],
    });
  });

  it('migra únicamente niveles legados válidos', () => {
    expect(
      normalizePersistedSettings({ lastPlayed: { gameId: 'snake', level: 3 } }).lastPlayed,
    ).toEqual({ gameId: 'snake', mode: 'medium' });
    expect(
      normalizePersistedSettings({ lastPlayed: { gameId: 'snake', level: 99 } }).lastPlayed,
    ).toBeNull();
  });
});

describe('persistencia segura de configuración', () => {
  it('completa la hidratación con defaults ante JSON corrupto', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(SETTINGS_KEY, '{json roto');

    await useSettingsStore.persist.rehydrate();
    expect(getSettingsSnapshot()).toMatchObject({ sound: true, favorites: [], theme: 'light' });
    expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    warn.mockRestore();
  });

  it('sanea un payload corrupto de versión 5 durante rehidratación', async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: 5,
        state: {
          sound: null,
          favorites: {},
          theme: 'roto',
          lastPlayed: { gameId: 'snake', mode: 'toString' },
        },
      }),
    );

    await useSettingsStore.persist.rehydrate();
    expect(getSettingsSnapshot()).toMatchObject({
      sound: true,
      favorites: [],
      theme: 'light',
      lastPlayed: null,
    });
  });

  it('no interpreta ni sobrescribe configuración de una versión futura', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const futurePayload = JSON.stringify({
      version: 99,
      state: { theme: 'future-theme', favorites: ['future-game'] },
    });
    localStorage.setItem(SETTINGS_KEY, futurePayload);

    await useSettingsStore.persist.rehydrate();
    expect(getSettingsSnapshot()).toMatchObject({ theme: 'light', favorites: [] });
    expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    useSettingsStore.getState().toggleSound();
    expect(localStorage.getItem(SETTINGS_KEY)).toBe(futurePayload);

    // El reset explícito sí tiene autoridad para eliminar esos datos.
    useSettingsStore.getState().resetSettings();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
    warn.mockRestore();
  });

  it('no propaga una falla de cuota al cambiar una preferencia', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => useSettingsStore.getState().toggleSound()).not.toThrow();
    expect(useSettingsStore.getState().sound).toBe(false);

    setItem.mockRestore();
    warn.mockRestore();
  });

  it('restaura defaults y elimina la clave persistida', () => {
    useSettingsStore.getState().toggleSound();
    useSettingsStore.getState().toggleFavorite('snake');
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull();

    useSettingsStore.getState().resetSettings();
    expect(getSettingsSnapshot()).toMatchObject({ sound: true, favorites: [], theme: 'light' });
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });

  it('restaura el estado en memoria aunque falle el borrado persistido', () => {
    useSettingsStore.getState().toggleFavorite('snake');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage blocked');
    });

    expect(() => useSettingsStore.getState().resetSettings()).not.toThrow();
    expect(useSettingsStore.getState().favorites).toEqual([]);

    removeItem.mockRestore();
    warn.mockRestore();
  });

  it('entrega una copia del array de favoritos al exportar', () => {
    useSettingsStore.getState().toggleFavorite('snake');
    const snapshot = getSettingsSnapshot();
    snapshot.favorites.push('simon');
    expect(useSettingsStore.getState().favorites).toEqual(['snake']);
  });
});
