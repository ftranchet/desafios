import type { ComponentType } from 'react';

// Contrato de módulo de juego — pieza central del sistema (PRD sección 5.2).
// El shell solo conoce estas interfaces; nunca el interior de un juego.

export type Category = 'memory' | 'logic' | 'math' | 'speed' | 'spatial' | 'words';

export interface DifficultyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string; // Texto visible: "Fácil", "Medio", "Difícil"...
  params: Record<string, number | string | boolean>;
}

export interface GameMetadata {
  id: string; // kebab-case, único: "quick-math"
  name: string; // Nombre visible, en español
  category: Category;
  description: string; // Una línea, en español
  version: string;
  levels: DifficultyLevel[]; // Exactamente 5
  estimatedSeconds: number; // Duración típica de una partida
  icon: string; // Ruta al sprite-ícono 16×16 del juego
}

export interface GameConfig {
  level: number; // 1 a 5
  seed?: number; // Reproducibilidad en tests
}

export interface GameResult {
  gameId: string;
  level: number;
  score: number; // Escala libre por juego
  completed: boolean; // false si abandonó
  durationMs: number;
  metrics: Record<string, number>; // Específicas del juego: aciertos, errores, mejorRacha...
  timestamp: string; // ISO 8601
}

export interface GameProps {
  config: GameConfig;
  onFinish(result: GameResult): void; // El juego terminó (única vía de salida de datos)
  onQuit(): void; // El usuario abandonó
}

export interface GameModule {
  metadata: GameMetadata;
  Component: ComponentType<GameProps>;
}
