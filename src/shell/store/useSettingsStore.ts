import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModeId } from '../../core/contract';
import { isModeId, levelToMode } from '../../core/modes';

// Único estado global del shell (PRD 4.2, principio 6): preferencias del
// usuario y último juego jugado (para preseleccionar el modo, RF-03). Los
// juegos nunca acceden a este store directamente.

export interface LastPlayed {
  gameId: string;
  mode: ModeId;
}

// Tema visual (ADR-009): claro por defecto, oscuro como opción, o seguir la
// preferencia del sistema. El shell lo aplica estampando data-theme en <html>.
export type ThemePreference = 'light' | 'dark' | 'system';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

// Dificultad por defecto para todo el catálogo: 'last' mantiene el
// comportamiento histórico (preseleccionar el último modo jugado, RF-03);
// una dificultad fija la preselecciona en la portada de todos los juegos.
export type DefaultDifficulty = 'last' | 'easy' | 'medium' | 'hard';

export function isDefaultDifficulty(value: unknown): value is DefaultDifficulty {
  return value === 'last' || value === 'easy' || value === 'medium' || value === 'hard';
}

interface SettingsState {
  sound: boolean;
  vibration: boolean;
  reduceAnimations: boolean;
  theme: ThemePreference;
  defaultDifficulty: DefaultDifficulty;
  lastPlayed: LastPlayed | null;
  favorites: string[]; // ids de juego, orden de agregado (PRD: sin backend, solo local)
  toggleSound(): void;
  toggleVibration(): void;
  toggleReduceAnimations(): void;
  setTheme(theme: ThemePreference): void;
  setDefaultDifficulty(difficulty: DefaultDifficulty): void;
  setLastPlayed(entry: LastPlayed): void;
  toggleFavorite(gameId: string): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      vibration: true,
      reduceAnimations: false,
      theme: 'light',
      defaultDifficulty: 'last',
      lastPlayed: null,
      favorites: [],
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      toggleVibration: () => set((s) => ({ vibration: !s.vibration })),
      toggleReduceAnimations: () => set((s) => ({ reduceAnimations: !s.reduceAnimations })),
      setTheme: (theme) => set({ theme }),
      setDefaultDifficulty: (defaultDifficulty) => set({ defaultDifficulty }),
      setLastPlayed: (entry) => set({ lastPlayed: entry }),
      toggleFavorite: (gameId) =>
        set((s) => ({
          favorites: s.favorites.includes(gameId)
            ? s.favorites.filter((id) => id !== gameId)
            : [...s.favorites, gameId],
        })),
    }),
    {
      name: 'dm:settings',
      // v3: se suma favorites (lista de ids de juego, vacía por defecto).
      // v4 (ADR-009): se suma theme ('light' por defecto, también para quien
      // migra — el tema claro es la cara nueva del producto; el oscuro queda
      // a un toque en Configuración).
      // v5: se suma defaultDifficulty ('last' por defecto: preseleccionar el
      // último modo jugado, el comportamiento de siempre).
      version: 5,
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState> & {
          lastPlayed?: { gameId?: string; level?: number; mode?: unknown } | null;
          favorites?: unknown;
          theme?: unknown;
          defaultDifficulty?: unknown;
        };
        const last = state.lastPlayed;
        if (last && typeof last.gameId === 'string') {
          if (isModeId(last.mode)) {
            state.lastPlayed = { gameId: last.gameId, mode: last.mode };
          } else if (typeof last.level === 'number') {
            state.lastPlayed = { gameId: last.gameId, mode: levelToMode(last.level) };
          } else {
            state.lastPlayed = null;
          }
        } else {
          state.lastPlayed = null;
        }
        state.favorites = Array.isArray(state.favorites)
          ? state.favorites.filter((id): id is string => typeof id === 'string')
          : [];
        state.theme = isThemePreference(state.theme) ? state.theme : 'light';
        state.defaultDifficulty = isDefaultDifficulty(state.defaultDifficulty)
          ? state.defaultDifficulty
          : 'last';
        return state as SettingsState;
      },
    },
  ),
);
