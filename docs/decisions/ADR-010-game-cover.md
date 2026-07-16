# ADR-010 — Portada de juego: `howToPlay` en el contrato

**Estado:** aceptada · Julio 2026

## Contexto

Feedback directo del product owner sobre el flujo de entrada a un juego: la
pantalla de selección de modo no explica cómo se juega, y el volver atrás es
poco claro. La única descripción disponible en el contrato
(`GameMetadata.description`) es una línea pensada para la tarjeta del
catálogo — no alcanza para explicar la mecánica y los controles antes de la
primera partida.

Es la segunda ampliación del contrato en la historia del proyecto (la primera
fue `GameProps.audio`, ADR-006). CLAUDE.md exige una ADR para cualquier cambio
de contrato.

## Decisión

Se agrega **`howToPlay?: string`** a `GameMetadata`: un párrafo corto (2–4
oraciones, español rioplatense como todo texto visible) que explica el
objetivo del juego y cómo se interactúa (toque y teclado cuando aplica). El
shell lo muestra en la **portada del juego** — la fase de selección de modo,
rediseñada: ícono grande, nombre, descripción, "¿Cómo se juega?" y el
selector de modos.

- **Opcional en el tipo** (retrocompatible, mismo criterio que ADR-006): un
  `GameModule` sin `howToPlay` sigue compilando y la portada simplemente no
  muestra la sección.
- **Obligatorio en la práctica para el catálogo**: el test de contrato del
  registro (`registry.test.ts`) exige `howToPlay` no vacío en todo juego
  registrado — igual que ya exige `description`. El generador `new-game` lo
  incluye en su plantilla.
- El texto vive en `index.ts` junto al resto de los metadatos, no en el
  `ui.tsx`: es contenido, no interfaz.

## Consecuencias

- Los 28 juegos existentes suman su `howToPlay` en esta misma versión (el
  test de registro no deja registrar uno nuevo sin él).
- La portada reemplaza a la pantalla de selección de modo "pelada": el
  jugador ve qué es el juego y cómo se juega antes de la primera partida,
  sin tener que entrar a perder una ronda para descubrirlo.
- Los textos de ayuda contextuales dentro de la partida (p. ej. "Mantené el
  dedo sobre el tablero…" de Snake) no se tocan: explican controles en el
  momento de usarlos; `howToPlay` explica el juego antes de empezar. Cierta
  superposición entre ambos es aceptable y deliberada.
