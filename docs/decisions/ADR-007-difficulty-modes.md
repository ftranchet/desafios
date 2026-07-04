# ADR-007 — Dificultades y modos de juego (reemplaza los 5 niveles)

**Estado:** aceptada · Julio 2026

## Contexto

El sistema de 5 niveles (ADR-002, PRD sección 7) resultó precisión falsa: nadie distingue "Avanzado" de "Experto" y la elección se volvió ruido. El product owner definió el reemplazo: **3 dificultades** (Fácil, Medio, Difícil) más **2 modos especiales** — **Tranquilo** (sin relojes ni game over, cero presión) y **Progresivo** (la dificultad recorre 10 grados, de fácil a experto, dentro de la misma partida). Requisito explícito: la estructura tiene que ser entendible y robusta para cada juego nuevo — incorporar un juego no puede romper nada.

## Opciones

1. **Mantener los 5 slots numéricos y reinterpretarlos** (1-3 dificultades, 4 tranquilo, 5 progresivo). Sin cambio de contrato, pero abuso semántico: el número dejaría de significar dificultad y los modos no serían opcionales por juego.
2. **Dos ejes en la interfaz** (dificultad × modo). Más expresivo, pero duplica la decisión del jugador y contradice el caso de uso 1 (jugar en menos de 10 segundos).
3. **Un solo selector con modos declarados por juego**: el contrato pasa de `levels` (exactamente 5) a `modes` — las 3 dificultades obligatorias, Tranquilo y Progresivo opcionales, porque no significan lo mismo en todos los juegos (en Tiempo de reacción "sin reloj" no existe).

## Decisión

Opción 3. Cambios de contrato (segunda ampliación desde ADR-002, esta vez con ruptura controlada):

```typescript
export type ModeId = 'easy' | 'medium' | 'hard' | 'zen' | 'progressive';

export interface GameMode {
  id: ModeId;
  label: string; // "Fácil", "Tranquilo"... — siempre desde core/modes.ts
  description?: string; // una línea, solo para los modos especiales
  params: Record<string, number | string | boolean>;
}

// GameMetadata.modes reemplaza a GameMetadata.levels
// GameConfig.mode y GameResult.mode reemplazan a .level
```

Reglas de producto:

- **Tranquilo**: sin relojes que corran hacia atrás y sin game over; cada juego lo interpreta (preguntas sin timer; en Snake chocar reacomoda y seguís; en Cascada el top-out limpia el tablero; en Simon fallar repite la ronda). **No compite**: sin récords ni "¡Récord nuevo!" — se guarda en el historial y nada más.
- **Progresivo**: la partida recorre 10 grados de dificultad. Los grados 1–8 interpolan el espacio Fácil→Difícil; **los grados 9 y 10 extrapolan más allá del Difícil actual**. En juegos de supervivencia (Snake, Cascada) el grado sube por logro y la partida termina al perder; en juegos de preguntas la sesión es una rampa de longitud fija. El récord natural: hasta dónde llegaste (métrica `maxStage`) además del puntaje.

Robustez para juegos nuevos (el requisito central), en tres capas:

1. **Tipos**: `ModeId` es una unión cerrada; `modes` es parte obligatoria de los metadatos. No compila un juego sin modos.
2. **Constructor único**: `buildModes(...)` en `src/core/modes.ts` arma la lista con los labels/descripciones/orden canónicos — un juego no puede escribir "Fasil" ni cambiar el orden. Ahí también viven `PROGRESSIVE_STAGES`, la curva `progressiveT(stage)` y `lerp`, para que todos los progresivos escalen igual.
3. **Tests automáticos**: el test de contrato valida la estructura de modos de todo juego registrado, y el smoke de render monta cada juego **en cada modo que declara**. Declarar un modo es quedar testeado en ese modo.

Migración de datos (primer uso real del esquema versionado de 0.7.0): resultados v1 (con `level` numérico) migran en lectura — 1-2 → `easy`, 3 → `medium`, 4-5 → `hard` — conservando puntajes e historial; `lastPlayed` migra igual en el store de settings (v2).

## Consecuencias

- La elección del jugador baja de 5 opciones opacas a 3 + 2 con significado.
- Un juego puede lanzarse solo con las 3 dificultades y sumar Tranquilo/Progresivo después — el selector muestra lo declarado (los modos especiales llegan juego por juego; Aritmética y Snake son las implementaciones de referencia).
- Los récords pasan a estar keyeados por modo; los históricos se conservan vía migración.
- El PRD (sección 7, RF-03/05/07, contrato 5.2), el generador y la checklist 12.3 se actualizan en esta misma decisión.
