# Plan: clones de los juegos de LinkedIn y los daily puzzles de Elevate

**Estado:** propuesta, sin implementar. Este documento es el análisis y el plan
de 9 juegos nuevos; no crea ningún módulo todavía. Referenciado desde
`docs/PRD.md` §11.3.

## Resumen ejecutivo

| # | Nombre propuesto | Inspirado en | Categoría | Generación | Complejidad |
| - | - | - | - | - | - |
| 1 | Minisudoku | LinkedIn Mini Sudoku | Lógica | En vivo (verificador) | Baja |
| 2 | Coronas | LinkedIn Queens | Lógica | En vivo (verificador) | Media |
| 3 | Sol y luna | LinkedIn Tango | Lógica | En vivo (verificador) | Media |
| 4 | Crucinúmeros | Elevate Daily Crossmath | Matemática | En vivo (por construcción) | Media |
| 5 | Retazos | LinkedIn Patches | Lógica | En vivo (verificador) | Media/Alta |
| 6 | Un trazo | LinkedIn Zip | Lógica | Banco curado | Alta |
| 7 | Enlaces | Elevate Daily Colorlink | Lógica | Banco curado | Alta |
| 8 | Sendero de palabras | Elevate Daily Wordbend | Palabras | Banco curado | Alta |
| 9 | Crucigrama | Elevate Daily Crossword | Palabras | Banco curado + contenido | Alta |

Orden de implementación sugerido: el de la tabla. Cada uno es una sesión de
Claude Code (CLAUDE.md: "una sesión = una unidad de valor"). Los primeros 5
reutilizan patrones que este repo ya probó (verificador por backtracking,
igual que el de unicidad de Nonograma agregado en la auditoría de julio;
generación por construcción, igual que Cifras/Aritmética). Los últimos 4
comparten una primitiva de interacción nueva (abajo) y, en el caso de
Crucigrama, requieren autoría de contenido (pistas), no solo algoritmo.

## Nota sobre el estilo visual de Elevate

Pediste tener en cuenta el estilo de Elevate. Ya incorporamos buena parte de
su espíritu en ADR-008 (recién mergeado): color por categoría, íconos
redondeados con chip de fondo, micro-interacciones de toque, celebración de
récord. Eso es exactamente lo que hace a Elevate sentirse "vivo" sin dejar de
ser claro.

Lo que **no** incorporamos, y que es una decisión aparte antes de tocar nada:
Elevate tiene fondo claro (blanco/gris muy claro) con colores saturados sobre
esa base. Este proyecto es oscuro por decisión explícita (ADR-003/004,
paleta validada contra contraste AA sobre `bg`/`surface` oscuros). Adoptar un
fondo claro no es un ajuste menor — cambia la paleta entera y su validación de
contraste, y ADR-004 ya documenta que un cambio de dirección visual así
necesita su propia ADR antes de implementarse (mismo criterio que cuando se
abandonó el pixel art). Si en algún momento querés explorar un tema claro
opcional (o un modo claro/oscuro conmutable), decílo explícitamente y lo
armamos como su propia ADR — no lo doy por sentado acá.

## Infraestructura nueva compartida: arrastrar un trazo por la grilla

Tres juegos (Un trazo, Enlaces, Sendero de palabras) necesitan el mismo gesto
que ningún juego actual usa: apoyar el dedo en una celda y arrastrar por
celdas adyacentes para dibujar un camino, con la posibilidad de "deshacer"
arrastrando hacia atrás sobre la penúltima celda (el gesto estándar de
Flow Free/Numberlink). Se construye una sola vez como parte del kit de
`src/core/ui/` (ADR-005 ya estableció esa carpeta como el lugar canónico; esto
es una implementación más de lo que esa ADR ya gobierna, no una decisión
nueva que necesite su propia ADR):

```ts
// src/core/ui/useGridPathDrag.ts (propuesto)
function useGridPathDrag(options: {
  cellAt(clientX: number, clientY: number): CellCoord | null; // hit-test propio del juego
  isAdjacent(a: CellCoord, b: CellCoord): boolean; // default: ortogonal
}): {
  path: CellCoord[];
  onPointerDown(e): void; // arranca el trazo en la celda tocada
  onPointerMove(e): void; // agrega la celda si es adyacente y no repetida;
                          // si es la penúltima celda del trazo, lo acorta (deshacer)
  onPointerUp(e): void;   // confirma el trazo
};
```

Se construye en "Un trazo" (el primero de los tres) y "Enlaces"/"Sendero de
palabras" lo reutilizan sin duplicar el gesto.

---

## 1. Minisudoku

**Categoría:** Lógica. **Basado en:** LinkedIn Mini Sudoku. **Sudoku** en sí
es un término genérico (como en el juego "Sudoku" que ya tiene este catálogo,
sin necesidad de evitarlo); no hay nombre que evadir acá, solo un tamaño de
grilla distinto.

**Mecánica:** grilla 6×6, cajas de 2×3. Completar 1–6 sin repetir en fila,
columna ni caja — igual que Sudoku, más chico y más rápido (2–8 min según la
búsqueda vs. 10–30 min de un 9×9).

**Generación:** a diferencia del Sudoku 9×9 de este catálogo (que usa banco
curado porque verificar unicidad en vivo a 9×9 es caro, según su propio
comentario en `logic.ts`), un 6×6 es lo bastante chico para generar **en
vivo**: generar una solución completa válida (backtracking simple, ~36
celdas), quitar celdas al azar y verificar unicidad con un solver de
backtracking acotado (mismo patrón que el verificador de unicidad de
Nonograma agregado en la auditoría de julio) — si quitar una celda rompe la
unicidad, no se quita. Rápido incluso en el dispositivo del jugador.

**Dificultad:** cantidad de celdas dadas (más celdas = más fácil), igual
paleta de parámetros que Sudoku. Tranquilo: dificultad suave, sin penalidad
por error. Sin Progresivo (ronda única de pensamiento, como Sudoku/Nonograma).

**Interacción:** igual que Sudoku ya resuelto en este catálogo (selección de
celda + teclado numérico); no hace falta ningún patrón nuevo.

**Complejidad:** Baja — es el candidato ideal para ir primero.

---

## 2. Coronas

**Categoría:** Lógica. **Basado en:** LinkedIn Queens. Se evita el nombre
"Queens" (producto de LinkedIn); el género es un N-Queens con regiones de
color en vez de restricción diagonal completa.

**Mecánica:** grilla N×N dividida en N regiones de color. Colocar exactamente
una corona por fila, por columna y por región; dos coronas no pueden ser
ortogonal ni diagonalmente adyacentes. Solución única.

**Generación en vivo:**
1. Generar una solución: colocar N coronas satisfaciendo fila/columna únicas
   y no-adyacencia (backtracking, grillas de 6×6 a 9×9 son triviales para
   esto).
2. Crecer N regiones de color alrededor de esa solución vía un flood-fill
   aleatorio (cada región arranca en la celda de su corona y crece por BFS
   aleatorio reclamando celdas vecinas libres) hasta cubrir la grilla.
3. Verificar unicidad con un solver de backtracking sobre la grilla ya
   coloreada (mismo patrón que el verificador de Nonograma). Si hay más de
   una solución, se re-crecen las regiones con otra semilla.

**Dificultad:** tamaño de grilla (6×6 Fácil, 7×7/8×8 Medio, 9×9 Difícil,
tope por RNF-04 igual que Sudoku/Nonograma). Tranquilo: grilla chica fija,
sin penalidad. Sin Progresivo (ronda única).

**Interacción:** tocar una celda cicla vacía → marca (X) → corona, patrón ya
usado en Nonograma/Buscaminas de este catálogo.

**Complejidad:** Media — el crecimiento de regiones es la única pieza nueva;
el verificador es una reutilización directa del patrón de Nonograma.

---

## 3. Sol y luna

**Categoría:** Lógica. **Basado en:** LinkedIn Tango. El género genérico es
"Binairo"/"Takuzu" (nombres de dominio público) con pistas de igualdad/
diferencia entre pares de celdas — se evita el nombre "Tango" (producto de
LinkedIn).

**Mecánica:** grilla 6×6, dos símbolos (sol/luna). Cada fila y columna: 3 de
cada símbolo, nunca 3 iguales consecutivos, ninguna fila ni columna se repite
exactamente. Pistas fijas entre pares de celdas adyacentes: "=" (mismo
símbolo) o "×" (símbolo distinto).

**Generación en vivo:**
1. Generar una grilla solución completa que cumpla las 3 reglas de conteo/
   no-tripleta/filas-columnas-únicas (backtracking, 6×6 es chico).
2. Elegir qué celdas quedan como pista `=`/`×` (en vez de dígito) y cuáles
   vacías, y verificar con un solver de backtracking que la combinación de
   pistas alcanza para una solución única — si no, ajustar cuántas pistas
   `=`/`×` se revelan.

**Dificultad:** cantidad de pistas reveladas (Fácil: más celdas y más pares
`=`/`×` dados; Difícil: casi todo por deducción pura). Grilla fija en 6×6 en
las 3 dificultades (es el tamaño en el que este género funciona bien; variar
el tamaño en vez de las pistas no está probado). Tranquilo: nivel Medio, sin
penalidad. Sin Progresivo.

**Interacción:** tocar celda cicla vacía → sol → luna; los pares `=`/`×` se
dibujan como un glifo pequeño en el borde compartido entre dos celdas.

**Complejidad:** Media — mismo patrón de verificador que Coronas, grilla más
chica y fija.

---

## 4. Crucinúmeros

**Categoría:** Matemática. **Basado en:** Elevate Daily Crossmath. El género
genérico es "Cross-Number puzzle" (dominio público, ver Erich Friedman y
similares); se evita el nombre "Crossmath®" (marca registrada de un producto
específico).

**Mecánica:** grilla en cruz con celdas de número y celdas de operador
intercaladas, formando ecuaciones horizontales y verticales que comparten
celdas como un crucigrama. Cada ecuación se resuelve con la precedencia
estándar (×/÷ antes que +/−). Algunas celdas de número vienen dadas; el resto
las completa el jugador para que las 3 ecuaciones horizontales y las 3
verticales (o más, según dificultad) cierren.

**Generación en vivo (por construcción, no por backtracking):** mismo
patrón que ya usan Cifras/Aritmética/Secuencias de este catálogo — se arma la
grilla "hacia adelante" (elegir operandos y operadores al azar, calcular los
resultados) en vez de resolver un puzzle ya armado. Esto evita necesitar un
solver: la validez queda garantizada por construcción. La unicidad de las
celdas vacías se asegura dando como pista todo resultado de fila/columna que
tenga una celda vacía (cada ecuación con una incógnita se resuelve con
aritmética directa, sin ambigüedad) — más incógnitas por ecuación solo si la
dificultad lo permite y se verifica con propagación de restricciones simple
(no backtracking pesado).

**Dificultad:** tamaño de la cruz (más ecuaciones) y cantidad de incógnitas
simultáneas por ecuación. Tranquilo: grilla chica, sin reloj. Sin Progresivo
(ronda única, como Cifras).

**Interacción:** tocar celda vacía + teclado numérico, similar a
Sudoku/Minisudoku.

**Complejidad:** Media — el riesgo principal es de diseño de plantilla (qué
formas de cruz dan ecuaciones interesantes), no de algoritmo.

---

## 5. Retazos

**Categoría:** Lógica. **Basado en:** LinkedIn Patches. El género genérico es
"Shikaku" (puzzle clásico de Nikoli: dividir la grilla en rectángulos según
un número de área), con el agregado de pistas de forma (cuadrado/alto/ancho).
Se evita el nombre "Patches" (producto de LinkedIn).

**Mecánica:** grilla dividida en rectángulos no superpuestos que cubren cada
celda exactamente una vez. Cada celda numerada es el "ancla" de un rectángulo
cuya área es ese número (un 6 puede ser 2×3, 3×2, 1×6 o 6×1); pistas
adicionales opcionales fijan la forma (cuadrado / alto / ancho). Cada
rectángulo contiene exactamente un número.

**Generación en vivo:**
1. Particionar la grilla en rectángulos aleatorios (partición recursiva:
   elegir un rectángulo, dividirlo en dos con un corte al azar, repetir).
2. Poner el número de área (y a veces la pista de forma) en una celda al
   azar de cada rectángulo.
3. Verificar unicidad con un solver de backtracking sobre particiones
   (mismo espíritu que el verificador de Nonograma/Coronas, pero el espacio
   de búsqueda es mayor — es el más pesado de los 5 "en vivo"). Si no
   confirma unicidad en un número acotado de pasos, se re-particiona con
   otra semilla en vez de forzar backtracking ilimitado.

Si en la implementación el verificador resulta demasiado lento para andar
bien en el dispositivo del jugador, la salida de emergencia documentada es la
misma que ya usa este catálogo para casos así (PRD sección 16): banco curado
de niveles pre-verificados, como Empuja cajas o Nonograma.

**Dificultad:** tamaño de grilla y cuántas pistas de forma se revelan (menos
pistas de forma = más ambigüedad para resolver por descarte). Tranquilo:
grilla chica, sin penalidad. Sin Progresivo (ronda única, como Nonograma).

**Interacción:** arrastrar desde una celda numerada para dibujar el
rectángulo (usa el mismo gesto de arrastre que la primitiva de "Un trazo",
adaptado a rectángulos en vez de camino libre) o, más simple para v1, tocar
dos celdas opuestas para definir las esquinas del rectángulo.

**Complejidad:** Media/Alta — el verificador de particiones es el más
pesado de los 5 juegos "en vivo"; primer candidato a bajar a banco curado si
el tiempo de generación no da la talla.

---

## 6. Un trazo

**Categoría:** Lógica. **Basado en:** LinkedIn Zip. El género genérico es
"Numberlink" (Nikoli) extendido a que el camino cubra cada celda de la
grilla; se evita el nombre "Zip" (producto de LinkedIn).

**Mecánica:** grilla con celdas numeradas 1..k y, opcionalmente, paredes
entre celdas. Dibujar un único camino ortogonal que visite cada celda de la
grilla exactamente una vez, pasando por las celdas numeradas en orden
ascendente, sin cruzar paredes. Solución única.

**Por qué banco curado y no generación en vivo:** generar un camino
hamiltoniano aleatorio que cubra toda la grilla ya es no trivial (DFS
aleatorio con retroceso en caducidad); lo genuinamente difícil es garantizar
que, dada la posición de los números elegidos sobre ESE camino, no exista
otro camino hamiltoniano distinto que también pase por esos mismos números en
el mismo orden — verificar eso es sensiblemente más caro que los
verificadores de los juegos 1–5 (el espacio de caminos hamiltonianos crece
mucho más rápido que el de rellenos de Nonograma o particiones de Shikaku).
Mismo criterio que ya aplica este catálogo a Empuja cajas/Nonograma/Sudoku
9×9 (PRD sección 16): cuando verificar unicidad en vivo es caro, banco
curado y verificado una vez, con el mismo solver reescrito en los tests para
que no dependa de una transcripción manual — patrón ya usado literalmente en
Empuja cajas.

**Dificultad:** tamaño de grilla y cantidad de paredes (más paredes = más
restringido el camino, más fácil de deducir; menos paredes = más
ambigüedad). Banco con 2-3 niveles por dificultad, como Empuja cajas.
Tranquilo: nivel de dificultad media, sin puntaje por eficiencia. Sin
Progresivo (ronda única sobre un nivel curado, como Empuja cajas).

**Interacción:** la primitiva nueva de arrastre (`useGridPathDrag`) — apoyar
en la celda "1" y arrastrar por celdas adyacentes; arrastrar hacia atrás
acorta el trazo.

**Complejidad:** Alta — es donde se construye la primitiva de arrastre nueva,
además del banco de niveles.

---

## 7. Enlaces

**Categoría:** Lógica. **Basado en:** Elevate Daily Colorlink. El género es
el mismo de "Flow Free"/Numberlink con múltiples pares de colores; se evita
tanto "Colorlink" (Elevate) como "Flow" (colisiona directamente con la marca
de la app competidora "Flow Free").

**Mecánica:** grilla con pares de puntos de colores. Conectar cada par con un
camino ortogonal propio; los caminos no pueden cruzarse ni superponerse; al
completar, cada celda de la grilla pertenece a algún camino (relleno total).

**Por qué banco curado:** a diferencia de los 5 primeros juegos, los puzzles
estilo Flow Free **no suelen tener garantía de solución única** en la
mayoría de las implementaciones existentes (la gracia es rellenar
válidamente, no deducir un único camino) — intentar forzar unicidad acá
sería inventarle una restricción que el género no tiene, y verificarla sería
al menos tan caro como en "Un trazo" (múltiples caminos simultáneos, más
espacio de búsqueda todavía). Banco curado esquiva el problema por completo:
cada nivel se arma y se verifica una vez (que tenga al menos una solución
válida, sin exigir unicidad), igual filosofía que Sudoku/Empuja cajas/
Nonograma frente a un problema de generación difícil.

**Dificultad:** tamaño de grilla y cantidad de colores/pares. Tranquilo:
grilla chica, sin puntaje por eficiencia. Sin Progresivo.

**Interacción:** reutiliza `useGridPathDrag` de "Un trazo" — arrastrar desde
un punto de color hasta su par.

**Complejidad:** Alta en autoría de niveles (curarlos a mano o con un
generador que solo verifique "alguna solución válida", más simple que
"solución única"), baja en interacción (primitiva ya construida en el juego
anterior).

---

## 8. Sendero de palabras

**Categoría:** Palabras. **Basado en:** Elevate Daily Wordbend. Se evita el
nombre "Wordbend" (producto de Elevate).

**Mecánica:** grilla de letras con una lista de pistas temáticas. Cada pista
señala una palabra oculta en la grilla, cuyo camino de letras puede doblar en
cualquier dirección (no solo en línea recta). Al completar todas las
palabras, cada letra de la grilla pertenece a exactamente un camino — no
sobra ninguna.

**Por qué banco curado:** esto es el problema de generación más difícil de
los 9 después de Crucigrama — hace falta (a) una lista de palabras
temáticamente relacionadas cuya suma de letras sea exactamente el tamaño de
la grilla, y (b) un empaquetado de esas palabras como caminos que cubran la
grilla sin superponerse, lo cual es una búsqueda combinatoria mucho más
restringida que cualquiera de los 5 primeros juegos. Banco curado de
tableros temáticos armados y verificados a mano (o con un script offline que
sí puede tomarse su tiempo, a diferencia de la generación en el dispositivo
del jugador), reutilizando el diccionario en español que ya mantienen
Palabra del día/Anagramas.

**Dificultad:** tamaño de grilla y cuán directa es la pista (Elevate ajusta
"la dificultad de algunas pistas" manteniendo la misma grilla — mismo
criterio acá: la grilla del banco no cambia entre dificultades, la redacción
de la pista sí, de más literal a más indirecta).

**Interacción:** reutiliza `useGridPathDrag`.

**Complejidad:** Alta — mayor esfuerzo de contenido (armar temas + tableros)
que de interacción (la primitiva ya existe para cuando llega acá).

---

## 9. Crucigrama

**Categoría:** Palabras. **Basado en:** Elevate Daily Crossword. "Crucigrama"
es un término genérico (como "Sudoku"), no hace falta evadir ningún nombre.

**Mecánica:** mini-crucigrama clásico (grilla chica, ~5×5 a 7×7) con pistas
horizontales y verticales que se cruzan.

**Por qué es el más difícil de los 9:** construir un crucigrama que cierre
(palabras que se crucen correctamente en una grilla simétrica) ya es un
problema de generación difícil por sí solo — y además hace falta **redactar
una pista real en español por palabra** (no alcanza con tener una lista de
palabras válidas, como en Anagramas o Palabra del día: cada entrada necesita
una definición o pista escrita a mano). Es autoría de contenido, no solo
algoritmo — el ítem del lote con más trabajo manual por delante.

**Estrategia:** banco curado de mini-crucigramas chicos con sus pistas ya
escritas (empezar con un puñado, ampliar con el tiempo — mismo criterio que
el banco de imágenes de Nonograma, que arrancó con 4 imágenes y puede crecer
sin tocar el motor). Nada de generación en vivo en v1.

**Dificultad:** tamaño de grilla y qué tan directa es la pista (Fácil:
definición literal; Difícil: pista más indirecta o juego de palabras suave,
sin cruzar a lo críptico — el resto del catálogo ya evita cualquier
mecánica que dependa de conocimiento enciclopédico opaco más que de
razonamiento). Tranquilo: grilla chica, sin reloj. Sin Progresivo.

**Interacción:** selección de celda + teclado de letras, patrón nuevo pero
simple (similar en espíritu al teclado numérico de Sudoku/Cifras, con letras
en vez de dígitos).

**Complejidad:** Alta — es candidato a quedar último, o incluso a
reconsiderar el alcance (banco más chico de lo habitual al lanzar) dado el
costo de redactar pistas en español a mano.

---

## Riesgos generales (PRD sección 16)

Los 5 primeros juegos reutilizan un patrón que este repo ya validó dos veces
esta sesión (el verificador de unicidad de Nonograma, construido en la
auditoría de julio, y el generador-por-construcción de Cifras/Aritmética que
ya existía). Los últimos 4 son deliberadamente banco-curado porque forzar
generación en vivo ahí replicaría el mismo riesgo que este catálogo ya
evitó conscientemente en Empuja cajas/Nonograma/Sudoku 9×9: preferir un
banco chico y verificado a un generador que podría, alguna vez, entregarle a
un jugador un puzzle sin solución o sin solución única.
