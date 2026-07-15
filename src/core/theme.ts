// Lectura en runtime de los tokens de color del tema activo (ADR-009).
//
// Los juegos que dibujan en canvas (Snake, Cascada) no pueden usar clases de
// Tailwind: necesitan valores de color reales. Antes copiaban los hex de
// tailwind.config.ts a mano — una copia que se desactualiza y que ignora el
// tema activo. Este módulo resuelve el token contra las variables CSS que
// definen los temas (src/styles/index.css), así el canvas pinta siempre con
// la paleta del tema vigente sin conocer ningún valor.
//
// Se lee al montar el componente: la preferencia de tema solo puede cambiar
// en la pantalla de Configuración, nunca en medio de una partida.

export type ColorToken =
  | 'bg'
  | 'surface'
  | 'surface-alt'
  | 'text-primary'
  | 'text-secondary'
  | 'accent-primary'
  | 'accent-success'
  | 'accent-error'
  | 'game-1'
  | 'game-2'
  | 'game-3'
  | 'game-4'
  | 'game-5'
  | 'game-6';

// Fallback para entornos sin la hoja de estilos cargada (jsdom en los smoke
// tests de render): la paleta oscura histórica (ADR-003). En el navegador
// real nunca se usa — las variables siempre están definidas.
const FALLBACK: Record<ColorToken, string> = {
  bg: '#0f0e17',
  surface: '#1a1826',
  'surface-alt': '#26223a',
  'text-primary': '#f4f4f2',
  'text-secondary': '#a6a2bd',
  'accent-primary': '#3fd0c9',
  'accent-success': '#6bcf63',
  'accent-error': '#f4557a',
  'game-1': '#ffcd4b',
  'game-2': '#8a6dff',
  'game-3': '#ff8b3d',
  'game-4': '#3fa7d6',
  'game-5': '#b56ee0',
  'game-6': '#6b7ff0',
};

/** Color CSS listo para usar (canvas, SVG inline) del token en el tema activo. */
export function themeColor(token: ColorToken): string {
  if (typeof window === 'undefined') return FALLBACK[token];
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${token}`)
    .trim();
  return raw ? `rgb(${raw})` : FALLBACK[token];
}

/** Variante con opacidad (equivalente a `token/alpha` en Tailwind). */
export function themeColorWithAlpha(token: ColorToken, alpha: number): string {
  if (typeof window !== 'undefined') {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(`--color-${token}`)
      .trim();
    if (raw) return `rgb(${raw} / ${alpha})`;
  }
  const hex = FALLBACK[token];
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
