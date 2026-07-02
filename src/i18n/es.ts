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
    filterAll: 'Todos',
    empty: 'Todavía no hay juegos en esta categoría.',
    bestScore: (score: number) => `Récord: ${score}`,
    noScore: 'Sin partidas todavía',
    continueLast: 'Seguir jugando',
  },
  levelPicker: {
    title: 'Elegí el nivel',
    play: 'Jugar',
  },
  game: {
    quit: 'Salir',
    quitConfirmTitle: '¿Salir de la partida?',
    quitConfirmBody: 'Se va a perder el progreso de esta partida.',
    quitConfirmAccept: 'Salir',
    quitConfirmCancel: 'Seguir jugando',
  },
  result: {
    title: 'Resultado',
    score: (score: number) => `Puntaje: ${score}`,
    newRecord: '¡Récord nuevo!',
    previousRecord: (score: number) => `Récord anterior: ${score}`,
    noPreviousRecord: 'Primera partida en este nivel',
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
  },
  common: {
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    back: 'Volver',
    on: 'Activado',
    off: 'Desactivado',
  },
};
