# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

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
