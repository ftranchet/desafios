// Todos los textos visibles al usuario, centralizados acá (RNF-07) para
// facilitar una futura traducción. Español con voseo (Argentina, PRD 10.6).

export const CATEGORY_LABELS: Record<string, string> = {
  memory: 'Memoria',
  logic: 'Lógica',
  math: 'Matemática',
  speed: 'Velocidad',
  spatial: 'Espacial',
  words: 'Palabras',
};

export const strings = {
  nav: {
    catalog: 'Catálogo',
    stats: 'Estadísticas',
    config: 'Configuración',
  },
  catalog: {
    title: 'Desafíos Mentales',
    filterByCategory: 'Filtrar por categoría',
    filterAll: 'Todos',
    empty: 'Todavía no hay juegos en esta categoría.',
    bestScore: (score: number) => `Récord: ${score}`,
    noScore: 'Sin partidas todavía',
    continueLast: 'Seguir jugando',
    favoritesTitle: 'Favoritos',
    favoriteAdd: 'Agregar a favoritos',
    favoriteRemove: 'Quitar de favoritos',
  },
  // Los nombres y descripciones de los modos (Fácil, Tranquilo, Progresivo...)
  // viven en src/core/modes.ts: son vocabulario del contrato (ADR-007) y los
  // juegos los declaran vía buildModes, no desde acá.
  modePicker: {
    title: 'Elegí cómo jugar',
    difficulty: 'Dificultad',
    special: 'Modos',
    play: 'Jugar',
  },
  game: {
    quit: 'Salir',
    quitConfirmTitle: '¿Salir de la partida?',
    quitConfirmBody: 'Se va a perder el progreso de esta partida.',
    quitConfirmAccept: 'Salir',
    quitConfirmCancel: 'Seguir jugando',
    crashTitle: 'El juego falló',
    crashBody:
      'Algo salió mal dentro de este juego. El resto de la app y tus récords están a salvo.',
    crashBack: 'Volver al catálogo',
  },
  result: {
    title: 'Resultado',
    newRecord: '¡Récord nuevo!',
    previousRecord: (score: number) => `Récord anterior: ${score}`,
    noPreviousRecord: 'Primera partida en este modo',
    zenNote: 'Modo tranquilo: sin récords, puro juego.',
    retry: 'Reintentar',
    backToCatalog: 'Volver al catálogo',
  },
  stats: {
    title: 'Estadísticas',
    streak: (days: number) => (days === 1 ? 'Racha: 1 día' : `Racha: ${days} días`),
    streakEmpty: 'Todavía no jugaste ninguna partida. Elegí un juego para empezar.',
    records: 'Récords',
    history: 'Últimas partidas',
    historyEmpty: 'Todavía no hay partidas en el historial.',
    abandoned: 'Abandonada',
  },
  config: {
    title: 'Configuración',
    sound: 'Sonido',
    vibration: 'Vibración',
    reduceAnimations: 'Reducir animaciones',
    exportData: 'Exportar datos',
    exportDataHint: 'Descargá tus partidas y récords en un archivo JSON.',
    clearData: 'Borrar todos los datos',
    clearConfirmTitle: '¿Borrar todos los datos?',
    clearConfirmBody:
      'Se van a eliminar todos los récords, partidas e historial. Esta acción no se puede deshacer.',
    clearConfirmAccept: 'Borrar todo',
    clearConfirmCancel: 'Cancelar',
    clearConfirmFinalTitle: 'Confirmá de nuevo',
    clearConfirmFinalBody: 'Última confirmación: se borra todo para siempre.',
    creditBefore: 'Por ',
    creditName: 'Francisco Tranchet',
    creditAfter: ' + IA.',
  },
  common: {
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    back: 'Volver',
    on: 'Activado',
    off: 'Desactivado',
  },
  appCrash: {
    title: 'Algo salió mal',
    body: 'La aplicación tuvo un problema inesperado. Tus datos guardados están a salvo; recargá para seguir.',
    reload: 'Recargar',
  },
  notFound: {
    title: 'No encontramos esta pantalla',
    body: 'El enlace no corresponde a ninguna sección de la app.',
    backToCatalog: 'Ir al catálogo',
  },
};
