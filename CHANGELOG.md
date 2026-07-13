# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.30.0] — Auditoría integral: robustez, responsividad y consistencia

### Corregido

- **Grupos**: en Progresivo, el grado 10 podía pedir 6 tipos de ficha cuando la interfaz solo dibuja 5, haciendo crashear el juego al llegar tan lejos. Se topa `colorCount` en `TILE_TYPE_COUNT`, igual que ya hacía Memorama con sus pares.
- **Mastermind numérico**: `attemptsUsed` solo contaba los intentos de la última ronda jugada (se reiniciaba en cada ronda nueva), subestimando el total real en Tranquilo y Progresivo. Ahora acumula los intentos de toda la sesión en un contador aparte que nunca se resetea entre rondas.
- El selector de modo y la pantalla de resultado quedaban pegados arriba con un vacío grande debajo en tablet/PC (afectaba a todos los juegos por igual, ya que vive en el shell): la causa era un `min-h-full` que no se resuelve de forma confiable contra un padre cuya altura sale de `flex-grow`; se reemplazó por `flex-1`.

### Cambiado

- **Responsividad (PC/celular/tablet, vertical/horizontal)**: el contenido de toda la app ahora vive en un contenedor centrado de ancho acotado (`max-w-4xl`) en vez de estirarse a todo el ancho en pantallas grandes; la grilla del catálogo pasa de 2 columnas fijas a 2/3/4 según el ancho disponible. Se reemplazó `min-h-screen`/`vh` por `min-h-dvh`/`dvh` en los 25 juegos y el shell para evitar saltos de layout cuando la barra de direcciones del navegador móvil aparece o desaparece.
- **Cifras**: era el único juego sin sonido; ahora usa `audio` (ADR-006) para fichas, combinaciones, deshacer, reiniciar y envío. Se migró del `setInterval` propio a `useSecondsLeft`/`CountdownBar`/`PressButton` del kit de interacción (ADR-005, mismo patrón que el resto del catálogo) y se agregaron atajos de teclado (dígitos para elegir fichas, `+-*/` para combinar, Enter para enviar, Backspace para deshacer).
- Simon, Lights Out y Memoria espacial reemplazan sombras con color hardcodeado (`rgba(...)`) por `theme(colors.*)`, así quedan atados a la paleta de `tailwind.config.ts` en vez de duplicar sus valores.
- El catálogo memoiza los récords de los ~25 juegos en un solo cálculo por montaje en vez de recalcularlos en cada card en cada render.
- Se agregaron `role="group"`/`aria-pressed` a los selectores de categoría, dificultad y modos especiales para que su estado se anuncie correctamente con lector de pantalla.
- Cascada ahora documenta en su encabezado, como el resto de los clones, el nombre original de la mecánica que evita usar por marca registrada (PRD 11.2).
- `docs/PRD.md`: se corrige la sección 11 y el registro de decisiones (17.1), que seguían listando Buscaminas como eliminado del catálogo pese a haberse sumado como juego #24.

### Eliminado

- `src/core/timer.ts` (`createCountdown`/`createInterval`) y `randomFloat` de `src/core/random.ts`: sin ningún uso en el código, cada juego con reloj ya resuelve el suyo con `setTimeout`/`setInterval` propio o con `useSecondsLeft`.
- Formatter `strings.result.score` sin uso (el panel de resultado ya renderiza el puntaje directo).

### Tests

- Nuevos casos para el crash de Grupos, el conteo acumulado de Mastermind numérico, y los modos fijos (base + bono por tiempo) de Secuencias numéricas y Estimación relámpago, que solo tenían cobertura de Tranquilo/Progresivo.
- Nonograma suma un solver de fuerza bruta con poda por columna que verifica en cada corrida que las imágenes del banco (`puzzles.ts`) tengan solución única, en vez de confiar solo en el comentario que dice que se verificaron a mano.

## [0.29.0] — Grupos: vigésimo quinto juego del catálogo

### Agregado

- **Grupos** (Espacial, estilo SameGame): tocá un grupo de 2 o más fichas iguales, conectadas en horizontal o vertical, para limpiarlas; las de arriba caen y las columnas vacías se corren hacia la izquierda. Cuantas más fichas tenga el grupo, más puntos — conviene esperar grupos grandes en vez de tocar el primero que aparece. Nombre original (PRD 11.2): el mecanismo nació como "Chain Shot!" y se popularizó como "SameGame", de dominio público, pero se usa un nombre en español por consistencia con el resto del catálogo. Fácil/Medio/Difícil varían el tamaño del tablero y la cantidad de colores; Tranquilo encadena 3 tableros con puntos fijos por grupo (sin premiar los grupos grandes); Progresivo recorre los 10 grados, un tablero por grado, sin techo de tamaño. Sin tensión con RNF-04: el ancho de grilla se mantiene en 5-6 columnas en todas las dificultades.
- Cada tipo de ficha combina color y glifo (RNF-05): agrupar nunca depende solo del color, alcanza con la forma (círculo, cuadrado, triángulo, diamante, estrella).
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.28.0] — Buscaminas: vigésimo cuarto juego del catálogo

### Agregado

- **Buscaminas** (Lógica): descubrí todas las celdas sin minas, guiándote por los números vecinos; una celda con 0 minas vecinas revela en cascada, como el clásico. El primer toque siempre es seguro: las minas recién se colocan después de conocerlo, evitando esa celda y sus vecinas, para que nunca termine la partida de entrada ni deje un tablero trivial. Un botón de "modo bandera" reemplaza al clic derecho de la versión de escritorio (no hay equivalente táctil estándar): activado, tocar una celda la marca o desmarca en vez de descubrirla. Fácil/Medio/Difícil varían la densidad de minas (no el tamaño de grilla, topado en 6×6 a 9×9 por RNF-04 — bien por debajo del clásico 9×9/16×16/16×30 de escritorio); Tranquilo (ADR-007, "sin game over") arma un tablero nuevo al tocar una mina en vez de terminar la sesión, igual que el respawn de Serpiente, hasta que el jugador toca "Terminar". Sin Progresivo: como Sudoku, Nonograma y Empuja cajas, es una ronda única de pensamiento.
- Cada celda descubierta muestra la cantidad de minas vecinas como número, nunca solo un color (RNF-05); las celdas sin marcar, marcadas y descubiertas también se distinguen por su contenido (vacía, bandera, número o mina), no solo por el estilo.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 4 modos.

## [0.27.0] — Empuja cajas: vigésimo tercer juego del catálogo

### Agregado

- **Empuja cajas** (Lógica, estilo Sokoban): empujá las cajas hasta que todas queden sobre su objetivo, moviéndote en las 4 direcciones (D-pad o flechas del teclado); una caja solo se empuja si no hay pared ni otra caja detrás. Nombre original (PRD 11.2): "Sokoban" es una marca históricamente asociada a Thinking Rabbit. Banco de 8 niveles precargados y verificados (`puzzles.ts`, 2 por dificultad) en vez de generación en vivo: Sokoban es PSPACE-completo en general, así que garantizar que un nivel al azar sea resoluble es difícil (riesgo ya anotado en PRD sección 16). Cada nivel se verificó con un solver de BFS sobre (posición del jugador, posiciones de las cajas) que confirmó que es resoluble y calculó el largo de una solución óptima exacta (no una referencia aproximada) — el mismo solver se reescribió en los tests para verificarlo de forma permanente, no solo al transcribir. Empujar una caja a un rincón sin objetivo puede dejar el nivel sin solución: en vez de detectar puntos muertos, hay un botón de reinicio siempre disponible. Fácil/Medio/Difícil varían la cantidad de cajas (1 a 3); Tranquilo usa un nivel de dificultad media sin puntaje por eficiencia. Sin Progresivo, a propósito: como Sudoku y Nonograma, es una ronda única de pensamiento sobre un nivel curado.
- Cada caja ya colocada en su objetivo se marca con un tilde además de cambiar de color (RNF-05): nunca depende solo del color.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 4 modos.

## [0.26.0] — ¿Coincide?: vigésimo segundo juego del catálogo

### Agregado

- **¿Coincide?** (Memoria, estilo N-back): una secuencia de símbolos aparece de a uno; para cada uno hay que decidir si es igual al de N lugares atrás. N (cuántos lugares hay que recordar) es la palanca principal de dificultad: Fácil compara con el símbolo inmediato anterior (1 atrás), Medio con el de hace 2, Difícil con el de hace 3; Tranquilo usa 2 atrás sin reloj; Progresivo recorre los 10 grados sin techo de N. Cada secuencia se genera con una proporción controlada de coincidencias reales (si fuera puro azar, "no coincide" sería casi siempre la respuesta trivial). Presentado sin ninguna promesa de mejora cognitiva (PRD 1.1) — es un desafío de memoria momentánea puntual, como Simon o Memorama, no una herramienta de entrenamiento.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.25.0] — Tríos: vigésimo primer juego del catálogo

### Agregado

- **Tríos** (Lógica, estilo SET): de un tablero de cartas, encontrá 3 cuya combinación de color, forma, cantidad y relleno sea siempre "todas iguales o todas distintas" en cada atributo. Nombre original (PRD 11.2): el juego de cartas "SET" es marca registrada de SET Enterprises. Cada tablero se arma garantizando un trío por construcción —dadas dos cartas cualesquiera del mazo de 81, existe exactamente una tercera que completa un trío válido— en vez de mezclar al azar y verificar por fuerza bruta, mismo criterio que Apagá todo o el Rompecabezas deslizante. Fácil/Medio/Difícil varían el tamaño del tablero (9 a 15 cartas) y el tiempo por tablero; Tranquilo usa tablero medio sin reloj; Progresivo recorre los 10 grados sin techo de tablero. Un trío inválido no termina el tablero: da aviso y se puede reintentar, solo resta puntos por eficiencia.
- Nota breve sobre RNF-05: de los 4 atributos, 3 nunca dependen del color (forma, cantidad y relleno se distinguen por trazo/opacidad); el color es apenas uno de cuatro, y se usan 3 colores del sistema con separación de matiz alta (amarillo/violeta/celeste), evitando el par rojo/verde, igual criterio que Nombra el color.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.24.0] — Rompecabezas deslizante: vigésimo juego del catálogo

### Agregado

- **Rompecabezas deslizante** (Espacial, estilo 15-puzzle): deslizá las fichas hacia el hueco hasta ordenarlas 1..n²-1. El tablero se arma deslizando fichas al azar desde el estado ordenado (evitando deshacer el último movimiento), así queda garantizado que siempre es resoluble sin necesitar detectar la paridad de la permutación —el problema clásico de mezclar un 15-puzzle al azar—; verificado además de forma independiente con la fórmula estándar de paridad de inversiones en los tests. Sin condición de derrota: el puntaje pondera movimientos contra la cantidad usada para mezclar (una referencia razonable, no necesariamente la óptima). Fácil/Medio/Difícil son el clásico 8-puzzle/15-puzzle/24-puzzle (3×3 a 5×5); Tranquilo encadena 3 tableros sin puntaje por eficiencia; Progresivo recorre los 10 grados — a diferencia de Apagá todo o Tabla de Schulte, acá el tamaño de grilla no tiene que toparse por RNF-04 (hasta un tablero de 6×6 deja celdas muy por encima de los 44 px mínimos), así que crece libremente en los grados 9-10.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.23.0] — Nombra el color: decimonoveno juego del catálogo

### Agregado

- **Nombra el color** (Velocidad, efecto Stroop): tocá el botón del color en el que está pintada la palabra, ignorando lo que dice — a veces coinciden (ensayo congruente), a veces no (incongruente, el conflicto clásico del efecto Stroop). Fácil/Medio/Difícil varían la proporción de ensayos incongruentes (20% a 85%) y el tiempo por pregunta (5 s a 3 s); Tranquilo usa conflicto medio sin reloj; Progresivo recorre los 10 grados, con los grados 9-10 extrapolando la proporción de conflicto más allá del 85% de Difícil (sin problema de dificultad estructural: a diferencia de Sudoku o Nonograma, acá no hay grilla que tope un tamaño de celda).
- Nota de diseño documentada sobre RNF-05: en este juego el color ES la información a evaluar — es la esencia del efecto Stroop, un paradigma científico y no una elección de diseño evitable. Se usan los 4 colores del sistema con mayor separación de matiz entre sí (amarillo/violeta/naranja/celeste), evitando a propósito el par rojo/verde —el más común entre daltonismos— para no sumarle al juego una dificultad ajena a su propósito; además cada botón de respuesta siempre lleva el nombre del color en texto, así identificar las opciones nunca depende solo del color.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.22.0] — Anagramas: decimoctavo juego del catálogo

### Agregado

- **Anagramas** (Palabras): reordená las fichas de letras tocándolas hasta formar la palabra oculta. Cada toque en la bandeja coloca la ficha en el próximo casillero libre de la respuesta; tocar un casillero ocupado la devuelve a la bandeja. Sin límite de intentos ni game over: el puntaje premia la eficiencia de movimientos contra el mínimo teórico (una colocación por letra). Banco propio de palabras por largo (4/5/6, mismo criterio de "sin tildes ni eñe" que Palabra del día, aunque en su propia carpeta autocontenida). Fácil/Medio/Difícil varían el largo de palabra (4 a 6) con 5 palabras por sesión; Tranquilo encadena 8 palabras sin puntaje por eficiencia; Progresivo recorre los 10 grados — el largo topa en 6 letras (el diccionario no llega más lejos, igual que Palabra del día) y los grados 9-10 extrapolan agregando fichas señuelo (letras de más, ajenas a la palabra) en vez de alargarla más.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.21.0] — Nonograma: decimoséptimo juego del catálogo

### Agregado

- **Nonograma** (Lógica, estilo Picross): pintá las celdas según las pistas numéricas de fila y columna hasta revelar el dibujo oculto. Banco de 4 imágenes precargadas y verificadas (`puzzles.ts`) por el mismo motivo que Sudoku (PRD sección 16): garantizar solución única generando en vivo es difícil, así que cada imagen se verificó offline con un solver de propagación de restricciones + backtracking que confirmó exactamente una solución antes de entrar al banco. Las pistas de fila/columna se derivan en tiempo de ejecución a partir de la imagen. Fácil/Medio/Difícil varían el tamaño de la grilla (5×5 a 10×10); Tranquilo usa una grilla 6×6 sin puntaje por eficiencia. Sin condición de derrota: el puntaje pondera cantidad de celdas pintadas contra los toques totales. Sin Progresivo, a propósito: como Cifras y Sudoku, es una ronda única de pensamiento, no un juego de rampa de 10 grados.
- Cada pista de fila/columna ya satisfecha se atenúa y se tacha en la interfaz — una señal tipográfica además del color (RNF-05), no solo un cambio de matiz.
- Nota de diseño documentada sobre RNF-04: igual que en Sudoku, una grilla de hasta 10 columnas no puede tener celdas de 44 px en un celular angosto — acá no hay forma de separar selección de acción (cada toque pinta una celda), así que se acepta el mismo trade-off que usan las apps de Picross en móvil.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 4 modos.

## [0.20.0] — Sudoku: decimosexto juego del catálogo

### Agregado

- **Sudoku** (Lógica): el clásico 9×9 — completá la grilla sin repetir número en fila, columna o caja de 3×3. Banco de 8 puzzles precargados y verificados (`puzzles.ts`) en vez de un generador en vivo: la generación de puzzles con solución única es difícil de garantizar (riesgo ya anotado en PRD sección 16), así que se usa el mismo patrón que el diccionario de Palabra del día — cada puzzle se generó por backtracking aleatorio y se verificó con un contador de soluciones que confirma exactamente una antes de entrar al banco. Fácil/Medio/Difícil varían la cantidad de celdas reveladas (40 a 25); Tranquilo usa una dificultad suave sin puntaje por eficiencia. Sin Progresivo, a propósito: como Cifras, es una ronda única de pensamiento, no un juego de rampa.
- Nota de diseño documentada sobre RNF-04: una grilla de 9 columnas no puede tener celdas de 44 px en un celular de 360 px — restricción matemática de la grilla clásica, no una elección. Se compensa así: el toque en la grilla solo selecciona una celda (acción puntual, no repetida); completar el número se hace en un teclado aparte de abajo, con teclas de 44 px de sobra. La corrección de cada celda combina color y peso de fuente (RNF-05): dada = negrita, ingresada bien = acento, mal = error — y las reglas del Sudoku siempre se pueden verificar mirando los números, nunca dependen solo del color.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 4 modos.

## [0.19.0] — Apagá todo: decimoquinto juego del catálogo

### Agregado

- **Apagá todo** (Lógica, estilo Lights Out): tocá las celdas para apagar toda la grilla — cada toque prende o apaga esa celda y sus vecinas ortogonales. Prendido/apagado se distingue por brillo, no por matiz (RNF-05): una diferencia de luminancia se percibe igual con daltonismo. La grilla se arma presionando celdas al azar desde el estado apagado, así queda garantizado que siempre tiene solución sin necesitar un solver. Fácil/Medio/Difícil varían el tamaño de grilla (4×4 a 6×6, la clásica 5×5 en Medio) y la mezcla; Tranquilo encadena 3 grillas; Progresivo recorre los 10 grados — el tamaño se topa en el de Difícil por los objetivos táctiles (RNF-04, mismo criterio que Tabla de Schulte) y los grados 9-10 extrapolan con más mezcla en vez de una grilla más grande. Nombre original (11.2): el juguete electrónico "Lights Out" es una marca registrada de Tiger Electronics.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.18.0] — Torres de Hanoi: decimocuarto juego del catálogo

### Agregado

- **Torres de Hanoi** (Lógica): mové toda la torre de discos al último poste en el mínimo de movimientos, sin poner nunca un disco más grande sobre uno más chico. Tocá un poste para levantar su disco de arriba, tocá otro para soltarlo; un movimiento inválido se rechaza con un destello, sin consumir el movimiento ni terminar la partida. Sin condición de derrota: el puntaje premia la eficiencia contra el óptimo matemático (2ⁿ−1 movimientos). Fácil/Medio/Difícil varían la cantidad de discos (3 a 5); Tranquilo encadena 3 torres sin puntaje por eficiencia; Progresivo recorre los 10 grados. Sin aleatoriedad (el puzzle siempre arranca igual): la única lógica pura de todo el catálogo que no necesita semilla.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.17.0] — Memorama: decimotercer juego del catálogo

### Agregado

- **Memorama** (Memoria): encontrá las parejas de cartas iguales dando vuelta de a dos. Cada carta es un glifo distinto (●■▲◆★✚▼◇□△✦✕), nunca solo un color (RNF-05). No hay forma de "perder" — el puntaje premia la eficiencia de movimientos en vez de una condición de derrota. Fácil/Medio/Difícil varían la cantidad de pares (6 a 10); **Tranquilo** encadena 3 tableros sin puntaje por eficiencia; **Progresivo** recorre los 10 grados con un tablero por grado, cada vez con más pares. El tablero fijo en 4 columnas evita el problema de tamaño de celda de Tabla de Schulte: acá agrandar la dificultad agrega filas, nunca achica las celdas por debajo de los 44 px mínimos (RNF-04).
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.16.1] — Crédito de autoría

### Agregado

- Línea de crédito al pie de Configuración: "Por **Francisco Tranchet** + IA.", con el nombre enlazado a LinkedIn (se abre en pestaña nueva) manteniendo el color del texto que lo rodea.

## [0.16.0] — Palabra del día: duodécimo juego, primero en la categoría Palabras

### Agregado

- **Palabra del día** (Palabras): adiviná la palabra secreta en una cantidad limitada de intentos — cada uno marca, letra por letra, si está en el lugar correcto, si está en la palabra pero en otro lugar, o si no está (estilo Wordle). Teclado propio en pantalla (QWERTY en español, con Ñ) en vez del teclado del sistema (PRD 10.7.3), coloreado con el mejor estado visto de cada letra. El estado de cada ficha nunca depende solo del color (RNF-05): las correctas llevan un ✓ y las presentes un ○, además del verde/amarillo. Fácil/Medio/Difícil varían el largo de palabra (4 a 6 letras); **Tranquilo** encadena 5 palabras sin game over; **Progresivo** recorre los 10 grados de ADR-007 — el largo de palabra se topa en 6 letras (el diccionario de este banco no tiene palabras más largas) y de ahí los grados 9-10 extrapolan acortando los intentos en vez de alargar la palabra.
- Banco de ~160 sustantivos comunes en español (sin tildes ni eñe — simplificación deliberada de v1) en `words.ts`, usado tanto para elegir el objetivo como para validar que un intento sea una palabra real.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

## [0.15.0] — Favoritos en el catálogo

### Agregado

- **Sección "Favoritos"**: cada tarjeta del catálogo suma una estrella para marcar/desmarcar el juego; los favoritos aparecen en una sección propia arriba de la grilla general (se oculta si no hay ninguno) y se persisten en `dm:settings` (v3), sobreviven a un reload. El botón de favorito es un elemento hermano del enlace de la tarjeta, no anidado dentro — un toque ahí nunca navega al juego.

## [0.14.0] — Red de contención en todo el shell

### Corregido

- **Pantalla en blanco en cualquier falla fuera de un juego**: `GameErrorBoundary` (PRD 5.6) solo protegía al componente del juego en sí — una excepción en el catálogo, las estadísticas, el selector de modo o el panel de resultado tumbaba todo el árbol de React sin ningún mensaje. Ahora `AppErrorBoundary` envuelve toda la app desde `main.tsx`: cualquier falla del shell muestra un panel con la opción de recargar en vez de dejar la pantalla vacía.
- **Ruta inexistente dejaba el área de contenido vacía**: `Routes` no tenía una ruta comodín, así que un hash que no matcheaba ninguna de las cuatro rutas declaradas (enlace viejo, typo, deep link roto) renderizaba `null` dentro de `<main>`. Se agrega `NotFoundScreen` en `path="*"` con una salida al catálogo.
- Encontrado en una revisión de código pedida tras un reporte de "sitio en blanco" en producción; no se pudo reproducir el reporte puntual (el pipeline de deploy y la actualización del service worker entre versiones probaron estar sanos), pero estos dos huecos eran una causa real y concreta de pantalla en blanco que ya no depende de reproducir el caso original para corregirse.

## [0.13.0] — Tabla de Schulte: undécimo juego del catálogo

### Agregado

- **Tabla de Schulte** (Velocidad): tocá los números de una grilla mezclada en orden ascendente, lo más rápido posible. Fácil/Medio/Difícil varían el tamaño de la grilla (4×4 a 6×6, la clásica de 5×5 en Medio); **Tranquilo** encadena 3 grillas sin cronómetro visible ni puntaje por tiempo (no compite); **Progresivo** recorre los 10 grados de ADR-007 con una grilla por grado — el tamaño se topa en el de Difícil (una grilla más grande bajaría las celdas de los 44 px mínimos de RNF-04 en un celular de 360 px), así que los grados 9-10 extrapolan exigiendo más velocidad en vez de una grilla más grande. En escritorio se tipea el número y Enter lo confirma, ya que una grilla de hasta 36 celdas no admite un atajo de teclado por celda.
- Generado con `npm run new-game` y registrado en `registry.ts`; cubierto por el test de contrato y el smoke de render en los 5 modos.

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
