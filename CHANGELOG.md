# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.6.0] — Auditoría de usabilidad táctil y de escritorio

### Corregido

- La navegación inferior ya no aparece durante el flujo de partida: un toque accidental en "Estadísticas" en pleno Snake ya no desmonta el juego sin confirmación ni registro del resultado (RF-06). La vuelta al catálogo ahora es explícita: botón "←" en selección de nivel y resultado, "Salir" con confirmación durante la partida.
- Cambiar de juego vía URL o historial remonta la pantalla de juego desde cero, en vez de heredar la fase de la partida anterior (la ruta `/game/:gameId` es la misma y React no desmontaba nada).
- El tablero de Snake ya no desborda en celulares de 360 px de ancho: el canvas es fluido con tope, y el de Cascada se achica en pantallas bajas en vez de empujar los controles fuera de la vista.
- En escritorio, los juegos toman foco al arrancar: las flechas (Snake, Cascada, Estimación), los dígitos (Aritmética, Secuencias) y Espacio (Tiempo de reacción) funcionan sin un clic previo sobre el tablero (RNF-11).
- Deslizar hacia abajo dentro de un juego ya no dispara pull-to-refresh (`overscroll-behavior`), y tocar rápido dos veces un control (pads de Simon, D-pad) ya no hace zoom (`touch-action: manipulation`).
- La barra de navegación queda siempre a la vista (sticky) y respeta el área segura de iOS (`env(safe-area-inset-bottom)`); antes quedaba bajo el indicador de inicio y, en pantallas largas, fuera de la vista.
- El diálogo de confirmación es operable por teclado: el foco entra a la opción segura, Escape cancela, Tab no se escapa del diálogo, y tocar el fondo también cancela.
- Se importa el peso 500 de Inter (se usaba sin estar cargado y el navegador lo sintetizaba) y la exportación de datos funciona de forma confiable en Safari.

### Cambiado

- **Aritmética contra reloj** y **Secuencias numéricas**: keypad numérico propio en pantalla en vez del teclado del sistema, que tapaba media pantalla y aparecía/desaparecía entre pregunta y feedback saltando el layout. Teclas de 44 px, layout estable entre fases, y el teclado físico sigue funcionando en escritorio (dígitos, Backspace, Enter, `-` en Secuencias).
- Los controles de juego actúan al apoyar el dedo (`pointerdown`), no al soltarlo: D-pad de Snake, botones de Cascada, pads de Simon y opciones de Estimación responden más rápido (RNF-03). La activación por teclado se conserva.
- **Cascada**: mantener presionado ◀ ▼ ▶ repite el movimiento (espera ~260 ms, cadencia ~110 ms), como la repetición de un teclado físico.
- Los juegos contra reloj muestran los segundos restantes en número junto a la barra: con "reducir animaciones" activo la barra se congela y el tiempo quedaba invisible (RNF-06).
- **Simon**: atajos de teclado `1`–`4` para los pads.
- Los récords del catálogo y las estadísticas dejan de re-parsear todo el almacenamiento en cada consulta (caché del JSON en memoria).

### Agregado

- **Cifras**: botón "Deshacer" que revierte la última combinación — un error de un paso ya no obliga a reiniciar la partida entera.
- **PRD sección 10.7**: patrones de interacción validados (táctil y escritorio), replicables para todo juego nuevo; la checklist de terminado (12.3) los incorpora.

## [0.5.0] — Rediseño del control táctil y legibilidad de Simon

### Cambiado

- **Snake**: el control táctil pasa a ser por seguimiento del dedo — mantenés el dedo sobre el tablero y la víbora se orienta hacia ahí de forma continua, en vez de deslizar de a un giro. Teclado y D-pad siguen disponibles.
- **Cascada**: la pieza se arrastra directamente con el dedo (varias columnas en un solo gesto), tocar rota y un envión hacia abajo hace la caída rápida, en vez de deslizar de a una columna. Teclado y botones en pantalla siguen disponibles.
- **Simon**: los pads ahora contrastan mucho más — en reposo quedan atenuados y el que se enciende da un salto de brillo, se agranda y tiene un resplandor, así se distingue sin esfuerzo. Cada pad suma un glifo propio (●/■/▲/◆), para no depender solo del color (RNF-05).

## [0.4.1] — Correcciones de robustez (feedback externo)

### Corregido

- **Snake** ya no descarta inputs: los giros se encolan, así que encadenar dos rápido (ej: arriba y después izquierda) ya no pierde el intermedio ni deja a la serpiente seguir de largo. Afecta a teclado, deslizamiento y botones por igual.
- El audio se "despierta" en el tap de "Jugar" (un gesto directo), para que los efectos que se disparan después desde temporizadores suenen la primera vez en iOS/Safari, donde reanudar el contexto fuera de un gesto no alcanza.
- `closestToTarget` (Cifras) usa un valor inicial explícito en el `reduce`: evita un `TypeError` sin controlar si alguna vez recibiera una lista vacía.

## [0.4.0] — Controles táctiles en pantalla para Snake y Cascada

### Agregado

- **RNF-11** (`docs/PRD.md`): todo juego debe ser jugable de punta a punta con teclado en escritorio, y los juegos en tiempo real deben ofrecer controles táctiles directos en pantalla en vez de depender solo del gesto de deslizar.
- **Snake**: D-pad de 4 botones (arriba/abajo/izquierda/derecha) debajo del tablero, con el mismo tamaño táctil (44px) y estilo del resto de la app. El deslizamiento y el teclado siguen funcionando igual que antes.
- **Cascada**: controles en pantalla con mover izquierda/derecha/abajo, rotar y caída rápida. El deslizamiento, el tocar el tablero para rotar y el teclado siguen funcionando igual que antes.

## [0.3.1] — Correcciones post-revisión

### Corregido

- **Cascada** ya no se congela al perder por top-out con caída rápida: la acción que provoca el fin del juego ahora finaliza la partida y conserva el puntaje, en vez de quedar trabada hasta salir (que además descartaba el puntaje como abandono).
- La pantalla de resultado ya no marca "¡Récord nuevo!" en la primera partida perdida con puntaje 0: solo es récord si supera el mejor puntaje previo.
- **Simon** ya no puede terminar injustamente por un toque en la transición entre rondas: los paneles se deshabilitan de inmediato hasta que empieza la próxima reproducción.
- La racha de días se mantiene viva si se jugó ayer pero todavía no hoy; solo se corta al saltear un día completo.
- Los récords (catálogo y estadísticas) ya no cuentan partidas abandonadas (puntaje 0): un juego solo abandonado vuelve a mostrar "Sin partidas todavía".
- El contexto de audio se reanuda si está suspendido, para que el primer efecto suene en móvil.

## [0.3.0] — Fase 2: Cascada y expansión matemática

### Agregado

- Juego **"Cascada"**: clon de Tetris sobre el mismo bucle de tiempo real que valida Snake — tablero 10×20, las 7 piezas estándar con randomizador de "bolsa de 7", rotación, pieza fantasma, hard drop, limpieza de líneas y velocidad creciente. Controles por teclado y por deslizamiento (sin d-pad en pantalla).
- Juego **"Secuencias numéricas"**: adivinar el próximo término de una secuencia (aritmética, geométrica o combinada según el nivel) contra un temporizador por pregunta.
- Juego **"Estimación relámpago"**: elegir cuál de dos expresiones vale más, con presión de tiempo y racha de aciertos.
- Juego **"Simon"**: repetir una secuencia de colores en una grilla 2×2 que crece una ronda a la vez, con los 4 colores del sistema.
- Los cuatro juegos completan la Fase 2 del PRD (sección 14): 5 niveles cada uno, tests de lógica con semilla fija, íconos propios. Sin cambios de contrato, tokens ni arquitectura del shell.

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
