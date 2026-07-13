# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.12.0] — Memoria espacial: décimo juego del catálogo

### Agregado

- **Memoria espacial** (Memoria, tipo Corsi): memorizá y repetí la secuencia de celdas que se van iluminando en una grilla de 3×3 — la única pista es la posición, nunca el color (RNF-05), y cada celda suena con un tono propio al destellar y al tocarla. Misma estructura que Simon (referencia de ADR-007 para juegos de secuencia creciente): Fácil/Medio/Difícil varían la velocidad de reproducción y el tope de rondas; **Tranquilo** hace que fallar repita la ronda en vez de terminar; **Progresivo** acelera la reproducción por grado con puntaje acumulativo multiplicado.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.11.0] — Código secreto: noveno juego del catálogo

### Agregado

- **Código secreto** (Lógica): deducí un código de dígitos distintos a partir de pistas de cada intento (exactos: dígito y posición correctos; parciales: dígito correcto en otra posición) — estilo Toro y vacas. Fácil/Medio/Difícil varían el largo del código (3 a 5 dígitos) y la cantidad de intentos; **Tranquilo** encadena 5 códigos sin game over (agotar los intentos de uno solo revela el código y pasa al siguiente); **Progresivo** recorre los 10 grados de ADR-007 con un código por grado, cada vez más largo y con menos intentos — fallar un grado termina la partida, como en Snake. Primer juego en usar la categoría "Lógica" del catálogo.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.10.1] — Deploy reparado y pulido

### Corregido

- **El sitio publicado estaba congelado en 0.7.0**: el workflow de deploy fallaba desde 0.8.0 porque en CI `vite preview` liga `localhost` a IPv6 y el health-check de Playwright contra `127.0.0.1` expiraba. El servidor de preview ahora liga `127.0.0.1` explícito (con timeout de 60 s) y los workflows corren en Node 22 (Node 20 llegó a su fin de vida).
- **Snake Progresivo**: el obstáculo que aparece al subir de grado ya no puede caer pegado a la cabeza (distancia ≤ 2) — sin muertes injustas.
- Botones "Terminar" del modo Tranquilo con padding horizontal correcto.

## [0.10.0] — Tranquilo y Progresivo en todo el catálogo

### Agregado

- **Cascada**: Tranquilo (caída fija y suave; el top-out limpia el tablero en vez de terminar, con botón "Terminar") y Progresivo (el grado sube cada 2 líneas: más velocidad, hasta superar al Difícil actual).
- **Simon**: Tranquilo (reproducción lenta; fallar repite la ronda en vez de terminar) y Progresivo (la reproducción se acelera por grado, puntaje acumulativo multiplicado por grado).
- **Secuencias numéricas** y **Estimación relámpago**: Tranquilo (sin reloj) y Progresivo (rampa de 20 preguntas/rondas que desbloquea patrones/complejidad por grado y achica el tiempo).
- **Cifras**: Tranquilo (sin límite de tiempo). Sin Progresivo a propósito: es una ronda única de pensamiento, no un juego de rampa — los modos se declaran donde tienen sentido (ADR-007).
- Con esto, los 8 juegos del catálogo declaran sus modos definitivos; el smoke de render los cubre a todos en todos sus modos.

## [0.9.0] — Dificultades y modos: Fácil/Medio/Difícil + Tranquilo y Progresivo (ADR-007)

### Cambiado

- **Los 5 niveles se reemplazan por 3 dificultades + 2 modos especiales.** Fácil/Medio/Difícil (equivalentes a los niveles 1/3/5 anteriores) más **Tranquilo** — sin relojes ni game over, no compite: sin récords ni fanfarria — y **Progresivo** — la partida recorre 10 grados de dificultad, del más fácil a más allá del Difícil actual (grados 9-10 extrapolan), con récord natural "¿hasta dónde llegaste?" (`maxStage`).
- **Los modos se declaran por juego** (`buildModes`, `src/core/modes.ts`): todos ofrecen las 3 dificultades; Tranquilo y Progresivo solo donde tienen sentido. **Aritmética contra reloj** (preguntas) y **Snake** (tiempo real) son las referencias con los 5 modos completos: en Snake Tranquilo chocar reacomoda la víbora y seguís (con botón "Terminar"), y en Progresivo cada 3 comidas sube el grado, acelera y aparece un obstáculo. Tiempo de reacción no declara Tranquilo (el juego ES un reloj). El resto suma sus modos especiales en próximas sesiones.
- **Contrato v2 (ADR-007)**: `GameMetadata.modes`, `GameConfig.mode` y `GameResult.mode` reemplazan a los niveles numéricos. El test de contrato valida la estructura de modos de todo juego registrado y el smoke de render monta cada juego en cada modo que declara — declarar un modo es quedar testeado en ese modo.
- **Récords e historial migran solos** (esquema v2 sobre el mecanismo versionado de 0.7.0): nivel 1-2 → Fácil, 3 → Medio, 4-5 → Difícil, conservando puntajes; `lastPlayed` migra igual. El selector nuevo muestra las dificultades como fila de 3 y los modos especiales como tarjetas con descripción.
- Generador `npm run new-game` actualizado a la estructura de modos (validado generando un juego de prueba); PRD sección 7 reescrita, RF-03/05/07 y checklist 12.3 actualizados.

## [0.8.0] — Escalabilidad del catálogo: kit de interacción, audio en juegos, generador y E2E

### Agregado

- **ADR-005 — Kit de interacción `src/core/ui/`**: `PressButton` (acción en `pointerdown` + teclado + auto-repetición opcional), `useAutoFocus`, `CountdownBar` y `useSecondsLeft`. Es la implementación canónica de los patrones del PRD 10.7; los ocho juegos ahora la importan en vez de duplicar el código (el keypad estaba copiado en dos juegos, el auto-foco en seis). Con tests propios del kit.
- **ADR-006 — Sonido dentro de los juegos** (primera ampliación del contrato desde ADR-002, aditiva y retrocompatible): `GameProps.audio` inyecta una capacidad de audio ya gateada por la configuración — con sonido apagado, implementación nula. **Simon por fin suena**: cada pad tiene su tono (C-E-G-C) en el destello y en el toque; Aritmética, Secuencias, Estimación y Tiempo de reacción dan feedback sonoro por respuesta.
- **Generador de juegos**: `npm run new-game <id> ["Nombre"]` crea `src/games/<id>/` completo (lógica pura con semilla, interfaz con el kit, tests, ícono) y lo registra. El esqueleto pasa los cinco checks sin tocar nada — validado generando un juego de prueba de punta a punta.
- **Suite E2E de humo** (`e2e/smoke.spec.ts`, Playwright): catálogo, partida completa de Snake con persistencia versionada, keypad de Aritmética, navegación de juego, diálogo de salida y configuración — contra el build de producción, en viewport táctil de celular. Corre en CI de ramas y antes de cada deploy.

## [0.7.0] — Robustez del shell

Sesión enfocada en que sumar juegos sea de bajo riesgo: las garantías quedan documentadas en la sección 5.6 del PRD.

### Agregado

- **Error boundary alrededor de cada juego**: una excepción en el render de un juego ya no tira abajo toda la app a pantalla blanca — muestra "El juego falló" con salida al catálogo, con el shell y los récords intactos.
- **Test de contrato del registro** (`registry.test.ts`): valida los metadatos de todos los juegos registrados (id único kebab-case, 5 niveles numerados 1–5, textos no vacíos, ícono, duración). Un juego nuevo queda cubierto con solo registrarse.
- **Smoke test de render** (`registry.render.test.tsx`): monta el componente de cada juego con semilla fija en niveles 1/3/5 (jsdom + Testing Library) — atrapa crashes de `ui.tsx` que los tests de lógica pura no ven.
- **CI en ramas** (`ci.yml`): formato, lint, tipos, tests y build corren en cada push a cualquier rama y en cada pull request, no solo antes del deploy de `main`.
- Tests de la capa de persistencia real (formato versionado, datos legados/corruptos, tope con retención de récords, saneo, cuota llena).

### Cambiado

- **El shell normaliza el `GameResult` en la frontera**: `gameId` y `level` se toman del juego/nivel que el shell montó, no de lo que el juego devuelva — un `buildResult` copiado de otro juego no puede corromper récords ajenos.
- **Persistencia blindada**: esquema versionado con lectura del formato legado, historial acotado a 500 resultados con retención del mejor por (juego, nivel) — los récords no caducan —, lectura que descarta entradas corruptas, saneo de números no finitos/negativos, y escritura tolerante a cuota llena o modo privado (fallar al persistir jamás rompe el cierre de una partida).
- El store de configuración persiste con versión de esquema explícita (mecanismo de migración listo para cambios futuros).

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
