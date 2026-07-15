# Sistema de diseño — Desafíos Mentales

**Fuente única de referencia visual del proyecto** (ADR-009). Este documento
describe el estado vigente del sistema; las decisiones y su porqué viven en
`docs/decisions/` (ADR-003 paleta, ADR-004 minimalismo, ADR-008 detalle visual,
ADR-009 temas y capa semántica). Ante conflicto, manda la ADR más nueva y este
documento se corrige.

**Dónde vive cada cosa:**

| Pieza                              | Archivo                                    |
| ---------------------------------- | ------------------------------------------ |
| Tokens (nombres y escalas)         | `tailwind.config.ts`                       |
| Valores por tema (variables CSS)   | `src/styles/index.css`                     |
| Color por categoría del catálogo   | `src/shell/categoryColors.ts`              |
| Tokens en runtime (canvas)         | `src/core/theme.ts`                        |
| Kit de interacción                 | `src/core/ui/` (ADR-005)                   |
| Patrones de interacción validados  | `docs/PRD.md` sección 10.7                 |

---

## 1. Principios

1. **Minimalismo con calidez** (referencia: Elevate). Pocos elementos por
   pantalla y mucho aire; la personalidad sale del color por categoría, la
   geometría redondeada y las micro-animaciones — nunca de la decoración.
2. **El color siempre tiene un rol.** Cada color es un token con nombre de
   función; no existen colores "porque quedan lindos" ni valores hex en
   componentes. La información nunca depende solo del color (RNF-05).
3. **Una jerarquía por pantalla.** Un solo elemento "hero" (el puntaje, el
   tablero, el título); todo lo demás lo acompaña un escalón abajo.
4. **Los juegos heredan, no definen.** Un juego consume tokens y kit de
   interacción; jamás define colores, fuentes, tamaños ni sombras propias.
5. **Todo cambio de token pasa por una ADR** (CLAUDE.md). Este documento se
   actualiza en el mismo commit.

---

## 2. Temas y color

Dos temas: **claro (default)** y **oscuro**, más "Sistema" (sigue
`prefers-color-scheme`). La preferencia vive en Configuración y se aplica
estampando `data-theme` en `<html>`; los tokens de Tailwind apuntan a
variables CSS con un valor por tema, así que **las clases no saben de temas**:
`bg-surface` es "superficie del tema activo", siempre.

### 2.1 Roles de color

| Token            | Rol                                                                            |
| ---------------- | ------------------------------------------------------------------------------ |
| `bg`             | Fondo de la app. También color del texto sobre acentos sólidos (`text-bg`)    |
| `surface`        | Superficie apoyada sobre el fondo: tarjetas, filas, teclas, tableros          |
| `surface-alt`    | Bordes de superficie, superficies secundarias, pistas deshabilitadas          |
| `text-primary`   | Texto principal, títulos, valores                                              |
| `text-secondary` | Texto de apoyo: descripciones, etiquetas, estados vacíos                      |
| `accent-primary` | LA interacción: botón primario, link, foco visible, selección activa          |
| `accent-success` | Semántico: acierto, récord, "Activado"                                        |
| `accent-error`   | Semántico: error, peligro, "Salir"/"Borrar"                                   |
| `game-1..6`      | Colores de juego y de categoría (ver 2.2); libres dentro de un tablero        |

### 2.2 Valores por tema

Ambas paletas validadas AA (≥ 4.5:1 contra `bg` y `surface`; los valores
numéricos están en ADR-009 y ADR-003/008). La oscura es la histórica, sin
cambios.

| Token            | Claro     | Oscuro    |
| ---------------- | --------- | --------- |
| `bg`             | `#f4f2fa` | `#0f0e17` |
| `surface`        | `#ffffff` | `#1a1826` |
| `surface-alt`    | `#e4e0f0` | `#26223a` |
| `text-primary`   | `#211d36` | `#f4f4f2` |
| `text-secondary` | `#5a5474` | `#a6a2bd` |
| `accent-primary` | `#0a736c` | `#3fd0c9` |
| `accent-success` | `#337a2b` | `#6bcf63` |
| `accent-error`   | `#c9134e` | `#f4557a` |
| `game-1` ámbar   | `#8a6a00` | `#ffcd4b` |
| `game-2` violeta | `#6a3fd8` | `#8a6dff` |
| `game-3` naranja | `#a44a05` | `#ff8b3d` |
| `game-4` celeste | `#0b6a9e` | `#3fa7d6` |
| `game-5` orquídea| `#93368f` | `#b56ee0` |
| `game-6` índigo  | `#4a51d8` | `#6b7ff0` |

Color por categoría (`categoryColors.ts`): matemática→1, memoria→2,
velocidad→3, lógica→4, palabras→5, espacial→6.

### 2.3 Reglas de uso

- **Texto sobre acento sólido: siempre `text-bg`** (`bg-accent-primary text-bg`).
  Nunca `text-white`/`text-black` — no existen como tokens.
- **Tintes**: acento al 10–25% de opacidad como fondo (`bg-game-1/15` chip de
  ícono, `bg-game-1/25` región de tablero), 40% para bordes (`border-game-2/40`).
- **Los semánticos no se reciclan**: `accent-success`/`accent-error` significan
  acierto/error, no "verde/rosa que combina".
- **Canvas**: nunca hex propios — `themeColor('accent-primary')` de
  `src/core/theme.ts`, resuelto al montar.
- **Agregar un color nuevo**: primero intentar con los 14 que hay; si de verdad
  falta, ADR + valor para AMBOS temas + verificación AA contra `bg` y `surface`
  de cada tema (script de referencia en ADR-009).

---

## 3. Tipografía

Una sola familia (**Inter**, self-hosted); "display" y "body" son roles de peso,
no fuentes distintas. La jerarquía sale del peso y el tamaño, jamás de cambiar
de tipografía.

| Escala | Tamaño   | Uso                                                        |
| ------ | -------- | ---------------------------------------------------------- |
| `xs`   | 0.75rem  | Metadatos: etiqueta de categoría, hints, pies              |
| `sm`   | 0.875rem | Texto de apoyo: descripciones de tarjeta, estados          |
| `base` | 1rem     | Texto de lectura: instrucciones, filas de configuración    |
| `md`   | 1.125rem | Énfasis dentro del contenido; subtítulos                   |
| `lg`   | 1.25rem  | Título de sección/panel ("¡Récord nuevo!", nombre de juego)|
| `xl`   | 2rem     | Título de pantalla (h1)                                    |
| `2xl`  | 2.75rem  | SOLO números hero: el puntaje del resultado                |

Pesos: regular (cuerpo), semibold (énfasis leve), bold (títulos de tarjeta,
botones), extrabold (h1, puntajes). Regla rápida: título de pantalla =
`font-display text-xl font-extrabold`; título de tarjeta =
`font-display text-base font-bold`; descripción = `text-sm text-text-secondary`.

---

## 4. Espaciado, radios y elevación

- **Espaciado**: escala de Tailwind por defecto. Ritmos del proyecto: `gap-1`
  dentro de un control compuesto, `gap-2`/`gap-3` entre elementos hermanos,
  `gap-6` entre secciones, `p-4` como padding estándar de pantalla y tarjeta.
  Token especial: `touch` = 44px, el mínimo táctil (RNF-04) — `min-h-touch`
  en todo control.
- **Radios**: `rounded-lg` para controles (botones, teclas, celdas, chips de
  ícono), `rounded-xl` para contenedores (tarjetas, diálogos, paneles),
  `rounded-full` para píldoras e insignias. Nunca esquinas rectas.
- **Elevación**: dos niveles, tokenizados por tema. `shadow-card` para lo
  apoyado (tarjetas, filas); `shadow-raised` para lo que flota (diálogos,
  panel de resultado). Nada más — un tercer nivel es señal de que el layout
  se complicó de más.

---

## 5. Movimiento

Sutil y con propósito; siempre subordinado a "reducir animaciones" (RNF-06:
la regla global lo neutraliza — no hace falta hacer nada por animación).

| Animación          | Cuándo                                              |
| ------------------ | ---------------------------------------------------- |
| `animate-fade-in`  | Entrada de cada pantalla (200ms)                     |
| `animate-pop`      | Celebración puntual: récord nuevo (420ms, con rebote)|
| `active:scale-95` + `transition` | Todo control al tocarlo (vía `PressButton` o a mano) |
| `shrink-width`     | Barra de cuenta regresiva (`CountdownBar`)           |

Regla: ninguna información depende solo de una animación (siempre hay
respaldo estático — ej.: `useSecondsLeft` junto a `CountdownBar`).

---

## 6. Layout responsive

Celular vertical es la plataforma base; todo lo demás se define como
adaptación explícita, no como accidente.

### 6.1 Breakpoints (los de Tailwind, con intención asignada)

| Breakpoint | Disparador | Intención                                            |
| ---------- | ---------- | ----------------------------------------------------- |
| (base)     | < 640px    | Celular vertical: 2 columnas de catálogo, una columna de contenido |
| `sm:`      | ≥ 640px    | Celular horizontal / phablet: 3 columnas de catálogo  |
| `lg:`      | ≥ 1024px   | Tablet horizontal / PC: 4 columnas de catálogo        |
| `short:`   | apaisado **y** alto ≤ 480px | Celular horizontal en partida: tablero y controles lado a lado (`GameLayout`). El disparador es la altura — una tablet apaisada no lo necesita y no lo activa |

### 6.2 Reglas

- **Contenedor**: todo el contenido vive en `max-w-4xl` centrado (App.tsx).
  Los tableros de juego acotan su propio ancho (`max-w-[22rem]` típico para
  grillas táctiles) y quedan centrados dentro del marco.
- **Altura**: `min-h-dvh`/`dvh` siempre — nunca `vh` (salta con la barra de
  direcciones del navegador móvil).
- **Área segura iOS**: la navegación inferior respeta
  `env(safe-area-inset-bottom)`.
- **Grillas de juego**: el tamaño de celda nunca baja de 44px (RNF-04). Si la
  dificultad agranda la grilla, se agregan filas o se acepta la excepción
  documentada (Sudoku/Nonograma) — nunca se achica la celda en silencio.
- **Orientación (`GameLayout`, core/ui)**: en celular horizontal (`short:`),
  un juego de tablero + controles se reacomoda a dos columnas — tablero a la
  izquierda, HUD y controles a la derecha — así la partida entra completa sin
  scrollear. La primitiva tiene tres slots (`hud`/`board`/`panel`); el juego
  acota el alto de su tablero con `short:` (ver Snake/Cascada) y esconde los
  textos de ayuda largos (`short:hidden`). Aplicada donde scrollear rompe la
  partida (tiempo real y keypads: Snake, Cascada, Aritmética, Secuencias);
  para juegos de tablero puro (Sudoku, Nonograma…) el layout vertical
  centrado con scroll sigue siendo el fallback aceptado — son juegos de
  pensar, no de reflejos.

### 6.3 Checklist responsive para pantalla/juego nuevo

- [ ] Se ve bien a 360px de ancho (celular angosto).
- [ ] No desborda horizontal en ningún breakpoint.
- [ ] Controles ≥ 44px en todas las dificultades.
- [ ] `dvh`, no `vh`.
- [ ] Probado también en horizontal (740×360): si el juego tiene controles
      propios, usa `GameLayout` y entra sin scrollear; si es tablero puro,
      al menos es usable con scroll.

---

## 7. Componentes (anatomía)

Especificación de las piezas repetidas — para construir igual sin adivinar.
La implementación canónica de los controles vive en `src/core/ui/` (ADR-005).

### Tarjeta de catálogo (`GameCard`)
`rounded-xl border border-surface-alt bg-surface p-4 shadow-card` +
`hover:border-accent-primary/60 active:scale-[0.98]`. Adentro: chip de ícono
sólido del color de la categoría con el glifo del juego en silueta
(`.icon-mask` + `bg-bg`, el rol "sobre acento" — theme-aware sin tocar los
`icon.svg`), título (`text-base font-bold`), descripción
(`text-sm text-text-secondary`), pie con categoría coloreada y récord en `xs`.

### Chip de filtro
Píldora `rounded-lg`: inactiva `bg-surface text-text-secondary`; activa =
fondo sólido del color de su categoría + `text-bg` (`activeBg` de
`categoryColors.ts`).

### Layout de partida (`GameLayout`, ADR-005/009)
Tres slots: `hud` (marcador/estado), `board` (el elemento principal), `panel`
(controles, acciones, ayudas). Vertical: se apilan en ese orden. Apaisado
corto (`short:`): tablero a la izquierda, HUD + panel a la derecha. Usarlo en
todo juego nuevo con controles propios; el tablero acota su alto con `short:`.

### Botones (`PressButton`, ADR-005)
Variantes: `control` (D-pad, acciones de tablero), `key` (tecla de keypad),
`primary` (única acción principal de la vista, `bg-accent-primary text-bg`),
`bare` (el juego trae sus clases, ej. celdas de grilla). Todos: `pointerdown`,
activación por teclado, `min-h-touch`, `active:scale-95`.

### Fila de configuración
`min-h-touch rounded-lg border border-surface-alt bg-surface px-4 shadow-card`,
etiqueta a la izquierda (`text-base`), estado/control a la derecha
(`text-accent-success` cuando está activo).

### Diálogo (`ConfirmDialog`)
Fondo `bg-bg/80`, panel `rounded-xl bg-surface p-6 shadow-raised`. Foco entra
a la opción segura; Escape y tocar el fondo cancelan (PRD 10.7.10).

### Panel de resultado (`ResultPanel`)
Puntaje en `text-2xl font-extrabold`; si hay récord nuevo:
`text-accent-success` + `animate-pop`. Acciones: una primaria ("Reintentar") y
salidas secundarias como texto.

### Insignias sobre tablero (pistas de Sol y luna, tildes de Sokoban…)
`rounded-full border border-surface-alt bg-surface`, contenido en
`text-text-secondary`, siempre glifo/texto — nunca solo color (RNF-05).

---

## 8. Accesibilidad (resumen operativo)

- Contraste AA verificado por token y por tema (sección 2) — no hace falta
  re-verificar al usar tokens según sus roles.
- La información nunca depende solo del color (RNF-05): glifo, texto o peso
  tipográfico como segunda señal, siempre.
- Táctil: 44px mínimo (RNF-04), acción en `pointerdown` (RNF-03).
- Teclado: todo jugable sin mouse (RNF-11); foco visible
  (`focus-visible:ring-2 ring-accent-primary`).
- Animaciones: respetar "reducir animaciones" es automático si se usan los
  tokens de movimiento (sección 5).
