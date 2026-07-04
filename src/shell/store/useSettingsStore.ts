import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Único estado global del shell (PRD 4.2, principio 6): preferencias del
// usuario y último juego jugado (para preseleccionar nivel, RF-03). Los
// juegos nunca acceden a este store directamente.

export interface LastPlayed {
  gameId: string;
  level: number;
}

interface SettingsState {
  sound: boolean;
  vibration: boolean;
  reduceAnimations: boolean;
  lastPlayed: LastPlayed | null;
  toggleSound(): void;
  toggleVibration(): void;
  toggleReduceAnimations(): void;
  setLastPlayed(entry: LastPlayed): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      vibration: true,
      reduceAnimations: false,
      lastPlayed: null,
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      toggleVibration: () => set((s) => ({ vibration: !s.vibration })),
      toggleReduceAnimations: () => set((s) => ({ reduceAnimations: !s.reduceAnimations })),
      setLastPlayed: (entry) => set({ lastPlayed: entry }),
    }),
    {
      name: 'dm:settings',
      // Versión explícita del esquema persistido: deja listo el mecanismo de
      // migración para cambios futuros. La forma 0→1 no cambió, así que la
      // migración conserva el estado guardado tal cual.
      version: 1,
      migrate: (persisted) => persisted as SettingsState,
    },
  ),
);
