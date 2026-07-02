# ADR-004 — Revisión de la identidad visual: de pixel art a minimalismo moderno

**Estado:** aceptado · Fase 1

## Contexto

La Fase 0 entregó una identidad visual "pixel art minimalista" (fuente "Press Start 2P", bordes duros a 0, sprites en grilla 16×16, `image-rendering: pixelated`, animaciones a pasos — ADR-003). El feedback sobre esa entrega, ya con la app corriendo, fue que la estética de 8 bits no se veía bien. Se pidió replantear la dirección visual hacia algo minimalista, simple y prolijo, antes de seguir construyendo los juegos de la Fase 1 — construirlos primero sobre el sistema viejo hubiera significado retrabajarlos.

## Decisión

Se mantiene la paleta de colores de ADR-003 sin cambios — los valores de contraste AA ya validados siguen siendo correctos, y el problema nunca fue el color sino la tipografía y la geometría. Se reemplaza:

- **Tipografía:** se abandona "Press Start 2P". Queda una sola familia, **Inter** (ya instalada, self-hosted vía `@fontsource`), usada en varios pesos: regular/semibold para cuerpo, bold/extrabold para títulos, HUD y puntajes. Los roles `display`/`body` de `tailwind.config.ts` (`fontFamily`) se mantienen como nombres semánticos, pero ambos apuntan a Inter — la distinción ahora es de peso, no de tipografía.
- **Geometría:** se restaura la escala de `borderRadius` por defecto de Tailwind (se quita el override `{ none: '0px' }` de la Fase 0). Tarjetas, botones y diálogos usan `rounded-lg`/`rounded-xl`. Los bordes pasan de `border-2` (2px) a `border` (1px) en la mayoría de los casos, para una sensación más liviana.
- **Íconos:** se reemplazan los sprites "pixel art 16×16" (grilla de `<rect>`, ver el `icon.svg` original de "Tiempo de reacción") por glifos vectoriales simples — paths con curvas, sin la retícula de píxeles. El ícono de "Tiempo de reacción" se rehizo como un rayo de un solo trazo. Los íconos de PWA (`scripts/generate-icons.mjs`) pasan de "grilla 16×16 escalada por vecino más cercano" a una marca circular con antialiasing calculado directo a cada resolución (192/512) — mismo criterio de "no escalar una imagen chiquita", ahora aplicado a formas suaves en vez de a un patrón de píxeles.
- **Renderizado:** se quita `image-rendering: pixelated` y la regla global `* { border-radius: 0 }` de `src/styles/index.css`.
- **Animaciones:** curvas `ease` en vez de `steps()`. Sin cambios en el respeto a "reducir animaciones" (RNF-06).
- **Sonido:** sin cambios de implementación — los efectos de Web Audio (ADR-003) nunca dependieron de la estética visual; se ajustó únicamente la redacción del PRD para no describirlos como "chiptune de 8 bits" sino como "breves y discretos".

## Consecuencias

- Retrabajo puntual sobre lo ya construido en Fase 0: `tailwind.config.ts`, `src/styles/index.css`, todos los componentes del shell (reemplazo de `font-display` sin peso explícito por `font-display` + `font-bold`/`font-extrabold`, bordes más finos, esquinas redondeadas) y `src/games/reaction-time/` (ícono e interfaz).
- Los tres juegos de la Fase 1 (Aritmética contra reloj, Cifras, Snake) se construyen directamente sobre el sistema nuevo — no heredan nada del look pixel art.
- `docs/PRD.md` sección 10 se reescribió para describir la dirección nueva; ADR-003 queda como registro histórico con su sección de tipografía marcada como superseded (la paleta de esa misma ADR sigue vigente).
- Si en el futuro se quiere revivir una estética retro (por ejemplo para un juego puntual, no para todo el shell), tendría que ser una decisión explícita y acotada a ese módulo — no vuelve a ser el lenguaje visual por defecto sin pasar por una ADR nueva.
