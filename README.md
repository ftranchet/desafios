# Desafíos Mentales

Colección de juegos mentales para celular —matemática, lógica, memoria, velocidad y razonamiento espacial— con una estética **minimalista y moderna**. Sin publicidad, sin cuentas, sin promesas de mejora cognitiva: solo entretenimiento desafiante.

Es también un caso documentado de desarrollo asistido por agentes de código: cada juego se construye como un módulo independiente que se enchufa a una plataforma común. Los requisitos vigentes viven en [`docs/PRD.md`](docs/PRD.md), las decisiones en [`docs/decisions/`](docs/decisions/) y el estado entrega por entrega en [`CHANGELOG.md`](CHANGELOG.md).

## Jugar

👉 https://ftranchet.github.io/desafios/ (se publica automáticamente en cada push a `main`)

Es una PWA: se puede instalar en la pantalla de inicio del celular y funciona sin conexión después de la primera carga.

## Correr localmente

Requiere Node.js `^20.19.0`, `^22.13.0` o `>=24.0.0`.

```bash
npm ci             # instalación reproducible desde package-lock.json
npm run dev        # servidor de desarrollo
npm run test        # tests unitarios, de contrato y del generador (Vitest)
npm run lint        # sintaxis de scripts + ESLint
npm run audit       # vulnerabilidades altas/críticas de dependencias de runtime
npm run typecheck   # TypeScript estricto: app, tooling y E2E
npm run build       # tipos + build de producción a dist/
npm run test:e2e    # build fresco + Playwright
npm run check       # puerta local: formato, lint, tipos, tests, build y E2E
npm run preview     # sirve el último build de producción localmente
```

Playwright necesita Chromium y WebKit. Se instalan una vez con `npx playwright install --with-deps chromium webkit`; en CI esto ocurre automáticamente. `npm run audit` queda separado de `check` porque consulta el registro npm y requiere red, pero CI también lo exige.

## Cómo agregar un juego

Cada juego es una carpeta independiente en `src/games/` que implementa el contrato de `src/core/contract.ts`. El shell conoce sus metadatos para construir el catálogo, pero carga el código interactivo del módulo solo cuando se abre la partida.

1. Simulá el alta: `npm run new-game -- <game-id> "Nombre visible" --dry-run`.
2. Generá el módulo: `npm run new-game -- <game-id> "Nombre visible"`. El comando valida ID, nombre único y registro, crea los seis archivos y publica bajo un lock exclusivo: ante una falla o dos altas simultáneas no deja una carpeta parcial ni pierde entradas.
3. Reemplazá la mecánica de ejemplo en `logic.ts` y `ui.tsx`; completá `metadata.ts` y sus instrucciones en español.
4. Dibujá `icon.svg` como glifo vectorial propio, usando los tokens del sistema.
5. Reemplazá y ampliá `logic.test.ts`, incluyendo casos límite además del camino feliz.
6. Probalo con toque y teclado, en celular vertical y horizontal.
7. Corré `npm run format` y después `npm run check` antes de darlo por terminado.

El scaffold conserva “Esqueleto generado” deliberadamente y, mientras no se reemplace, el test de contrato hace fallar `npm run check`: un juego ficticio no puede llegar a producción por accidente. No edites a mano el registro para un alta normal. Sus marcadores son parte del contrato del generador y sus tests verifican que una estructura inesperada falle sin escribir cambios.

Los detalles completos —incluida la checklist de "terminado"— están en `docs/PRD.md` (secciones 5.5 y 12.3) y en `CLAUDE.md`.

### Rama y publicación

El flujo recomendado es trabajar fuera de `main` y abrir un pull request:

```bash
git switch -c feat/nombre-del-juego
# cambios + npm run check
git push -u origin feat/nombre-del-juego
```

GitHub ejecuta los mismos checks de calidad en la rama y en el pull request. El deploy de Pages ocurre recién al integrar en `main`; por eso una rama secundaria no modifica la app pública.

## Arquitectura

- **Shell** (`src/shell/`): catálogo, pantalla de juego, estadísticas y configuración. Único lugar con estado global (`useSettingsStore`, Zustand) y acceso a `localStorage`.
- **Core** (`src/core/`): contrato, registro de metadatos y loaders diferidos, persistencia, aleatoriedad con semilla, primitivas de interacción y sonido.
- **Games** (`src/games/`): un módulo independiente por juego, cada uno con su propia lógica pura y tests.
- **Tokens de diseño** (`tailwind.config.ts`): paleta (≤ 12 colores), tipografía y escalas — el contrato visual que comparten todos los juegos.

Las decisiones de arquitectura están documentadas como ADRs en [`docs/decisions/`](docs/decisions/).

## Licencia

[GNU General Public License v3.0](LICENSE). Cualquier versión modificada que se distribuya debe publicar su código fuente bajo la misma licencia.
