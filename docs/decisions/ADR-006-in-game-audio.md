# ADR-006 — Sonido dentro de los juegos vía contrato (`GameProps.audio`)

**Estado:** aceptada · Julio 2026

## Contexto

El shell reproduce efectos globales al cerrar una partida (acierto, error, récord — RF-08), pero los juegos no pueden emitir sonido _durante_ la partida: no saben si el usuario tiene el sonido habilitado, porque la configuración es exclusiva del shell (PRD 4.2.2) y un juego no debe leer `useSettingsStore`. El caso concreto: Simon es mudo, cuando el juego original es esencialmente audiovisual (cada pad tiene su tono); los juegos de preguntas tampoco pueden dar feedback sonoro por respuesta.

## Opciones

1. **Pasar `soundEnabled: boolean` en `GameConfig`** y que cada juego use Web Audio directamente. Simple, pero cada juego decide "cómo" suena (riesgo para la regla 11.2 de sonido original y para la consistencia), y todos duplican el gateo.
2. **Inyectar una capacidad de audio ya gateada** en `GameProps`: el juego declara _qué_ quiere sonar; el shell decide si suena. El juego nunca toca Web Audio ni conoce la configuración.
3. **No hacer nada** (statu quo): Simon queda mudo y el feedback sonoro por respuesta es imposible.

## Decisión

Opción 2. El contrato (PRD 5.2) incorpora:

```typescript
export type GameSoundEffect = 'success' | 'error' | 'record' | 'gameover';

export interface GameAudio {
  play(effect: GameSoundEffect): void; // efectos comunes del sistema
  tone(frequency: number, durationMs: number): void; // tonos propios del juego (Simon)
}

export interface GameProps {
  config: GameConfig;
  onFinish(result: GameResult): void;
  onQuit(): void;
  audio?: GameAudio; // inyectado por el shell, ya gateado por la configuración
}
```

El shell inyecta `audio` siempre: con el sonido deshabilitado inyecta una implementación nula (los juegos no ramifican por configuración). `audio` es **opcional** en el contrato para no romper juegos existentes ni tests que no lo pasan. La síntesis vive en `src/core/sound.ts` (`playTone` se suma a los efectos existentes), así todo el sonido sigue siendo original y auditable en un solo archivo (regla 11.2).

## Consecuencias

- Simon reproduce su tono por pad (destello y toque), fiel al original.
- Los juegos de preguntas pueden dar feedback sonoro inmediato por respuesta.
- Los juegos siguen sin acceso a configuración global ni a Web Audio: reciben capacidad, no estado.
- Es la primera ampliación del contrato desde ADR-002; es aditiva y retrocompatible (campo opcional).
