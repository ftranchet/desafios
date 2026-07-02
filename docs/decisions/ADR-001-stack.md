# ADR-001 — Stack tecnológico

**Estado:** aceptado · Fase 0

## Contexto

El PRD (`docs/PRD.md`, sección 4.1) ya valida el stack a alto nivel: PWA, React 18 + TypeScript estricto, Vite, Tailwind CSS, Zustand, localStorage detrás de una abstracción, Vitest, GitHub Pages vía GitHub Actions, licencia GPL-3.0. Esta ADR fija las decisiones de implementación que el PRD deja abiertas.

## Decisión

- **Tailwind CSS v3.x**, no v4. El PRD asume que los tokens de diseño viven en `tailwind.config.ts` como archivo JS/TS clásico (sección 10.1 y 13). Tailwind v4 movió la configuración a un modelo CSS-first (`@theme` en CSS); para cumplir la letra del PRD se fija la v3, que sigue usando `tailwind.config.ts` como fuente única de los tokens.
- **Enrutamiento con `react-router-dom` y `HashRouter`.** El shell tiene rutas propias (catálogo, juego, estadísticas, configuración). `HashRouter` evita el workaround de `404.html` que exige GitHub Pages con `BrowserRouter` para SPAs, y no interfiere con el service worker.
- **PWA con `vite-plugin-pwa`** (basado en Workbox). Genera manifest y service worker con precache automático del build; es la opción estándar del ecosistema Vite y evita mantener un service worker a mano.
- **Fuentes self-hosted vía `@fontsource`**, no un `<link>` a Google Fonts. RNF-01 exige que la app funcione 100% offline tras la primera carga; un CDN externo no queda precacheado por el service worker salvo que se liste explícitamente, y depender de un tercero en tiempo de carga es innecesario. Se importan solo los subconjuntos `latin`/`latin-ext` (suficientes para español), no cirílico/griego/vietnamita, para no inflar el precache.
- **`base: '/desafios/'`** en `vite.config.ts`, porque el repositorio real se llama `desafios` (no `desafios-mentales` como sugiere el PRD) y GitHub Pages sirve el sitio bajo ese subpath.

## Consecuencias

- El `tailwind.config.ts` sigue siendo el contrato visual único (ver ADR-003); si en el futuro se migra a Tailwind v4, hay que revisar esta ADR.
- `HashRouter` deja URLs con `#` (ej. `/desafios/#/game/reaction-time`). Es una concesión aceptable para v1: no hay SEO que proteger (RNF-08, sin telemetría ni backend) y simplifica el despliegue estático.
- Cualquier fuente nueva que se agregue al sistema de tipografía debe instalarse vía `@fontsource` y limitarse a los subconjuntos latinos, siguiendo el mismo patrón.
