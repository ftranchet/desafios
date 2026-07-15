# PRD — Desafíos Mentales

**Documento de requisitos de producto (PRD)** · Versión 0.10 · Julio 2026
**Estado:** Fase 0, Fase 1 y Fase 2 entregadas. Usabilidad táctil/teclado auditada (10.7), shell robustecido (5.6), catálogo listo para escalar (ADR-005/006, generador, E2E), sistema de dificultad renovado (sección 7, ADR-007) y pulido visual con color por categoría y movimiento (ADR-008). Catálogo en curso de expansión con los clones de LinkedIn Games/Elevate (sección 11.3): ver `CHANGELOG.md` para el detalle juego por juego, más actualizado que esta tabla de versiones.
**Destino:** este documento vive en `docs/PRD.md` del repositorio y es la fuente de verdad para las sesiones de desarrollo con Claude Code.

| Versión | Fecha      | Cambios                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | Julio 2026 | Borrador inicial                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 0.2     | Julio 2026 | Decisiones validadas: PWA, nombre "Desafíos Mentales", Tailwind, licencia GPL-3.0, código en inglés / textos en español, juego de validación "Tiempo de reacción". Nueva dirección visual: pixel art minimalista. Repriorización del catálogo (Tetris, Snake y matemática arriba). Eliminados: 2048, Buscaminas y Kakuro                                                                                                                          |
| 0.3     | Julio 2026 | Replanteo de la dirección visual: se abandona el pixel art de 8 bits (no funcionaba estéticamente) a favor de un **minimalismo moderno** sobre el mismo tema oscuro — ver sección 10 y ADR-004. La paleta de colores validada en ADR-003 se mantiene sin cambios                                                                                                                                                                                  |
| 0.4     | Julio 2026 | Revisión de controles tras Fase 2: se agrega RNF-11 (operabilidad completa por teclado en escritorio; controles táctiles directos en pantalla para juegos en tiempo real, en vez de depender solo de gestos de deslizamiento). Motivo: el deslizamiento resultó engorroso para jugar Snake y Cascada en celular                                                                                                                                   |
| 0.5     | Julio 2026 | Auditoría integral de usabilidad táctil y de escritorio: los patrones que funcionaron y son replicables quedan documentados en la **sección 10.7** (foco automático, acción en `pointerdown`, keypad propio en pantalla, endurecimiento táctil global, partida a pantalla completa, diálogos accesibles, canvas fluido). La checklist de terminado (12.3) los incorpora                                                                           |
| 0.6     | Julio 2026 | Robustez del shell como base para escalar el catálogo: **sección 5.6** — aislamiento de fallas por juego (error boundary), frontera desconfiada para `GameResult`, persistencia acotada con retención de récords y esquema versionado, test de contrato + smoke de render sobre el registro (un juego queda cubierto al registrarse), y CI en ramas además del deploy                                                                             |
| 0.7     | Julio 2026 | Escalabilidad del catálogo: **ADR-005** (kit de interacción `src/core/ui/` — implementación canónica de los patrones 10.7), **ADR-006** (primera ampliación del contrato: `GameProps.audio`, sonido dentro de los juegos gateado por el shell — Simon suena), generador `npm run new-game` (esqueleto compilable, testeado y registrado), y suite E2E de humo en CI                                                                               |
| 0.8     | Julio 2026 | **ADR-007 — dificultades y modos**: los 5 niveles se reemplazan por 3 dificultades (Fácil/Medio/Difícil) + 2 modos especiales declarados por juego — **Tranquilo** (sin relojes ni game over, no compite) y **Progresivo** (10 grados de fácil a más-que-difícil, récord = hasta dónde llegaste). Sección 7 reescrita, contrato con `modes`/`ModeId`, récords migrados del esquema de niveles (v2), Aritmética y Snake como referencias completas |
| 0.9     | Julio 2026 | Cobertura completa de modos en el catálogo: Cascada, Simon, Secuencias y Estimación suman Tranquilo y Progresivo; Cifras suma Tranquilo (sin Progresivo: ronda única de pensamiento). Los 8 juegos declaran sus modos definitivos (sección 7)                                                                                                                                                                                                     |
| 0.10    | Julio 2026 | El encabezado de este documento había quedado desactualizado (seguía diciendo "0.9" y describía un catálogo de 8 juegos) mientras el catálogo creció a más de 25 en sesiones sucesivas — las secciones 7, 11 y 11.3 sí se habían ido actualizando en el camino, solo el encabezado no. Se corrige y se deja constancia de que `CHANGELOG.md` es la fuente más al día para el estado juego por juego: este documento fija arquitectura y decisiones, no un inventario en tiempo real            |

---

## 1. Visión

**Desafíos Mentales** es una colección de juegos mentales para celular —matemática, lógica, memoria, velocidad, razonamiento espacial— con una estética **minimalista y moderna**, construida como **sistema modular y extensible**: cada juego es un módulo independiente que se enchufa a una plataforma común (el "shell") que resuelve navegación, niveles de dificultad, puntajes y estadísticas.

El proyecto persigue tres propósitos simultáneos:

1. **Producto:** una app de entretenimiento mental honesta, sin publicidad, sin cuentas y sin promesas pseudocientíficas.
2. **Aprendizaje:** caso real y completo de desarrollo con Claude Code ("vibe coding"), documentado de punta a punta en un repositorio público.
3. **Material didáctico:** base replicable para talleres y cursos sobre desarrollo asistido por inteligencia artificial.

### 1.1 Posicionamiento honesto (principio rector)

La evidencia científica disponible indica que los juegos de "entrenamiento cerebral" mejoran el desempeño en los juegos mismos, pero esa mejora **no transfiere** a capacidades cognitivas generales. Referencias centrales: el estudio de Owen y colaboradores (Nature, 2010, más de 11.000 participantes durante seis semanas) y la revisión exhaustiva de Simons y colaboradores (Psychological Science in the Public Interest, 2016). En 2016, la Comisión Federal de Comercio de Estados Unidos sancionó a Lumosity precisamente por publicidad engañosa sobre estos supuestos beneficios.

**Consecuencia de diseño:** este producto se posiciona como _entretenimiento desafiante_, nunca como herramienta de mejora cognitiva. Ningún texto de la app, del repositorio o del material de difusión hará afirmaciones de ese tipo. La honestidad epistémica es un diferenciador del producto, no una limitación.

---

## 2. Objetivos y no-objetivos

### 2.1 Objetivos de la versión 1

| ID  | Objetivo                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | Shell funcional: catálogo de juegos, ejecución, 5 niveles de dificultad, puntajes y estadísticas locales                              |
| O2  | Arquitectura donde **agregar un juego nuevo no requiere modificar el shell** (solo crear una carpeta y registrar una línea)           |
| O3  | Tres juegos publicados que validen el contrato técnico y las prioridades del catálogo                                                 |
| O4  | Instalable en el celular como aplicación web progresiva (Progressive Web App), funcionando sin conexión                               |
| O5  | Repositorio público con documentación suficiente para que un tercero replique el flujo completo con Claude Code                       |
| O6  | Identidad visual minimalista consistente entre juegos construidos en sesiones distintas, garantizada por tokens de diseño compartidos |

### 2.2 No-objetivos de la versión 1 (control de alcance)

- Sin backend, cuentas de usuario ni sincronización en la nube.
- Sin multijugador ni funciones sociales.
- Sin publicidad, compras dentro de la app ni monetización.
- Sin notificaciones push.
- Sin publicación en tiendas (Google Play / App Store); queda como fase posterior opcional.
- Sin afirmaciones de mejora cognitiva (ver 1.1).

Cada propuesta de funcionalidad nueva se contrasta contra esta lista antes de entrar al backlog.

---

## 3. Usuarios y casos de uso

**Usuario principal:** adulto que busca sesiones cortas (2 a 10 minutos) de desafío mental en el celular, en momentos muertos del día.

**Usuario secundario:** estudiante o asistente a talleres que clona el repositorio para aprender el flujo de desarrollo con agentes de código.

Casos de uso centrales:

1. Abrir la app y empezar una partida en menos de 10 segundos.
2. Elegir juego, elegir nivel, jugar, ver resultado y récord.
3. Consultar estadísticas: récords por juego y nivel, historial reciente, racha de días jugados.
4. Jugar sin conexión a internet.
5. Exportar los propios datos como archivo JSON (transparencia y portabilidad).

---

## 4. Decisiones técnicas fundamentales

### 4.1 Stack (validado)

| Decisión                 | Elección                                              | Justificación                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plataforma               | **Aplicación web progresiva (PWA)** ✓                 | Cero fricción de publicación, actualización instantánea en cada push, replicable en talleres sin cuentas de desarrollador ni hardware específico                                       |
| Framework                | **React 18 + TypeScript (modo estricto)**             | Máxima cobertura de conocimiento de Claude Code; el tipado estricto protege el contrato entre shell y módulos                                                                          |
| Herramienta de build     | **Vite**                                              | Velocidad de iteración                                                                                                                                                                 |
| Estilos                  | **Tailwind CSS** ✓                                    | Velocidad con Claude Code; los tokens de diseño (sección 10) viven en la configuración de Tailwind                                                                                     |
| Estado global            | Zustand (librería mínima)                             | Evitar sobre-ingeniería; solo el shell tiene estado global                                                                                                                             |
| Persistencia             | localStorage detrás de una capa de abstracción propia | Suficiente para v1; la abstracción permite migrar a IndexedDB sin tocar juegos                                                                                                         |
| Tests                    | Vitest, sobre la lógica pura de cada juego            | La lógica se testea sin renderizar interfaz                                                                                                                                            |
| Despliegue               | GitHub Pages vía GitHub Actions                       | Gratuito, automático en cada push a `main`                                                                                                                                             |
| Licencia                 | **GNU General Public License v3.0** ✓                 | Copyleft: quien distribuya una versión modificada debe publicar su código bajo la misma licencia. Coherente con el propósito didáctico: las mejoras de terceros vuelven a la comunidad |
| Empaquetado móvil futuro | Capacitor (Fase 3, opcional)                          | Reutiliza el 100% del código web para generar app de Android/iOS si se decide ir a tiendas                                                                                             |

**Alternativa evaluada y descartada: React Native + Expo.** Ventaja: experiencia nativa y presencia en tiendas desde el día uno. Desventajas: ciclo de iteración más lento, cuentas de desarrollador pagas (Google Play US$ 25 únicos; programa de Apple US$ 99 anuales), procesos de revisión de tiendas, y complica la replicación en talleres. La decisión PWA es **reversible**: Capacitor empaqueta la misma base de código si en Fase 3 se confirma la necesidad de tiendas.

### 4.2 Principios de arquitectura

1. **El shell no conoce el interior de ningún juego**; solo interactúa a través del contrato de módulo.
2. **Los juegos no acceden a almacenamiento, navegación ni configuración global.** Reciben una configuración y emiten un resultado. Nada más.
3. **Lógica separada de interfaz.** Cada juego tiene su lógica en funciones puras (testeables sin renderizar) y su componente visual aparte.
4. **Toda aleatoriedad acepta una semilla** (seed), para que las partidas sean reproducibles en tests.
5. **Un juego = una carpeta = (idealmente) una sesión de Claude Code.**
6. **Los tokens de diseño son parte del contrato.** Ningún juego define colores, fuentes ni escalas propias fuera del sistema de la sección 10.

---

## 5. Arquitectura del sistema

### 5.1 Componentes del shell

```
┌─────────────────────────────────────────────┐
│                    SHELL                     │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Catálogo │ │ Pantalla │ │ Estadísticas│  │
│  │  (home)  │ │ de juego │ │  y récords  │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────────────────────┐  │
│  │ Config.  │ │ Resultado de partida     │  │
│  └──────────┘ └──────────────────────────┘  │
├─────────────────────────────────────────────┤
│                    CORE                      │
│  Contrato de módulo · Registro de juegos ·  │
│  Persistencia · Aleatoriedad con semilla ·  │
│  Temporizadores · Tokens de diseño          │
├─────────────────────────────────────────────┤
│                   GAMES/                     │
│  quick-math/  cifras/  snake/  cascada/ ... │
│  (módulos independientes, mismo contrato)   │
└─────────────────────────────────────────────┘
```

- **Catálogo (home):** grilla de juegos con su ícono, filtro por categoría y acceso al último jugado.
- **Pantalla de juego:** monta el componente del juego, muestra encabezado común (nombre, nivel, pausa, salir).
- **Resultado de partida:** puntaje obtenido, récord previo, indicación de récord nuevo, botón de revancha.
- **Estadísticas:** récords por juego y nivel, historial de últimas partidas, racha de días.
- **Configuración:** sonido, vibración, reducción de animaciones, exportar datos (JSON), borrar datos.

### 5.2 Contrato de módulo de juego (pieza central del sistema)

Convención del proyecto: **código e identificadores en inglés; todos los textos visibles al usuario en español.** ✓

```typescript
// src/core/contract.ts

export type Category = 'memory' | 'logic' | 'math' | 'speed' | 'spatial' | 'words';

// Dificultades y modos (ADR-007): tres dificultades obligatorias más dos
// modos especiales opcionales, declarados por cada juego según tengan sentido.
export type ModeId = 'easy' | 'medium' | 'hard' | 'zen' | 'progressive';

export interface GameMode {
  id: ModeId;
  label: string; // "Fácil", "Tranquilo"... — siempre desde core/modes.ts (buildModes)
  description?: string; // Una línea, solo para los modos especiales
  params: Record<string, number | string | boolean>;
}

export interface GameMetadata {
  id: string; // kebab-case, único: "quick-math"
  name: string; // Nombre visible, en español
  category: Category;
  description: string; // Una línea, en español
  version: string;
  modes: GameMode[]; // easy/medium/hard obligatorios; zen/progressive opcionales (ADR-007)
  estimatedSeconds: number; // Duración típica de una partida
  icon: string; // Ruta al ícono vectorial del juego
}

export interface GameConfig {
  mode: ModeId;
  seed?: number; // Reproducibilidad en tests
}

export interface GameResult {
  gameId: string;
  mode: ModeId;
  score: number; // Escala libre por juego
  completed: boolean; // false si abandonó
  durationMs: number;
  metrics: Record<string, number>; // Específicas del juego: aciertos, errores, maxStage...
  timestamp: string; // ISO 8601
}

export type GameSoundEffect = 'success' | 'error' | 'record' | 'gameover';

// Capacidad de audio inyectada por el shell, ya gateada por la configuración
// del usuario (ADR-006): con el sonido apagado se inyecta una implementación
// nula. Los juegos nunca tocan Web Audio ni leen configuración global.
export interface GameAudio {
  play(effect: GameSoundEffect): void; // efectos comunes del sistema
  tone(frequency: number, durationMs: number): void; // tonos propios del juego
}

export interface GameProps {
  config: GameConfig;
  onFinish(result: GameResult): void; // El juego terminó (única vía de salida de datos)
  onQuit(): void; // El usuario abandonó
  audio?: GameAudio; // Opcional (ADR-006): retrocompatible con juegos previos
}

export interface GameModule {
  metadata: GameMetadata;
  Component: React.ComponentType<GameProps>;
}
```

Notas de diseño:

- Los juegos de tiempo real (Snake, Cascada) implementan su bucle de juego con canvas **dentro** de su propio componente; el contrato no cambia.
- El puntaje es de escala libre por juego. No se normaliza entre juegos: comparar puntajes de Cifras con puntajes de Snake no aporta valor y complica todo.
- `metrics` permite que cada juego guarde lo que le sea propio sin romper el esquema común.
- `audio` (ADR-006) invierte la dependencia del sonido: el juego declara _qué_ quiere sonar (un efecto común o un tono propio, como los pads de Simon) y el shell decide si suena según la configuración. La síntesis vive solo en `src/core/sound.ts` (regla 11.2).

### 5.3 Registro de juegos

```typescript
// src/core/registry.ts
import { quickMath } from '../games/quick-math';
import { cifras } from '../games/cifras';
import { snake } from '../games/snake';

export const GAMES: GameModule[] = [
  quickMath,
  cifras,
  snake,
  // Agregar un juego = importar y sumar una línea acá. Nada más.
];
```

### 5.4 Servicio de persistencia (solo lo usa el shell)

```typescript
// src/core/storage.ts
export interface StorageService {
  saveResult(result: GameResult): void;
  getResults(gameId?: string): GameResult[];
  getBest(gameId: string, level: number): GameResult | null;
  getStreak(): number; // Días consecutivos con al menos una partida
  exportAll(): string; // JSON completo
  clearAll(): void;
}
```

### 5.5 Flujo para agregar un juego nuevo (repetible en una sesión de Claude Code)

**Atajo (v0.7):** `npm run new-game <game-id> ["Nombre visible"]` genera los pasos 1, 2, 4 y 5 como esqueleto compilable, testeado y ya registrado — con los patrones de interacción de la sección 10.7 y el kit de ADR-005 aplicados. Queda reemplazar la mecánica de ejemplo, el ícono y los metadatos.

1. Crear la carpeta `src/games/<game-id>/`.
2. Implementar `logic.ts` (funciones puras, con semilla), `ui.tsx` (componente que implementa `GameProps`) e `index.ts` (exporta el `GameModule`).
3. Dibujar el ícono vectorial del juego (sección 10.4).
4. Escribir `logic.test.ts` con semilla fija.
5. Registrar el módulo en `src/core/registry.ts` (una línea).
6. Verificar la checklist de terminado (sección 12.3).

**Criterio de éxito arquitectónico:** este flujo se completa sin tocar ningún archivo del shell.

### 5.6 Garantías de robustez del shell (v0.6)

El objetivo del sistema es que agregar juegos sea de bajo riesgo. Estas garantías, verificadas por tests, definen qué puede romper un juego defectuoso — y qué no puede romper jamás:

1. **Aislamiento de fallas.** El componente de cada juego se monta dentro de un _error boundary_ (`GameErrorBoundary`): una excepción durante el render o un ciclo de vida del juego muestra un panel de falla con salida al catálogo, con el shell, los récords y la navegación intactos. El peor caso de un juego roto es ese panel, nunca una pantalla en blanco.
2. **Frontera desconfiada.** El shell no confía en el `GameResult` que emite un juego: normaliza `gameId` y `level` con lo que él mismo montó (un `buildResult` copiado de otro juego no puede corromper récords ajenos), y la capa de persistencia rechaza resultados sin forma válida y normaliza números no finitos o negativos (un puntaje `NaN` no envenena las comparaciones de récord).
3. **Persistencia acotada y tolerante.** El historial persiste con esquema versionado (con lectura del formato legado), está acotado a `MAX_STORED_RESULTS` con retención del mejor resultado por (juego, nivel) — el historial es finito, los récords no caducan —, la lectura descarta entradas corruptas en vez de romper, y la escritura tolera cuota llena o modo privado sin tirar excepción: fallar al persistir jamás rompe el cierre de una partida.
4. **Contrato verificado por tests, automáticamente.** `registry.test.ts` valida los metadatos de todos los juegos registrados (id único en kebab-case, estructura de modos de ADR-007 con labels canónicos, textos visibles no vacíos, ícono, duración estimada) y `registry.render.test.tsx` monta el componente de cada juego con semilla fija **en cada modo que declara**. **Registrar un juego es quedar cubierto por la batería de tests del shell** — sin escribir ni un test extra.
5. **CI en ramas.** Los checks completos (formato, lint, tipos, tests, build) corren en cada push a cualquier rama y en cada pull request (`ci.yml`), no solo en el deploy de `main` (`deploy.yml`): una rama rota se entera antes de mergear.

---

## 6. Requisitos funcionales

| ID    | Requisito                                                                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | El catálogo muestra todos los juegos registrados con ícono, nombre, categoría, descripción y récord personal                                                                      |
| RF-02 | El catálogo permite filtrar por categoría                                                                                                                                         |
| RF-03 | Antes de iniciar, el usuario elige dificultad (Fácil/Medio/Difícil) o un modo especial (Tranquilo/Progresivo) si el juego lo declara; el último modo jugado queda preseleccionado |
| RF-04 | Durante la partida hay botón de pausa (si el juego lo admite) y de salir con confirmación                                                                                         |
| RF-05 | Al terminar, se muestra puntaje, récord previo del modo y si hubo récord nuevo (el modo Tranquilo no compite: sin récords)                                                        |
| RF-06 | Todo resultado (incluidos abandonos) se persiste localmente                                                                                                                       |
| RF-07 | La pantalla de estadísticas muestra récords por juego/modo, últimas 20 partidas y racha de días                                                                                   |
| RF-08 | Configuración: sonido on/off, vibración on/off, reducir animaciones, exportar datos, borrar datos (con doble confirmación)                                                        |
| RF-09 | La app es instalable en la pantalla de inicio del celular (manifest de PWA con nombre "Desafíos Mentales")                                                                        |
| RF-10 | La app funciona completa sin conexión después de la primera carga (service worker)                                                                                                |

---

## 7. Sistema de dificultad y modos (v0.8, ADR-007)

**Tres dificultades** — Fácil, Medio, Difícil — definidas por **parámetros** en los metadatos (no por lógica condicional dispersa), más **dos modos especiales** que cada juego declara solo si tienen sentido en su mecánica:

- **Tranquilo (`zen`)**: sin relojes que corran hacia atrás y sin game over. Cada juego lo interpreta: preguntas sin timer; en Snake chocar reacomoda la víbora y se sigue jugando; en Cascada el top-out limpia el tablero; en Simon fallar repite la ronda. **No compite**: sin récords ni "¡Récord nuevo!" — la partida queda en el historial y nada más.
- **Progresivo (`progressive`)**: la partida recorre **10 grados** de dificultad. Los grados 1–8 interpolan el espacio Fácil→Difícil y los grados 9–10 **extrapolan más allá del Difícil actual** (curva común en `core/modes.ts`: `progressiveT`, `lerp`). En juegos de supervivencia el grado sube por logro (comidas, líneas) y se termina al perder; en juegos de preguntas la sesión es una rampa de longitud fija. Récord natural: puntaje con multiplicador por grado + métrica `maxStage` ("¿hasta dónde llegaste?").

Parámetros que escalan, ejemplos del patrón:

| Juego                    | Parámetros que escalan con la dificultad                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Aritmética contra reloj  | Rango numérico, operaciones incluidas (suma → división), segundos por pregunta, cantidad de preguntas |
| Cifras                   | Cantidad de números grandes, tiempo límite, magnitud del objetivo                                     |
| Snake                    | Velocidad inicial, aceleración por comida, obstáculos                                                 |
| Cascada (clon de Tetris) | Velocidad de caída inicial y aceleración por línea completada                                         |
| Secuencias numéricas     | Complejidad del patrón (aritmético → geométrico → combinado), cantidad de términos visibles, tiempo   |
| Simon                    | Velocidad de reproducción de la secuencia, longitud objetivo                                          |
| Sudoku                   | Cantidad de celdas reveladas / técnica de resolución requerida                                        |
| Nonograma                | Tamaño de grilla (5×5 a 15×15)                                                                        |

Robustez para juegos nuevos (requisito del product owner): la estructura se declara con `buildModes()` (labels y orden canónicos — imposible desviarse), el test de contrato valida los modos de todo juego registrado, y el smoke de render monta cada juego **en cada modo que declara**.

Cobertura del catálogo actual: **Aritmética, Snake, Cascada, Simon, Secuencias y Estimación** declaran los 5 modos (en Cascada el top-out de Tranquilo limpia el tablero; en Simon fallar repite la ronda y el Progresivo acelera la reproducción por grado). **Cifras** declara Tranquilo pero no Progresivo (es una ronda única de pensamiento, no un juego de rampa) y **Tiempo de reacción** solo las 3 dificultades (sin reloj no hay juego) — la demostración de que los modos se declaran donde tienen sentido.

---

## 8. Puntaje, récords y estadísticas

- Récord por combinación (juego, nivel).
- Historial de las últimas partidas con fecha, nivel, puntaje y duración.
- **Racha de días:** días consecutivos con al menos una partida completada. Sin castigos ni presión: si se corta, se corta.
- Exportación de todos los datos como JSON descargable (RF-08).
- Sin comparación entre usuarios ni tablas globales (no-objetivo v1: sin backend).

---

## 9. Requisitos no funcionales

| ID     | Requisito                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Funciona sin conexión tras la primera carga                                                                                                                                                                                                                                                                                                                                                                           |
| RNF-02 | Carga inicial menor a 2 segundos en un celular de gama media con conexión 4G                                                                                                                                                                                                                                                                                                                                          |
| RNF-03 | Respuesta táctil menor a 100 milisegundos en interacciones de juego                                                                                                                                                                                                                                                                                                                                                   |
| RNF-04 | Objetivos táctiles de al menos 44 píxeles                                                                                                                                                                                                                                                                                                                                                                             |
| RNF-05 | Contraste de color nivel AA; la información nunca depende solo del color. La paleta se valida contra este requisito antes de fijarse (ADR-003)                                                                                                                                                                                                                                                                        |
| RNF-06 | Opción de reducir animaciones (respeta también la preferencia del sistema operativo)                                                                                                                                                                                                                                                                                                                                  |
| RNF-07 | Idioma español (Argentina); todos los textos centralizados en un archivo para facilitar futura traducción                                                                                                                                                                                                                                                                                                             |
| RNF-08 | Privacidad total: cero telemetría, cero cuentas, cero datos fuera del dispositivo                                                                                                                                                                                                                                                                                                                                     |
| RNF-09 | Compatible con Chrome y Safari móviles (últimas dos versiones); usable también en escritorio                                                                                                                                                                                                                                                                                                                          |
| RNF-10 | Licencia GNU General Public License v3.0 ✓                                                                                                                                                                                                                                                                                                                                                                            |
| RNF-11 | Todo juego es jugable de punta a punta solo con teclado en escritorio (foco visible, sin trampas de tabulación) — no exclusivamente con mouse/touch. Los juegos en tiempo real (Snake, Cascada y los que sigan ese patrón) ofrecen controles táctiles directos en pantalla (botones) como entrada principal en celular; el gesto de deslizar puede coexistir como atajo, pero nunca es la única forma de jugar (v0.4) |

---

## 10. Dirección visual y sonora

**Identidad: minimalismo moderno sobre tema oscuro.** ✓ (v0.3 — reemplaza el pixel art de la v0.2, que no funcionaba estéticamente; ver ADR-004). La personalidad viene de una paleta acotada y una tipografía sobria con jerarquía clara por peso; la sensación de calidad viene de la disciplina minimalista: pocos elementos por pantalla, mucho espacio vacío, geometría suave y consistente. Nada de ruido visual: ni sprites recargados, ni bordes duros, ni decoración que no aporte información.

### 10.1 Sistema de tokens (contrato visual)

Los tokens viven en la configuración de Tailwind (`tailwind.config`). Ningún juego usa colores, fuentes ni tamaños fuera de este sistema: es lo que garantiza que módulos construidos en sesiones distintas de Claude Code parezcan de la misma familia (O6).

- **Paleta:** máximo 12 colores nombrados, validada contra contraste AA sobre el fondo (ADR-003) — sigue vigente sin cambios en v0.3, los colores nunca fueron el problema.
- **Roles de color:** fondo, superficie, texto principal, texto secundario, acento primario (interacción), acento de éxito, acento de error, y 4 colores de juego para íconos y elementos de juego.
- **Tema:** v1 con **tema oscuro único** (simplifica la validación de contraste). Tema claro como mejora posterior.

### 10.2 Tipografía por roles

- **Una sola familia** (candidata: "Inter", de Google Fonts, self-hosted). "Display/HUD" y "cuerpo" son roles de peso y tamaño dentro de la misma tipografía, no fuentes distintas — títulos, puntajes y marcadores en pesos bold/extrabold; descripciones, instrucciones y configuración en peso regular/semibold.
- Escala tipográfica corta y explícita (4-5 tamaños), definida en los tokens.

### 10.3 Renderizado y movimiento

- Geometría suave: esquinas redondeadas consistentes en tarjetas, botones y diálogos (sin bordes duros a 0).
- Superficies livianas: bordes finos o directamente diferencia de tono entre fondo/superficie, sin recargar de contorno.
- Sin gradientes ni sombras difusas — como mucho, una sombra sutil para separar un panel flotante (por ejemplo un diálogo de confirmación) del resto.
- Animaciones con curvas suaves (`ease`), no a pasos. Siempre subordinadas a RNF-06: con "reducir animaciones" activo, se desactivan.

### 10.4 Elemento distintivo (signature)

Cada juego tiene un **ícono vectorial propio** que lo representa en el catálogo: un glifo simple (paths/curvas, sin grilla de píxeles), chico, dibujado con la paleta del sistema. El catálogo es entonces una vitrina prolija y reconocible: la identidad del producto en una sola pantalla. El campo `icon` del contrato (sección 5.2) lo hace obligatorio.

### 10.5 Sonido

- Efectos breves y discretos, **siempre originales** (regla 11.2): generados proceduralmente (Web Audio) o creados ad hoc — no dependen de la estética visual.
- Controlados desde configuración (RF-08). Sin música de fondo en v1; solo efectos breves de acierto, error, récord y fin de partida.

### 10.6 Voz y textos de la interfaz

Los textos son material de diseño, no decoración. Reglas: español con voseo (Argentina), verbos simples y directos, sin relleno; cada botón dice exactamente lo que hace ("Jugar", "Reintentar", "Ver estadísticas"); los errores explican qué pasó y cómo seguir, sin disculpas vagas; una pantalla vacía invita a la acción ("Todavía no jugaste ninguna partida. Elegí un juego para empezar"). Nombres consistentes en todo el flujo: la acción que se llama "Jugar" no se convierte en "Comenzar" en otra pantalla.

### 10.7 Patrones de interacción validados (táctil y escritorio) — v0.5

Patrones probados en dispositivo/navegador real durante la auditoría de usabilidad (v0.5). Son **replicables**: todo juego nuevo los aplica desde el día uno, y la checklist de terminado (12.3) los exige. Concretan en implementación lo que RNF-03, RNF-04, RNF-06 y RNF-11 piden como requisito. **Desde v0.7, la implementación canónica vive en el kit `src/core/ui/`** (ADR-005): `PressButton` (patrones 1, 2 y 9), `useAutoFocus` (patrón 8), `CountdownBar` + `useSecondsLeft` (patrón 11) — los juegos los importan en vez de copiar el código.

**Táctil (celular es la plataforma principal):**

1. **Acción en `pointerdown`, no en `click`.** Los controles de juego (D-pad, teclas del keypad, pads de Simon, opciones contra reloj) actúan al apoyar el dedo: `click` dispara recién al soltarlo y esa demora se siente en tiempo real (RNF-03). La activación por teclado se conserva atendiendo solo el `click` sintético de Enter/Espacio (`event.detail === 0`), y `preventDefault()` en `pointerdown` evita robarle el foco al tablero.
2. **Auto-repetición al mantener presionado** en acciones que se repiten (mover pieza en Cascada): espera inicial ~260 ms y cadencia ~110 ms — la sensación de un teclado físico — con `setPointerCapture` para que el gesto no se corte si el dedo se corre del botón.
3. **Keypad numérico propio en pantalla, nunca `<input>` con teclado del sistema** para respuestas numéricas (Aritmética, Secuencias). El teclado del sistema tapa media pantalla, aparece y desaparece entre pregunta y feedback, y salta el layout. El keypad propio da teclas de ≥44 px (RNF-04), layout estable (pregunta, resultado y teclas ocupan siempre el mismo lugar) y convive con el teclado físico en escritorio.
4. **Endurecimiento táctil global (CSS del shell, los juegos lo heredan):** `overscroll-behavior-y: none` en `html` (un deslizamiento hacia abajo dentro de un juego no dispara pull-to-refresh), `touch-action: manipulation` en botones y enlaces (sin espera de doble tap ni zoom accidental en toques rápidos), sin resaltado de tap (`-webkit-tap-highlight-color`) ni selección de texto en controles, y `touch-none` en los canvas con gestos propios.
5. **Flujo de partida a pantalla completa.** En la ruta de juego no hay navegación inferior: un toque accidental cerca del borde no puede desmontar la partida sin confirmación (y sin registrar el resultado, RF-06). La salida es explícita: "←" para volver en selección de nivel y resultado, "Salir" con confirmación durante la partida. En el resto de la app, la barra inferior es `sticky` y respeta `env(safe-area-inset-bottom)` (indicador de inicio de iOS).
6. **Canvas fluido con buffer fijo.** El buffer interno del canvas queda fijo (tamaño lógico × `devicePixelRatio`) y el tamaño CSS se acota con `max-width`/`vh` + `aspect-ratio`: el tablero de Snake no desborda un celular de 360 px y el de Cascada se achica en pantallas bajas en vez de empujar los controles fuera de la vista. Las coordenadas de puntero se convierten con `getBoundingClientRect()`, así el escalado no rompe la entrada.
7. **Deshacer antes que reiniciar** en juegos de manipulación de estado (Cifras): un error de un paso no cuesta la partida entera.

**Escritorio (teclado y mouse, RNF-11):**

8. **Auto-foco del área de juego al montar.** El contenedor del juego tiene `tabIndex={0}` y recibe `focus({ preventScroll: true })` apenas arranca la partida: flechas, dígitos y atajos funcionan desde el primer segundo, sin exigir un clic previo sobre el tablero (que además scrollearía la página).
9. **Todo control en pantalla tiene su tecla:** flechas para dirección/movimiento, dígitos y Backspace/Enter para el keypad, Espacio para caída rápida o para reaccionar, `1`–`4` para los pads de Simon. El botón en pantalla y la tecla disparan la misma función.
10. **Diálogos de confirmación accesibles:** al abrirse, el foco entra al diálogo sobre la opción segura (cancelar) — un Enter apurado no dispara la acción destructiva —, Escape y el toque/clic en el fondo cancelan, y Tab circula solo dentro del diálogo.

**Común:**

11. **Cuenta regresiva numérica junto a la barra animada.** Con "reducir animaciones" activo (RNF-06) la barra de tiempo deja de animarse; el número de segundos restantes mantiene visible la información. Regla general: ninguna información depende solo de una animación.
12. **Layout estable entre estados.** Pregunta, feedback y controles reservan su lugar (alturas mínimas) para que la pantalla no salte entre fases — crítico cuando el usuario está por tocar algo.

---

## 11. Catálogo de juegos (backlog priorizado)

Criterios de puntuación (1 a 5, juicio del equipo): **Diversión** = calidad probada del bucle de juego en el mercado; **Desafío** = profundidad y exigencia mental; **Complejidad** = esfuerzo estimado de implementación con Claude Code. **Prioridad** (validada por el product owner): P1 = MVP; la Fase 2 arranca con Cascada; los juegos de matemática se adelantan en todas las olas.

| #   | Juego                           | Categoría          | Mecánica en una línea                                               | Diversión | Desafío | Complejidad |        Prioridad         |
| --- | ------------------------------- | ------------------ | ------------------------------------------------------------------- | :-------: | :-----: | :---------: | :----------------------: |
| 1   | Aritmética contra reloj         | Matemática         | Responder operaciones antes de que expire el tiempo                 |     3     |    3    |    Baja     |          **P1**          |
| 2   | Cifras (estilo Countdown)       | Matemática         | Combinar 6 números con las 4 operaciones para llegar a un objetivo  |     5     |    5    |    Media    |          **P1**          |
| 3   | Snake                           | Velocidad/Espacial | Crecer comiendo sin chocarte con vos mismo                          |     4     |    2    |    Media    |         **P1** *         |
| 4   | Cascada (clon de Tetris)        | Espacial           | Encajar las piezas que caen y completar líneas                      |     5     |    4    |    Alta     | **P2** — primera entrega |
| 5   | Secuencias numéricas            | Matemática         | Detectar el patrón e indicar el siguiente término                   |     3     |    4    |    Baja     |            P2            |
| 6   | Estimación relámpago            | Matemática         | Decidir rápido cuál de dos expresiones es mayor                     |     3     |    3    |    Baja     |            P2            |
| 7   | Simon                           | Memoria            | Repetir secuencias crecientes de colores y sonidos                  |     4     |    4    |    Baja     |            P2            |
| 8   | Palabra del día (estilo Wordle) | Palabras           | Adivinar la palabra de 5 letras en 6 intentos                       |     5     |    3    |    Media    |            P3            |
| 9   | Nonograma (Picross)             | Lógica             | Pintar celdas según pistas numéricas hasta revelar un dibujo pixel  |     5     |    5    |    Media    |            P3            |
| 10  | Sudoku                          | Lógica             | El clásico 9×9 (banco de puzzles en v1; generador propio después)   |     4     |    4    | Media/Alta  |            P3            |
| 11  | Memorama (parejas)              | Memoria            | Encontrar los pares de cartas iguales                               |     3     |    2    |    Baja     |            P3            |
| 12  | Stroop                          | Velocidad          | Elegir el color de la tinta, no la palabra escrita                  |     4     |    3    |    Baja     |            P3            |
| 13  | Memoria espacial (tipo Corsi)   | Memoria            | Reproducir la secuencia de celdas que se iluminan                   |     3     |    4    |    Baja     |            P3            |
| 14  | Tabla de Schulte                | Velocidad          | Tocar los números del 1 al 25 en orden, contra reloj                |     3     |    3    |    Baja     |            P3            |
| 15  | Mastermind numérico             | Lógica             | Deducir el código secreto a partir de pistas                        |     3     |    4    |    Baja     |            P3            |
| 16  | Set (tríos de patrones)         | Lógica             | Encontrar tríos válidos según 4 atributos simultáneos               |     4     |    5    |    Media    |            P4            |
| 17  | Sokoban                         | Lógica             | Empujar cada caja hasta su destino sin encerrarse                   |     4     |    5    |    Media    |            P4            |
| 18  | Torres de Hanoi                 | Lógica             | Mover la torre de discos en el mínimo de movimientos                |     3     |    4    |    Baja     |            P4            |
| 19  | Lights Out                      | Lógica             | Apagar todas las luces; cada toque invierte las vecinas             |     3     |    4    |    Baja     |            P4            |
| 20  | Rompecabezas 15                 | Espacial           | Ordenar las fichas deslizantes                                      |     3     |    3    |    Baja     |            P4            |
| 21  | Anagramas                       | Palabras           | Formar palabras válidas con letras revueltas (requiere diccionario) |     3     |    3    |    Media    |            P4            |
| 22  | N-back                          | Memoria            | Indicar si el estímulo actual coincide con el de N pasos atrás      |     2     |    5    |    Media    |            P4            |

\* Snake integra el MVP como **validador técnico del bucle de tiempo real** que Cascada necesita (ver 11.1).

Eliminados del catálogo por decisión del product owner (v0.2): 2048, Kakuro. Buscaminas, eliminado en la misma decisión v0.2, fue revisado más adelante y sí se sumó al catálogo como juego #24 (ver CHANGELOG 0.28.0); no figura en la tabla anterior porque esa tabla quedó congelada en la selección post-MVP de la v0.2.

### 11.1 Selección para el MVP (Fase 1) y su justificación

1. **Aritmética contra reloj** — valida temporizadores, entrada numérica rápida y el flujo de niveles paramétricos. El módulo ideal para estrenar el contrato.
2. **Cifras** — el juego matemático de mejor relación diversión/desafío del catálogo; valida generación y verificación de expresiones aritméticas, sin presión de tiempo real.
3. **Snake** — introduce el **bucle de juego en tiempo real** sobre canvas con grilla, controles por deslizamiento y detección de colisiones.

La secuencia es deliberada: la prioridad del product owner es Tetris, Snake y matemática, y la forma de honrarla sin asumir el riesgo documentado en la sección 16 (encarar el juego más complejo sin fundaciones) es que **Snake valide en el MVP toda la infraestructura de tiempo real que Cascada hereda en Fase 2**. Cascada es la primera entrega post-MVP y la meta insignia del proyecto.

### 11.2 Nota legal sobre clones

Las **mecánicas** de juego en general no gozan de protección de derechos de autor, pero los **nombres, marcas registradas y la estética** sí pueden estarlo. El caso Tetris Holding contra Xio Interactive (2012) llegó a proteger incluso el aspecto visual de Tetris. Regla práctica del proyecto: mecánicas inspiradas sí; **nombres, gráficos, sonidos y paletas siempre originales**. Por eso el clon de Tetris se llama "Cascada" y el estilo Wordle se llama "Palabra del día". Esto es una consideración práctica estándar, no asesoramiento legal.

### 11.3 Backlog nuevo: clones de LinkedIn Games y Elevate

Propuesta (julio 2026, sin implementar todavía): 9 juegos inspirados en los
minijuegos de LinkedIn (Queens, Tango, Zip, Patches, Mini Sudoku) y los daily
puzzles de Elevate (Daily Crossword, Daily Colorlink, Daily Crossmath, Daily
Wordbend). Análisis en profundidad, nombres propuestos, estrategia de
generación por juego y orden de implementación sugerido en
`docs/game-plans/linkedin-elevate-clones.md` — no se repite acá para no
duplicar mantenimiento.

---

## 12. Flujo de trabajo con Claude Code

### 12.1 Archivos de gobierno del repositorio

- **`CLAUDE.md`** (raíz): instrucciones permanentes para el agente. Contenido mínimo: leer `docs/PRD.md` antes de tareas de producto; respetar el contrato de la sección 5.2 y los tokens de la sección 10.1 sin modificarlos salvo decisión explícita; convenciones de la sección 12.2; correr lint, tests y build antes de dar por cerrada una tarea; una unidad de valor por sesión.
- **`docs/PRD.md`**: este documento.
- **`docs/decisions/`**: registros de decisiones de arquitectura (Architecture Decision Records, ADR). Un archivo breve por decisión con formato: contexto → opciones → decisión → consecuencias. Iniciales: ADR-001 (stack), ADR-002 (contrato de módulo), ADR-003 (paleta y tipografía definitivas).
- **`README.md`**: presentación del proyecto, captura de pantalla, enlace a la app publicada, cómo correr localmente, cómo agregar un juego, licencia.

### 12.2 Convenciones de código

- TypeScript en modo estricto; prohibido `any`.
- Código, archivos e identificadores en inglés; textos visibles al usuario en español, centralizados. ✓
- Lógica de juego en funciones puras (`logic.ts`), sin dependencias de React ni del navegador.
- Toda aleatoriedad pasa por el servicio de semilla del core.
- Colores, fuentes y escalas solo desde los tokens de Tailwind (sección 10.1).
- Formateo con Prettier y linting con ESLint; ambos corren en integración continua.
- Commits pequeños con mensajes descriptivos; un juego o mejora por rama.

### 12.3 Checklist de "terminado" por juego (Definition of Done)

- [ ] Implementa el contrato completo (`GameModule`, `GameProps`, emite `GameResult` válido).
- [ ] Las tres dificultades configuradas, jugables y perceptiblemente distintas; Tranquilo y Progresivo declarados donde la mecánica los admita (ADR-007).
- [ ] Ícono vectorial propio, dibujado con la paleta del sistema.
- [ ] Usa exclusivamente los tokens de diseño (sin colores ni fuentes ad hoc).
- [ ] Funciona con toque y con mouse/teclado, aplicando los patrones de interacción de la sección 10.7 (acción en `pointerdown`, auto-foco al montar, atajos de teclado, keypad propio si pide números).
- [ ] Sin errores de tipos ni de linter; build de producción pasa.
- [ ] Tests de `logic.ts` con semilla fija pasan (mínimo: generación de partida, validación de jugada, cálculo de puntaje).
- [ ] Registrado en `registry.ts` con metadatos completos en español.
- [ ] Probado en un celular real (no solo en el navegador de escritorio).
- [ ] Entrada agregada al `CHANGELOG.md`.

### 12.4 Ritmo de trabajo sugerido

Una sesión de Claude Code = una unidad de valor (un juego nuevo, o una mejora acotada del shell). Antes de cerrar cada sesión: lint + tests + build + verificación en el celular + commit + push (que dispara el despliegue automático).

---

## 13. Estructura del repositorio

```
desafios-mentales/
├── CLAUDE.md                  # Instrucciones para Claude Code
├── README.md
├── CHANGELOG.md
├── LICENSE                    # GNU General Public License v3.0
├── docs/
│   ├── PRD.md                 # Este documento
│   └── decisions/             # ADR-001, ADR-002, ADR-003, ...
├── src/
│   ├── core/                  # contract.ts, registry.ts, storage.ts, random.ts, timer.ts
│   ├── shell/                 # Catálogo, pantalla de juego, resultados, estadísticas, configuración
│   ├── games/
│   │   ├── quick-math/
│   │   │   ├── index.ts       # Exporta el GameModule
│   │   │   ├── logic.ts       # Lógica pura, testeable
│   │   │   ├── ui.tsx         # Componente (implementa GameProps)
│   │   │   ├── icon.svg       # Ícono vectorial
│   │   │   └── logic.test.ts
│   │   ├── cifras/
│   │   └── snake/
│   └── i18n/                  # Textos en español centralizados
├── public/                    # manifest.json ("Desafíos Mentales"), íconos, service worker
├── tailwind.config.ts         # Tokens de diseño (paleta, tipografía, escalas)
└── .github/workflows/
    └── deploy.yml              # Build + deploy a GitHub Pages en cada push a main
```

---

## 14. Roadmap por fases

Estimación en **sesiones de Claude Code**, no en semanas: es la unidad honesta para este flujo de trabajo.

| Fase                                        | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                             | Sesiones estimadas |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------: |
| **Fase 0 — Fundaciones**                    | Repo, tooling (Vite + TypeScript + ESLint + Prettier + Vitest + Tailwind), shell navegable con catálogo, contrato e infraestructura del core, tokens de diseño y ADR-003 (paleta y tipografía definitivas), CI/CD a GitHub Pages, `CLAUDE.md`, ADR-001 y ADR-002, PWA básica instalable. Incluye el juego trivial de validación **"Tiempo de reacción"** ✓ (tocar cuando cambia el color; mide milisegundos) para probar el contrato de punta a punta |        2–3         |
| **Fase 1 — MVP**                            | Aritmética contra reloj, Cifras y Snake; persistencia de resultados; pantalla de resultados y estadísticas básicas; 5 niveles por juego                                                                                                                                                                                                                                                                                                               |        3–5         |
| **Fase 2 — Cascada y expansión matemática** | **Cascada (clon de Tetris)** como primera entrega, sobre el bucle de tiempo real validado por Snake; luego Secuencias numéricas, Estimación relámpago y Simon; racha de días; exportación JSON                                                                                                                                                                                                                                                        |        4–6         |
| **Fase 3 — Empaquetado móvil (opcional)**   | Capacitor → Android primero (evaluar iOS después según costo/beneficio), íconos y splash, publicación en Google Play                                                                                                                                                                                                                                                                                                                                  |        2–4         |
| **Fase 4 — Extras (opcional)**              | Puzzle diario compartible, logros, sonido chiptune refinado, generador propio de sudokus, modo progresivo, tema claro                                                                                                                                                                                                                                                                                                                                 |      continua      |

---

## 15. Métricas de éxito

**Arquitectónicas (las que más importan en este proyecto):**

- Agregar un juego P1/P2 requiere modificar cero archivos del shell (solo la línea del registro).
- Un juego de complejidad Baja se completa en 1 sesión de Claude Code; uno de complejidad Media, en 2.

**De producto:**

- La app carga en menos de 2 segundos y funciona sin conexión (RNF-01, RNF-02).
- Diez o más juegos publicados dentro de los 6 meses del inicio.
- Identidad visual reconocible: una captura del catálogo se identifica como "Desafíos Mentales" sin leer el nombre.
- Uso personal sostenido (el primer usuario satisfecho es el autor).

**Didácticas:**

- El repositorio sirve como material central de al menos un taller o curso.
- Una persona externa puede clonar, correr y agregar un juego siguiendo solo el README y el PRD.

---

## 16. Riesgos y mitigaciones

| Riesgo                                                                  | Impacto                                         | Mitigación                                                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Deriva de alcance ("una funcionalidad más...")                          | Proyecto eterno, nunca publicado                | Lista de no-objetivos (2.2); toda propuesta nueva entra por el backlog, no por impulso                                      |
| Inconsistencia de código entre sesiones de vibe coding                  | Base de código incoherente, difícil de mantener | `CLAUDE.md` + contrato tipado estricto + tokens de diseño + linter en CI + ADR que fijan decisiones                         |
| Encarar Cascada (tiempo real, complejidad Alta) sin fundaciones         | Frustración, retrabajos                         | **Snake dentro del MVP valida el bucle de tiempo real**; Cascada se construye sobre esa base como primera entrega de Fase 2 |
| Paleta que no cumple contraste AA                                       | Accesibilidad comprometida                      | La paleta se valida contra RNF-05 antes de fijarse en ADR-003 (revalidada en ADR-004 al cambiar la tipografía)              |
| Generación de puzzles con solución única (Sudoku, Nonograma) es difícil | Bloqueo en un juego                             | v1 con banco de puzzles precargados y verificados; generador propio como mejora posterior                                   |
| Problemas de marcas por nombres o estética de clones                    | Reclamo legal en repo público                   | Regla de la sección 11.2: nombres, arte y sonidos originales                                                                |
| Rendimiento pobre en celulares de gama baja                             | Mala experiencia                                | Presupuesto de rendimiento (RNF-02/03) verificado en dispositivo real desde Fase 0                                          |

---

## 17. Registro de decisiones

### 17.1 Decisiones tomadas (v0.2, julio 2026)

| #   | Decisión                              | Resolución                                                                                     |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Plataforma                            | Aplicación web progresiva (PWA), con camino evolutivo a Capacitor                              |
| 2   | Nombre del producto y repositorio     | **Desafíos Mentales** / `desafios-mentales`                                                    |
| 3   | Estilos                               | Tailwind CSS                                                                                   |
| 4   | Licencia                              | GNU General Public License v3.0                                                                |
| 5   | Idioma del código                     | Inglés en código; español en textos visibles y documentación                                   |
| 6   | Juego trivial de validación de Fase 0 | "Tiempo de reacción" (medir milisegundos al tocar cuando cambia el color)                      |
| 7   | Dirección visual                      | Pixel art minimalista (sección 10)                                                             |
| 8   | Prioridades del catálogo              | Tetris (Cascada), Snake y juegos de matemática al frente; eliminados 2048, Buscaminas\* y Kakuro |

\* Decisión revisada más adelante: Buscaminas se reincorporó al catálogo como juego #24 (ver sección 11 y CHANGELOG 0.28.0). Esta tabla documenta la decisión tal como se tomó en v0.2, no el estado actual del catálogo.

### 17.2 Decisiones pendientes (se resuelven en Fase 0, como ADR-003)

| #   | Decisión                                                     | Recomendación del documento                                                   |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1   | Paleta exacta (≤ 12 colores)                                 | Subconjunto de Sweetie 16 o PICO-8, ajustado a contraste AA sobre tema oscuro |
| 2   | Fuente pixel definitiva para display/HUD                     | "Press Start 2P" (Google Fonts) como candidata inicial                        |
| 3   | Sonido en v1: ¿efectos chiptune desde el MVP o desde Fase 2? | Incluir en MVP solo si no demora la entrega; son 4 efectos básicos            |

### 17.3 Decisiones revisadas (v0.3, julio 2026)

| #   | Decisión                    | Resolución v0.2                        | Resolución v0.3                                                                               |
| --- | --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Dirección visual            | Pixel art minimalista                  | **Minimalismo moderno** (sección 10, ADR-004) — el pixel art no funcionaba estéticamente      |
| 2   | Tipografía de display/HUD   | "Press Start 2P" (fuente pixel)        | Una sola familia (Inter), con roles de peso en vez de una fuente pixel separada               |
| 3   | Paleta de colores (ADR-003) | Subconjunto de Sweetie 16, validado AA | Sin cambios — se mantiene la misma paleta, funciona igual de bien en el nuevo lenguaje visual |

### 17.4 Decisiones revisadas (v0.4, julio 2026)

| #   | Decisión                              | Resolución Fase 2                                                      | Resolución v0.4                                                                                                                                                     |
| --- | ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Controles táctiles de Snake y Cascada | Solo gestos de deslizamiento (sin d-pad en pantalla, PRD 5.2 / Fase 2) | Se agregan controles táctiles directos en pantalla (botones) como entrada principal en celular (RNF-11); el deslizamiento queda como atajo opcional, no obligatorio |
| 2   | Operabilidad por teclado              | Implícita en cada juego, sin requisito explícito                       | RNF-11 la vuelve requisito explícito para todos los juegos, presentes y futuros                                                                                     |

---

## 18. Glosario

- **Shell:** la aplicación contenedora (navegación, catálogo, estadísticas) que hospeda a los juegos.
- **Contrato de módulo:** el conjunto de interfaces TypeScript que todo juego debe implementar para enchufarse al shell.
- **Tokens de diseño:** valores nombrados y centralizados de color, tipografía y escala que definen la identidad visual; en este proyecto viven en la configuración de Tailwind y son parte del contrato.
- **Semilla (seed):** número inicial que determina la secuencia pseudoaleatoria; con la misma semilla, la misma partida.
- **PWA (Progressive Web App):** aplicación web instalable en el celular, con funcionamiento sin conexión.
- **ADR (Architecture Decision Record):** documento breve que registra una decisión de arquitectura, sus alternativas y consecuencias.
- **Copyleft:** condición de licencias como la GPL v3.0 por la cual las obras derivadas distribuidas deben conservar la misma licencia y publicar su código fuente.
- **Chiptune:** estética sonora de 8 bits, propia de las consolas retro.
- **Vibe coding:** flujo de desarrollo donde un agente de inteligencia artificial (Claude Code) escribe el código a partir de especificaciones e iteración conversacional.
- **MVP (producto mínimo viable):** la versión más chica del producto que ya entrega valor completo.
