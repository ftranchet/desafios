# ADR-009 — Sistema de diseño: capa semántica de tokens y tema claro/oscuro

**Estado:** aceptada · Julio 2026

## Contexto

El pedido del product owner fue doble: (1) que la app quede mucho más linda,
tomando como referencia la estética de Elevate, y (2) que exista un sistema de
diseño que estructure la visual con claridad y funcione en distintos tamaños y
orientaciones de pantalla.

El diagnóstico previo: el proyecto tiene una base sólida de tokens
(`tailwind.config.ts`, gobernados por ADR-003/004/008) pero no un sistema de
diseño completo. Faltaba una capa semántica (los tokens eran valores crudos con
el tema oscuro hardcodeado), no había reglas de layout/responsive escritas, ni
especificación de componentes, y la referencia visual estaba desparramada entre
tres ADRs, el PRD y dos archivos de código.

Además, la identidad de Elevate está fuertemente atada a su fondo claro con
colores saturados encima — y este proyecto era de tema oscuro único por
decisión explícita (ADR-003/004). `docs/game-plans/linkedin-elevate-clones.md`
ya había dejado anotado que adoptar el fondo claro requería su propia ADR.
Esta es esa ADR.

## Opciones

1. **Oscuro refinado**: mantener el tema único y adoptar solo la estructura de
   Elevate. Costo mínimo, pero nunca se ve "como Elevate".
2. **Solo tema claro**: migración abrupta, pierde a quienes prefieren oscuro.
3. **Capa semántica + claro y oscuro**: re-tokenizar los colores como variables
   CSS con un valor por tema; tema claro estilo Elevate como default, oscuro
   como opción (o seguir el sistema). El PRD ya contemplaba "tema claro" como
   extra de Fase 4.

## Decisión

Opción 3, elegida explícitamente por el product owner. En concreto:

### 1. Capa semántica de tokens (variables CSS)

Los colores de `tailwind.config.ts` pasan de valores hex a
`rgb(var(--color-<token>) / <alpha-value>)`. Las variables viven en
`src/styles/index.css`: `:root` define el tema claro (default) y
`:root[data-theme='dark']` el oscuro. Los nombres de clase que usan el shell y
los 28 juegos (`bg-surface`, `text-game-1`, `border-surface-alt/40`…) **no
cambian** — significan "el valor de ese rol en el tema activo". El formato con
`<alpha-value>` conserva los modificadores de opacidad (`bg-game-1/25`) que ya
usa todo el catálogo.

Las sombras (`shadow-card`/`shadow-raised`) también pasan a variables por tema:
el oscuro necesita sombras marcadas (hay poco contraste tonal con el fondo), el
claro las lleva suaves y difusas, al estilo Elevate.

### 2. Paleta clara, validada AA

Mismo criterio de ADR-003/008: todo color que actúa como texto o como fondo
sólido con texto `text-bg` encima debe dar ≥ 4.5:1 contra `bg` y `surface`.
(Nota: `text-bg` sobre un acento sólido es exactamente el par acento↔bg, así
que ambas condiciones se reducen a esas dos verificaciones por token.)
Verificada con la fórmula de luminancia relativa de WCAG:

| Token            | Claro     | vs bg | vs surface | Oscuro (sin cambios) |
| ---------------- | --------- | ----- | ---------- | -------------------- |
| `bg`             | `#f4f2fa` | —     | —          | `#0f0e17`            |
| `surface`        | `#ffffff` | —     | —          | `#1a1826`            |
| `surface-alt`    | `#e4e0f0` | —     | —          | `#26223a`            |
| `text-primary`   | `#211d36` | 14.63 | 16.23      | `#f4f4f2`            |
| `text-secondary` | `#5a5474` | 6.41  | 7.11       | `#a6a2bd`            |
| `accent-primary` | `#0a736c` | 5.14  | 5.70       | `#3fd0c9`            |
| `accent-success` | `#337a2b` | 4.78  | 5.30       | `#6bcf63`            |
| `accent-error`   | `#c9134e` | 5.13  | 5.70       | `#f4557a`            |
| `game-1`         | `#8a6a00` | 4.57  | 5.07       | `#ffcd4b`            |
| `game-2`         | `#6a3fd8` | 5.71  | 6.33       | `#8a6dff`            |
| `game-3`         | `#a44a05` | 5.32  | 5.90       | `#ff8b3d`            |
| `game-4`         | `#0b6a9e` | 5.30  | 5.88       | `#3fa7d6`            |
| `game-5`         | `#93368f` | 5.98  | 6.64       | `#b56ee0`            |
| `game-6`         | `#4a51d8` | 5.47  | 6.07       | `#4a51d8`→`#6b7ff0`  |

La paleta oscura es exactamente la histórica (ADR-003 + game-5/6 de ADR-008),
sin cambios: quien elige "Oscuro" ve la app de siempre.

### 3. Preferencia de tema

`theme: 'light' | 'dark' | 'system'` en el store del shell (`dm:settings` v4),
claro por defecto — también para quien migra de una versión anterior: el tema
claro es la cara nueva del producto y el oscuro queda a un toque en
Configuración. El shell estampa `data-theme` en `<html>`; un script inline en
`index.html` aplica la preferencia persistida antes del primer paint (sin flash
de tema equivocado) y `App.tsx` la mantiene al vivo (incluye seguir los cambios
de `prefers-color-scheme` cuando la preferencia es "Sistema") y alinea el
`meta theme-color` con el fondo del tema activo. `color-scheme` en CSS hace que
scrollbars y controles nativos acompañen.

### 4. Canvas por tokens en runtime (`src/core/theme.ts`)

Snake y Cascada dibujaban con copias hex de la paleta (un canvas no puede usar
clases de Tailwind). Se agrega `themeColor(token)`/`themeColorWithAlpha` al
core: resuelve el token contra las variables CSS del tema activo al montar el
juego, con fallback a la paleta oscura para jsdom (los smoke tests no cargan la
hoja de estilos). Se eliminan las copias hex.

### 5. Documento único de referencia: `docs/design-system.md`

Fundaciones (tokens y sus roles, ambos temas), reglas de layout responsive
(breakpoints con intención, contenedores, orientación) y especificación de
componentes (anatomía de tarjeta, chip, fila, diálogo, botones). Las ADRs
registran *decisiones*; el documento describe el *estado vigente* — ante
conflicto, mandan las ADRs más nuevas y el documento se corrige.

## Consecuencias

- Los 28 juegos y el shell heredan ambos temas sin tocar una línea propia — el
  retorno directo de la disciplina de tokens sostenida desde ADR-003.
- Toda incorporación futura de color pasa por las dos paletas y las dos
  verificaciones AA (el criterio queda documentado en `docs/design-system.md`).
- El manifest de la PWA (splash) toma los colores del tema claro por defecto;
  es estático, no sigue la preferencia — limitación conocida y aceptada.
- **Seguimiento resuelto (v0.37):** los íconos se renderizan como siluetas con
  `mask-image` y color semántico, por lo que funcionan en ambos temas sin
  duplicar SVG. `GameLayout` implementa el reacomodamiento de tablero +
  controles en celular horizontal. Ambos puntos eran pendientes al aceptar
  esta ADR y se conservan acá como trazabilidad, no como backlog vigente.
