import type { ComponentType } from 'react';

// Contrato de módulo de juego — pieza central del sistema (PRD sección 5.2).
// El shell solo conoce estas interfaces; nunca el interior de un juego.

export type Category = 'memory' | 'logic' | 'math' | 'speed' | 'spatial' | 'words';

// Dificultades y modos (ADR-007): tres dificultades obligatorias más dos
// modos especiales opcionales, declarados por cada juego según tengan sentido.
export type ModeId = 'easy' | 'medium' | 'hard' | 'zen' | 'progressive';

export interface GameMode {
  id: ModeId;
  label: string; // "Fácil", "Tranquilo"... — siempre desde core/modes.ts (buildModes)
  description?: string; // Una línea, solo para los modos especiales
  params: Record<string, number | string | boolean>;
}

export interface GameMetadata {
  id: string; // kebab-case, único: "quick-math"
  name: string; // Nombre visible, en español
  category: Category;
  description: string; // Una línea, en español
  version: string;
  modes: GameMode[]; // easy/medium/hard obligatorios; zen/progressive opcionales (ADR-007)
  estimatedSeconds: number; // Duración típica de una partida
  icon: string; // Ruta al ícono vectorial del juego
}

export interface GameConfig {
  mode: ModeId;
  seed?: number; // Reproducibilidad en tests
}

export interface GameResult {
  gameId: string;
  mode: ModeId;
  score: number; // Escala libre por juego
  completed: boolean; // false si abandonó
  durationMs: number;
  metrics: Record<string, number>; // Específicas del juego: aciertos, errores, maxStage...
  timestamp: string; // ISO 8601
}

export type GameSoundEffect = 'success' | 'error' | 'record' | 'gameover';

// Capacidad de audio inyectada por el shell, ya gateada por la configuración
// del usuario (ADR-006): el juego declara qué quiere sonar; si el sonido está
// deshabilitado, el shell inyecta una implementación nula. Los juegos nunca
// tocan Web Audio ni leen configuración global.
export interface GameAudio {
  play(effect: GameSoundEffect): void; // efectos comunes del sistema
  tone(frequency: number, durationMs: number): void; // tonos propios del juego
}

export interface GameProps {
  config: GameConfig;
  onFinish(result: GameResult): void; // El juego terminó (única vía de salida de datos)
  onQuit(): void; // El usuario abandonó
  audio?: GameAudio; // Opcional (ADR-006): retrocompatible con juegos previos
}

export interface GameModule {
  metadata: GameMetadata;
  Component: ComponentType<GameProps>;
}
