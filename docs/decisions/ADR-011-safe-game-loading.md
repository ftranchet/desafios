# ADR-011 — Alta transaccional y carga aislada de juegos

**Estado:** Aceptada
**Fecha:** Julio de 2026

## Contexto

El registro importaba los módulos completos de todos los juegos durante el
arranque. Eso tenía dos consecuencias contrarias a la promesa de aislamiento:
una excepción al evaluar cualquier juego ocurría antes de montar los error
boundaries de React, y el JavaScript inicial crecía con cada alta.

El generador también dependía de posiciones implícitas dentro de
`registry.ts`, aceptaba algunos IDs que no podían convertirse en identificadores
TypeScript y publicaba archivos antes de comprobar que podía actualizar el
registro. Un error dejaba una carpeta parcial. El E2E duplicaba manualmente la
cantidad de juegos.

Por último, `GameMode.params` se declaraba en los metadatos, pero el shell nunca
lo consumía: cada juego resuelve sus parámetros internamente desde `ModeId`.
Conservarlo obligaba al catálogo a importar `logic.ts`, anulando la separación
entre metadatos y código interactivo.

## Decisión

1. El catálogo usa `GameDefinition`, compuesto por metadatos livianos y
   `load(): Promise<GameModule>`.
2. Cada juego mantiene sus metadatos en `metadata.ts`, que solo puede depender
   del contrato, los modos canónicos y assets estáticos. `logic.ts` y `ui.tsx`
   se cargan mediante un `import()` literal al entrar a la partida. Una regla de
   lint con lista blanca hace ejecutable esta frontera y exige que `name` sea un
   literal estático para poder comprobar su unicidad sin evaluar TypeScript.
3. `index.ts` conserva el export nombrado por compatibilidad y agrega un export
   default para que todos los loaders tengan la misma forma.
4. `howToPlay` pasa a ser obligatorio en TypeScript. `GameMode.params` se
   elimina del contrato; `buildModes` declara únicamente si existen Tranquilo
   o Progresivo.
5. `registry.ts` expone marcadores explícitos para el generador. El CLI valida
   por completo ID, nombre visible único, carpeta y registro antes de publicar;
   un lock exclusivo serializa procesos concurrentes, prepara los archivos en
   temporales, actualiza mediante renames y revierte la carpeta si falla el
   registro. `--dry-run` permite verificar sin escribir.
6. El scaffold contiene placeholders deliberados que el test de contrato
   rechaza. Crear archivos no equivale a entregar un juego terminado.
7. Los tests consultan el registro como fuente única; ningún E2E duplica la
   cantidad de juegos en un literal.

## Consecuencias

- Un fallo al cargar la lógica o UI de un juego queda dentro de
  `GameErrorBoundary`; catálogo, estadísticas y otros juegos siguen disponibles.
- El arranque solo evalúa core, shell, metadatos e iconos. Cada juego produce un
  chunk separado. La PWA puede seguir precacheando esos chunks para conservar
  el funcionamiento offline.
- Agregar un juego suma un archivo `metadata.ts`, pero reduce el acoplamiento y
  vuelve explícita la frontera entre catálogo y gameplay.
- El primer ingreso a un juego puede mostrar brevemente un estado “Cargando
  juego…”. Las visitas siguientes reutilizan la caché de módulos del navegador.
- Los tests de render deben esperar el loader asíncrono antes de montar el
  componente.
- La transacción cubre errores normales del proceso; como en cualquier cambio
  de varios archivos, una interrupción abrupta del sistema entre renames puede
  dejar una carpeta no registrada, que Git permite detectar y recuperar.
