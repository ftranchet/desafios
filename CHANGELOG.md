# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.2.0] — Fase 1: MVP y replanteo visual

### Cambiado

- Identidad visual: se abandona el pixel art de 8 bits (ADR-003) a favor de un **minimalismo moderno** (ADR-004) — una sola tipografía (Inter, en varios pesos), esquinas redondeadas, bordes finos, íconos vectoriales simples en vez de sprites en grilla 16×16. La paleta de colores de ADR-003 se mantiene sin cambios. `docs/PRD.md` actualizado (sección 10, v0.3).
- Íconos de PWA regenerados como una marca circular lisa con antialiasing, en vez de una grilla de píxeles escalada.

### Agregado

- Juego **"Aritmética contra reloj"**: operaciones (suma → las 4, según nivel) contra un temporizador por pregunta, con bono de puntaje por tiempo restante.
- Juego **"Cifras"**: formato numbers round de Countdown — combinar 6 números (grandes + chicos) con las 4 operaciones para llegar cerca de un objetivo de 3 cifras, con interacción por pares al estilo "24 game".
- Juego **"Snake"**: bucle de juego en tiempo real sobre canvas, velocidad creciente por comida, obstáculos desde nivel 3, controles por teclado y deslizamiento — valida la infraestructura de tiempo real que hereda Cascada en Fase 2.
- Los tres juegos completan el MVP de la Fase 1 del PRD (sección 14): 5 niveles cada uno, tests de lógica con semilla fija, íconos propios.

## [0.1.0] — Fase 0: fundaciones

### Agregado

- Tooling del proyecto: Vite + React 18 + TypeScript estricto + Tailwind CSS v3 + ESLint (flat config) + Prettier + Vitest.
- Core: contrato de módulo de juego (`GameModule`, `GameProps`, `GameConfig`, `GameResult`), registro de juegos, servicio de persistencia sobre `localStorage`, aleatoriedad con semilla (mulberry32), temporizadores, sonido chiptune sintetizado (Web Audio) y vibración.
- Shell navegable: catálogo con filtro por categoría, pantalla de juego (selector de nivel → partida → resultado), estadísticas (récords, historial, racha de días) y configuración (sonido, vibración, reducir animaciones, exportar/borrar datos).
- Tokens de diseño: paleta pixel art de 11 colores validada contra contraste AA, tipografía "Press Start 2P" (display/HUD) + "Inter" (cuerpo), self-hosted vía `@fontsource`.
- Juego de validación **"Tiempo de reacción"**: tocar cuando la pantalla cambia a un color objetivo y evitar los señuelos, con 5 niveles de dificultad y tests de lógica con semilla fija.
- PWA instalable: manifest, service worker con precache (vía `vite-plugin-pwa`), íconos generados sin dependencias externas.
- Documentación de gobierno: `CLAUDE.md`, `docs/PRD.md`, ADR-001 (stack), ADR-002 (contrato de módulo), ADR-003 (paleta, tipografía y sonido definitivos).
- CI/CD: build + deploy automático a GitHub Pages en cada push a `main`.
