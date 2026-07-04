# ADR-005 — Kit de interacción compartido para juegos (`src/core/ui/`)

**Estado:** aceptada · Julio 2026

## Contexto

La auditoría de usabilidad (PRD 10.7) fijó patrones de interacción que todo juego debe aplicar: acción en `pointerdown` con activación por teclado, auto-repetición al mantener, auto-foco del área de juego, barra de tiempo con respaldo numérico. Hasta ahora cada juego los implementaba copiando código: el botón de keypad estaba duplicado en dos juegos, el patrón `pointerdown` en cinco, el auto-foco en seis. La duplicación ya produjo deriva menor entre copias y multiplica el costo de corregir un patrón (N ediciones en vez de una).

## Opciones

1. **Seguir duplicando por juego.** Máxima independencia entre módulos; costo de mantenimiento creciente y deriva inevitable entre copias.
2. **Componentes compartidos en el shell.** Viola la arquitectura (PRD 4.2.1/4.2.2): un juego no conoce el shell más allá del contrato.
3. **Capa de primitivas de interacción en el core** (`src/core/ui/`). El core ya es la dependencia compartida legítima de los juegos (`contract`, `random`, `timer`); se amplía su rol con primitivas visuales de interacción que implementan los patrones 10.7 una sola vez.

## Decisión

Opción 3: se crea `src/core/ui/` con primitivas de interacción para juegos:

- `PressButton` — botón que dispara en `pointerdown` (con `preventDefault` para no robar foco), conserva la activación por teclado (click sintético con `detail === 0`), y opcionalmente auto-repite al mantener presionado (`repeatOnHold`). Variantes visuales con tokens (`control`, `key`, `primary`, `bare`).
- `useAutoFocus` — foco al contenedor del juego al montar (`preventScroll`).
- `CountdownBar` — barra de tiempo animada (`shrink-width`), reiniciable por `resetKey`.
- `useSecondsLeft` — segundos restantes en número, el respaldo cuando "reducir animaciones" congela la barra (RNF-06).

Reglas de la capa: solo primitivas de interacción agnósticas del juego — sin lógica de juego, sin estado del shell, estilos únicamente con tokens (PRD 10.1). **El contrato no cambia**: usar el kit es opcional, pero es la implementación canónica de los patrones 10.7 que exige la checklist 12.3.

## Consecuencias

- Corregir un patrón de interacción es una edición en un solo lugar.
- Los `ui.tsx` de los juegos se achican y se parecen más entre sí (O6).
- Nueva dirección de dependencia permitida explícitamente: juego → `core/ui` (ya existía juego → core).
- El shell no depende del kit (mantiene sus propios componentes); si en el futuro conviene unificar, será otra decisión.
