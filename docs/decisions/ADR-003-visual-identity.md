# ADR-003 — Paleta, tipografía y sonido definitivos

**Estado:** aceptado · Fase 0

## Contexto

El PRD deja tres decisiones pendientes para Fase 0 (sección 17.2), cada una con una recomendación propia:

1. Paleta exacta (≤ 12 colores), subconjunto de una paleta retro reconocida ajustado a contraste AA.
2. Fuente pixel definitiva para display/HUD, candidata "Press Start 2P".
3. Si incluir sonido chiptune desde el MVP o desde Fase 2.

## Decisión — Paleta

Se partió de una paleta inspirada en Sweetie-16 y se ajustaron los valores hasta cumplir AA (≥ 4.5:1 para texto normal, ≥ 3:1 para UI/texto grande) contra los dos fondos que realmente se usan (`bg` y `surface`). Tema oscuro único, como pide el PRD.

| Token            | Hex       | Rol                                             |
| ---------------- | --------- | ----------------------------------------------- |
| `bg`             | `#0f0e17` | Fondo de la app                                 |
| `surface`        | `#1a1826` | Tarjetas, paneles                               |
| `surface-alt`    | `#26223a` | Elementos elevados / estado inactivo            |
| `text-primary`   | `#f4f4f2` | Texto principal                                 |
| `text-secondary` | `#a6a2bd` | Texto secundario                                |
| `accent-primary` | `#3fd0c9` | Interacción (botones, enlaces, estado "activo") |
| `accent-success` | `#6bcf63` | Acierto, récord                                 |
| `accent-error`   | `#f4557a` | Error, salir, acciones destructivas             |
| `game-1`         | `#ffcd4b` | Color de juego / sprites                        |
| `game-2`         | `#8a6dff` | Color de juego / sprites                        |
| `game-3`         | `#ff8b3d` | Color de juego / sprites                        |
| `game-4`         | `#3fa7d6` | Color de juego / sprites                        |

Contraste verificado (fórmula WCAG 2.1, relativa a `bg` y `surface`):

| Color            | vs. `bg` | vs. `surface` |
| ---------------- | -------: | ------------: |
| `text-primary`   |   17.4:1 |        15.9:1 |
| `text-secondary` |    7.8:1 |         7.1:1 |
| `accent-primary` |   10.1:1 |         9.2:1 |
| `accent-success` |    9.8:1 |         8.9:1 |
| `accent-error`   |    5.9:1 |         5.3:1 |
| `game-1`         |   12.9:1 |        11.7:1 |
| `game-2`         |    5.2:1 |         4.8:1 |
| `game-3`         |    8.2:1 |         7.5:1 |
| `game-4`         |    7.0:1 |         6.4:1 |

Todos superan 4.5:1 contra ambos fondos (nota: el `game-2` original inspirado en Sweetie-16, `#7c5cff`, daba 4.41:1 contra `bg` — por debajo del umbral — y se aclaró a `#8a6dff` hasta cumplirlo). RNF-05 también exige que la información nunca dependa solo del color: por eso "Tiempo de reacción" combina color con texto ("¡Bien esquivado!", "Muy pronto") en vez de depender únicamente de la paleta.

11 colores con rol propio (dentro del límite de 12 de la sección 10.1).

## Decisión — Tipografía

- **Display/HUD:** "Press Start 2P" (candidata única del PRD), usada solo en títulos, puntajes y HUD — nunca en párrafos, tal como pide 10.2.
- **Cuerpo:** "Inter", por legibilidad y amplia cobertura de idioma.
- Ambas se instalan vía `@fontsource` (self-hosted, ver ADR-001) en los subconjuntos `latin`/`latin-ext`.
- Escala corta de 5 tamaños (`xs` a `xl`), fijada en `tailwind.config.ts`.

## Decisión — Sonido

Se incluye en Fase 0 (no se pospone a Fase 2): la implementación elegida son 4 efectos (`success`, `error`, `record`, `gameover`) sintetizados en runtime con la Web Audio API (osciladores + envolvente de ganancia), sin archivos de audio externos. El costo de implementación fue bajo (`src/core/sound.ts`, ~60 líneas) y no demoró la entrega del shell, que era la condición que ponía el PRD para incluirlo ya. Cumple además la regla 11.2 (sonido siempre original) por construcción: no hay ningún asset de terceros.

## Consecuencias

- `tailwind.config.ts` es la única fuente de verdad de estos valores; ningún juego define colores o fuentes propias (principio de arquitectura 4.2.6).
- Si se agrega tema claro en el futuro (Fase 4), esta ADR debe revisarse: los valores de contraste están calculados solo para el tema oscuro único de v1.
- El límite de 12 colores deja lugar para 1 color de juego adicional (`game-5`) antes de tener que revisar la paleta.
