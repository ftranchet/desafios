import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
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

export interface SettingsSnapshot {
  sound: boolean;
  vibration: boolean;
  reduceAnimations: boolean;
  theme: ThemePreference;
  defaultDifficulty: DefaultDifficulty;
  lastPlayed: LastPlayed | null;
  favorites: string[]; // ids de juego, orden de agregado (PRD: sin backend, solo local)
}

interface SettingsState extends SettingsSnapshot {
  toggleSound(): void;
  toggleVibration(): void;
  toggleReduceAnimations(): void;
  setTheme(theme: ThemePreference): void;
  setDefaultDifficulty(difficulty: DefaultDifficulty): void;
  setLastPlayed(entry: LastPlayed): void;
  toggleFavorite(gameId: string): void;
  resetSettings(): void;
}

const SETTINGS_KEY = 'dm:settings';
const SETTINGS_SCHEMA_VERSION = 5;
let futureSettingsDetected = false;

function defaultSettings(): SettingsSnapshot {
  return {
    sound: true,
    vibration: true,
    reduceAnimations: false,
    theme: 'light',
    defaultDifficulty: 'last',
    lastPlayed: null,
    favorites: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Normaliza datos persistidos en cada hidratación, incluso sin migración. */
export function normalizePersistedSettings(value: unknown): SettingsSnapshot {
  const defaults = defaultSettings();
  if (!isRecord(value)) return defaults;

  const last = isRecord(value.lastPlayed) ? value.lastPlayed : null;
  let lastPlayed: LastPlayed | null = null;
  if (last && typeof last.gameId === 'string' && last.gameId.trim().length > 0) {
    if (isModeId(last.mode)) {
      lastPlayed = { gameId: last.gameId, mode: last.mode };
    } else if (
      typeof last.level === 'number' &&
      Number.isInteger(last.level) &&
      last.level >= 1 &&
      last.level <= 5
    ) {
      lastPlayed = { gameId: last.gameId, mode: levelToMode(last.level) };
    }
  }

  const favorites = Array.isArray(value.favorites)
    ? [
        ...new Set(
          value.favorites.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      ]
    : [];

  return {
    sound: typeof value.sound === 'boolean' ? value.sound : defaults.sound,
    vibration: typeof value.vibration === 'boolean' ? value.vibration : defaults.vibration,
    reduceAnimations:
      typeof value.reduceAnimations === 'boolean'
        ? value.reduceAnimations
        : defaults.reduceAnimations,
    theme: isThemePreference(value.theme) ? value.theme : defaults.theme,
    defaultDifficulty: isDefaultDifficulty(value.defaultDifficulty)
      ? value.defaultDifficulty
      : defaults.defaultDifficulty,
    lastPlayed,
    favorites,
  };
}

// Zustand deja que una excepción de localStorage se propague desde cada set.
// Este adaptador vuelve las preferencias best-effort: cuota llena, políticas
// de privacidad o storage deshabilitado nunca impiden jugar o navegar.
const safeSettingsStorage: StateStorage = {
  getItem(name) {
    if (typeof localStorage === 'undefined') return null;
    try {
      const value = localStorage.getItem(name);
      if (value === null) {
        futureSettingsDetected = false;
      } else {
        try {
          const envelope: unknown = JSON.parse(value);
          futureSettingsDetected =
            isRecord(envelope) &&
            typeof envelope.version === 'number' &&
            envelope.version > SETTINGS_SCHEMA_VERSION;
        } catch {
          // Devolver null hace que Zustand complete la hidratación con defaults
          // en vez de quedar para siempre en hasHydrated=false por JSON.parse.
          futureSettingsDetected = false;
          console.warn('La configuración persistida está corrupta; se usan valores seguros.');
          return null;
        }
      }
      return value;
    } catch (error) {
      console.warn('No se pudo leer la configuración persistida:', error);
      return null;
    }
  },
  setItem(name, value) {
    if (typeof localStorage === 'undefined') return;
    if (futureSettingsDetected) {
      console.warn('No se sobrescribe configuración creada por una versión futura de la app.');
      return;
    }
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn('No se pudo persistir la configuración:', error);
    }
  },
  removeItem(name) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(name);
      futureSettingsDetected = false;
    } catch (error) {
      console.warn('No se pudo borrar la configuración persistida:', error);
    }
  },
};

export function getSettingsSnapshot(): SettingsSnapshot {
  return getSettingsSnapshotFromState(useSettingsStore.getState());
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings(),
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
      resetSettings: () => {
        // set actualiza de inmediato la UI; removeItem después evita que los
        // defaults sigan figurando como datos persistidos del usuario.
        set(defaultSettings());
        safeSettingsStorage.removeItem(SETTINGS_KEY);
      },
    }),
    {
      name: SETTINGS_KEY,
      storage: createJSONStorage(() => safeSettingsStorage),
      // v3: se suma favorites (lista de ids de juego, vacía por defecto).
      // v4 (ADR-009): se suma theme ('light' por defecto, también para quien
      // migra — el tema claro es la cara nueva del producto; el oscuro queda
      // a un toque en Configuración).
      // v5: se suma defaultDifficulty ('last' por defecto: preseleccionar el
      // último modo jugado, el comportamiento de siempre).
      version: SETTINGS_SCHEMA_VERSION,
      migrate: (persisted, persistedVersion) => {
        if (persistedVersion > SETTINGS_SCHEMA_VERSION) {
          // Se hidratan defaults en memoria. Zustand intentará persistir el
          // resultado migrado, pero safeSettingsStorage lo bloquea mientras
          // exista un esquema futuro; así la hidratación puede finalizar sin
          // marcar falsamente el store como pendiente para siempre.
          futureSettingsDetected = true;
          return defaultSettings() as SettingsState;
        }
        futureSettingsDetected = false;
        return normalizePersistedSettings(persisted) as SettingsState;
      },
      // migrate solo corre cuando cambia la versión. merge también valida un
      // payload corrupto que ya declare la versión actual.
      merge: (persisted, current) => ({
        ...current,
        ...normalizePersistedSettings(persisted),
      }),
      partialize: (state) => getSettingsSnapshotFromState(state),
    },
  ),
);

function getSettingsSnapshotFromState(state: SettingsState): SettingsSnapshot {
  return {
    sound: state.sound,
    vibration: state.vibration,
    reduceAnimations: state.reduceAnimations,
    theme: state.theme,
    defaultDifficulty: state.defaultDifficulty,
    lastPlayed: state.lastPlayed ? { ...state.lastPlayed } : null,
    favorites: [...state.favorites],
  };
}
