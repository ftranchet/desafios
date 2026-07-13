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

interface SettingsState {
  sound: boolean;
  vibration: boolean;
  reduceAnimations: boolean;
  lastPlayed: LastPlayed | null;
  favorites: string[]; // ids de juego, orden de agregado (PRD: sin backend, solo local)
  toggleSound(): void;
  toggleVibration(): void;
  toggleReduceAnimations(): void;
  setLastPlayed(entry: LastPlayed): void;
  toggleFavorite(gameId: string): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      vibration: true,
      reduceAnimations: false,
      lastPlayed: null,
      favorites: [],
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      toggleVibration: () => set((s) => ({ vibration: !s.vibration })),
      toggleReduceAnimations: () => set((s) => ({ reduceAnimations: !s.reduceAnimations })),
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
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState> & {
          lastPlayed?: { gameId?: string; level?: number; mode?: unknown } | null;
          favorites?: unknown;
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
        return state as SettingsState;
      },
    },
  ),
);
