# CLAUDE.md

Instrucciones permanentes para trabajar en **Desafíos Mentales** con Claude Code.

## Antes de tocar código

- Leé `docs/PRD.md` antes de cualquier tarea de producto (qué juego construir, qué prioridad, qué queda fuera de alcance en la sección 2.2).
- Revisá `docs/decisions/` (ADR-001, ADR-002, ADR-003) antes de cambiar stack, contrato o tokens visuales — documentan por qué se decidió lo que hay.

## Contrato y tokens: no se tocan sin una decisión explícita

- El contrato de módulo de juego vive en `src/core/contract.ts` (`GameModule`, `GameProps`, `GameConfig`, `GameResult`, `GameMetadata`). Es la pieza central del sistema (PRD 5.2): el shell nunca conoce el interior de un juego, y un juego nunca conoce el shell más allá de este contrato.
- Los tokens de diseño viven en `tailwind.config.ts` (paleta, tipografía, escala). Ningún juego define colores, fuentes ni tamaños fuera de ahí.
- Si una tarea realmente necesita cambiar el contrato o los tokens, documentá la decisión como una ADR nueva en `docs/decisions/` antes de implementarla.

## Principios de arquitectura (PRD 4.2)

1. El shell no conoce el interior de ningún juego; solo interactúa vía el contrato.
2. Los juegos no acceden a `localStorage`, navegación ni configuración global (`useSettingsStore` es exclusivo del shell). Reciben `GameConfig` y devuelven `GameResult` por `onFinish`. Nada más.
3. Lógica separada de interfaz: cada juego tiene `logic.ts` (funciones puras, sin React ni DOM) y `ui.tsx` (el componente).
4. Toda aleatoriedad pasa por `src/core/random.ts` (`createRng(seed)`), para que sea reproducible en tests.
5. Un juego = una carpeta en `src/games/<game-id>/` = idealmente una sesión de Claude Code.

## Convenciones de código (PRD 12.2)

- TypeScript en modo estricto; `any` prohibido (lint lo marca como error).
- Identificadores y código en inglés; todo texto visible al usuario en español (voseo, Argentina), centralizado en `src/i18n/es.ts`.
- Formateo con Prettier, linting con ESLint — correr antes de cerrar cualquier tarea.
- Commits chicos y descriptivos.

## Flujo para agregar un juego nuevo (PRD 5.5)

1. Crear `src/games/<game-id>/`.
2. `logic.ts` (puro, con semilla), `ui.tsx` (implementa `GameProps`), `index.ts` (exporta el `GameModule`).
3. `icon.svg`: pixel art 16×16 como grilla de `<rect>` (`shape-rendering="crispEdges"`), con los colores del sistema — ver `src/games/reaction-time/icon.svg` como referencia.
4. `logic.test.ts` con semilla fija (mínimo: generación de partida, validación de jugada, cálculo de puntaje).
5. Registrar en `src/core/registry.ts` (una línea).
6. Repasar la checklist de terminado (PRD 12.3) antes de dar la tarea por cerrada.

**Criterio de éxito:** este flujo se completa sin modificar ningún archivo de `src/shell/` ni `src/core/`.

## Antes de cerrar una sesión

```
npm run lint
npm run typecheck
npm run test
npm run build
```

Los cuatro tienen que pasar sin errores. Si hay forma de probar la funcionalidad en un navegador (dev server o preview), hacelo antes de reportar la tarea como terminada — no alcanza con que compile.

Una sesión de Claude Code = una unidad de valor (un juego nuevo, o una mejora acotada del shell). Agregá una entrada a `CHANGELOG.md` antes de terminar.

## Lo que este proyecto no es (PRD 2.2)

Sin backend, cuentas, sincronización en la nube, multijugador, publicidad, monetización ni notificaciones push. Sin afirmaciones de mejora cognitiva en ningún texto (PRD 1.1) — el producto se posiciona como entretenimiento desafiante, nunca como herramienta de mejora cognitiva. Cualquier propuesta que choque con esto se discute antes de implementarse, no se implementa por impulso.
