# ADR-002 — Contrato de módulo de juego

**Estado:** aceptado · Fase 0

## Contexto

El PRD (sección 5.2) define el contrato `GameModule`/`GameProps`/`GameConfig`/`GameResult` de forma completa y no lo deja abierto a interpretación: es la "pieza central del sistema". Esta ADR no reinterpreta el contrato — se implementó literal en `src/core/contract.ts` — pero documenta las decisiones de diseño que quedaban abiertas al construir el shell y el primer juego ("Tiempo de reacción") sobre ese contrato.

## Decisiones

### Quién dispara `onQuit`

El contrato le da a cada juego un callback `onQuit(): void`, pero no especifica quién controla el botón "Salir" visible durante la partida (RF-04 lo ubica en el "encabezado común", fuera del componente del juego). Se resolvió así:

- El botón "Salir" del header vive en el **shell** (`GameScreen`), no dentro de cada juego. Al confirmarse, el shell desmonta el componente del juego (React limpia sus timers/efectos solo) y el shell mismo persiste un `GameResult` de abandono — no hace falta que el juego llame a `onQuit`.
- `onQuit` queda disponible para que un juego lo dispare **por iniciativa propia** (por ejemplo, un futuro "Rendirse" dentro de su propia interfaz). "Tiempo de reacción" no lo usa porque no tiene esa interacción interna.

### Qué pasa con un resultado abandonado (RF-06)

`onQuit()` no lleva datos. Cuando el usuario abandona, el shell sintetiza un `GameResult` mínimo: `completed: false`, `score: 0`, `durationMs` con el tiempo transcurrido desde que arrancó la partida, `metrics: {}`. Se persiste igual que cualquier resultado, para cumplir RF-06 sin pedirle al contrato que cambie.

### Acceso a sonido y vibración

El principio de arquitectura 4.2.2 ("los juegos no acceden a... configuración global") excluye que un juego lea el toggle de sonido/vibración directamente. Los 4 efectos de sonido de la sección 10.5 (acierto, error, récord, fin de partida) se disparan entonces **desde el shell**, en los puntos de contacto con el contrato:

- `onFinish` con score que supera el récord anterior → `record`.
- `onFinish` con partida completada (sin récord) → `success`.
- `onFinish` con partida no completada → `error`.
- Abandono confirmado (`onQuit`/salida por header) → `gameover`.

Un juego que necesite feedback sonoro más fino (por ejemplo, un beep por cada respuesta correcta) tendrá que esperar a una futura ADR que amplíe el contrato — no se resuelve improvisando un canal paralelo.

### Semilla por defecto

`GameConfig.seed` es opcional. Cuando el shell arranca una partida real (no un test), no pasa semilla: cada juego debe resolver `config.seed ?? Date.now()` (u otra fuente de entropía) para tener aleatoriedad real en juego, mientras que `logic.test.ts` siempre pasa una semilla fija.

## Consecuencias

- Los juegos quedan completamente desacoplados de `useSettingsStore`: ninguno lo importa, lo que preserva el principio 4.2.2 de punta a punta.
- Si un futuro juego necesita pausar (RF-04 lo permite "si el juego lo admite"), la pausa también la maneja el shell desmontando/ocultando el componente — el contrato no define un método `onPause`, y no hace falta agregarlo hasta que un juego lo requiera de verdad.
