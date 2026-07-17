# ADR-010 — Portada de juego: `howToPlay` en el contrato

**Estado:** aceptada, enmendada por ADR-011 · Julio 2026

> Nota vigente: `howToPlay` pasó a ser obligatorio en `GameMetadata` y los
> metadatos se movieron de `index.ts` a `metadata.ts`. Esto permite construir
> la portada sin cargar la UI/lógica y hace que un módulo incompleto falle al
> compilar. El contexto de abajo conserva la decisión original.

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

Se agrega **`howToPlay: string`** a `GameMetadata`: un párrafo corto (2–4
oraciones, español rioplatense como todo texto visible) que explica el
objetivo del juego y cómo se interactúa (toque y teclado cuando aplica). El
shell lo muestra en la **portada del juego** — la fase de selección de modo,
rediseñada: ícono grande, nombre, descripción, "¿Cómo se juega?" y el
selector de modos.

- **Obligatorio en el tipo y en el test del catálogo**: un módulo incompleto
  falla durante el desarrollo y no llega a una portada sin instrucciones.
- El texto vive en `metadata.ts` junto al resto de los metadatos, no en
  `ui.tsx`: es contenido disponible sin cargar la interfaz.

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
