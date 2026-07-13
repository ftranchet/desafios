# ADR-008 — Pulido visual: color por categoría, elevación, tipografía y movimiento

**Estado:** aceptada · Julio 2026

## Contexto

Una auditoría de diseño sobre las 25 carpetas de juego y el shell encontró que el
"minimalismo moderno" de ADR-004 se había quedado corto de detalle: en toda la
suite había apenas ~90 usos de `shadow-`/`transition`/`rounded-`/`animate-`
repartidos en 40 archivos, ningún nivel de elevación, una sola animación custom
(la barra de cuenta regresiva) y una escala tipográfica de 5 tamaños que salta de
1rem a 2rem sin nada en el medio. El síntoma más visible: `accent-primary` (el
teal) es el único color "activo" en todo el shell — lo usan por igual los links,
el botón primario, el chip de filtro activo y el borde en hover — así que el
catálogo de 25 tarjetas se ve monocromático pese a que `GameMetadata.category`
ya distingue 6 categorías.

El pedido explícito fue "ponerse serios con el diseño... sin perder los
detalles", manteniendo el minimalismo. Como los cambios tocan `tailwind.config.ts`
(tokens), corresponde una ADR antes de implementar (CLAUDE.md).

## Decisión

### 1. Color por categoría (nuevos tokens `game-5` y `game-6`)

Se agregan dos colores a la paleta para poder asignar uno distinto a cada una de
las 6 categorías (`CATEGORY_LABELS`) sin repetir matiz con los ya existentes ni
con los semánticos (`accent-success`/`accent-error`, reservados para
récord/error). Elegidos completando los huecos de matiz reales de la paleta
actual y verificados contra el mismo umbral AA (≥ 4.5:1 sobre `bg` y `surface`,
igual criterio que ADR-003) con la fórmula de contraste relativo de WCAG:

| Token     | Hex       | Contraste vs `bg` | Contraste vs `surface` |
| --------- | --------- | ------------------ | ------------------------ |
| `game-5`  | `#b56ee0` (orquídea) | 5.72 | 5.22 |
| `game-6`  | `#6b7ff0` (índigo)   | 5.40 | 4.92 |

Mapeo categoría → color (`src/shell/categoryColors.ts`, no en `tailwind.config.ts`
— es presentación del shell, no un token nuevo por categoría):
matemática → `game-1`, lógica → `game-4`, memoria → `game-2`, velocidad →
`game-3`, espacial → `game-6`, palabras → `game-5`. El color refuerza (nunca
reemplaza) la etiqueta de texto de la categoría — sigue habiendo texto, no es la
única señal (RNF-05).

### 2. Dos tamaños tipográficos nuevos

Se agregan `md` (1.125rem) entre `base` y `lg`, y `2xl` (2.75rem) por encima de
`xl` — para el puntaje de resultado y otros números "hero", que hoy comparten
tamaño con un título de sección cualquiera. Los 5 tamaños existentes no cambian
(cero riesgo de romper un layout ya afinado).

### 3. Dos niveles de sombra (`boxShadow.card` / `boxShadow.raised`)

`card` para elementos apoyados en la superficie (tarjetas del catálogo, filas de
lista); `raised` para lo que flota por encima del contenido (diálogos, el panel
de resultado). Sombras neutras (negro con opacidad), no atadas a un color de
marca — no necesitan `theme()` porque el negro no va a cambiar.

### 4. Convención de movimiento

- Los controles interactivos pasan de `transition-colors` a `transition`
  (anima color y transform juntos) y suman `active:scale-95` — el toque tiene
  que sentirse con peso, no solo cambiar de color.
- Dos animaciones nuevas: `fade-in` (200ms, entrada de pantalla) y `pop` (420ms,
  celebración de récord nuevo en `ResultPanel`). Ambas quedan cubiertas por la
  regla global ya existente de `prefers-reduced-motion`/`.reduce-animations` en
  `src/styles/index.css` (fuerza `animation-duration` a ~0), sin tocar esa regla.

### 5. Profundidad de fondo

El fondo del shell (`bg-bg`, plano) pasa a un degradé radial sutil entre
`surface` y `bg` vía la técnica ya usada en la auditoría anterior
(`theme()` dentro de una clase arbitraria de Tailwind) — no rompe el
minimalismo, no es un color nuevo, solo dos tokens existentes combinados.

## Consecuencias

- `tailwind.config.ts` crece: 2 colores, 2 tamaños de fuente, 2 sombras, 2
  animaciones. Ningún token existente cambia de valor — es aditivo.
- `src/shell/categoryColors.ts` es un archivo nuevo, propiedad del shell (no de
  ningún juego): mapea categoría → clases de Tailwind ya completas (necesario
  para que el JIT de Tailwind las detecte; construirlas con un template string
  en tiempo de ejecución no funciona).
- Los juegos individuales no se tocan por esta ADR — el pulido vive en el shell
  (`GameCard`, `ResultPanel`, `ModePicker`, `ConfirmDialog`, `PressButton`,
  pantallas de Stats/Config) y en `PressButton`, que ya usan los ~25 juegos, así
  que la mejora de tacto llega gratis a los controles de todos ellos sin tocar
  `logic.ts`/`ui.tsx` de cada uno.
- Si un juego nuevo necesita un color de categoría que no exista todavía, se
  suma a `categoryColors.ts` reusando los tokens actuales primero; solo se
  agrega un token nuevo a `tailwind.config.ts` (con su verificación de
  contraste) si de verdad no alcanza con los que hay.
