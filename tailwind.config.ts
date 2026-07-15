import type { Config } from 'tailwindcss';

// Tokens de diseño — contrato visual del proyecto (PRD sección 10.1).
// Ningún juego define colores, fuentes ni escalas fuera de este archivo.
//
// Desde ADR-009 los colores son una capa semántica sobre variables CSS: cada
// token apunta a una variable definida en src/styles/index.css, con un valor
// por tema (claro por defecto, oscuro vía [data-theme='dark']). Las clases de
// Tailwind que usan los juegos y el shell no cambian — `bg-surface` significa
// "superficie del tema activo", sea cual sea. Ambas paletas están validadas
// contra contraste AA (ADR-003 para la oscura, ADR-009 para la clara); el
// documento de referencia visual completo es docs/design-system.md.
//
// El formato `rgb(var(--x) / <alpha-value>)` conserva los modificadores de
// opacidad (`bg-game-1/25`, `border-game-2/40`) que ya usa todo el catálogo.
function token(name: string): string {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: token('bg'),
      surface: token('surface'),
      'surface-alt': token('surface-alt'),
      'text-primary': token('text-primary'),
      'text-secondary': token('text-secondary'),
      'accent-primary': token('accent-primary'),
      'accent-success': token('accent-success'),
      'accent-error': token('accent-error'),
      'game-1': token('game-1'),
      'game-2': token('game-2'),
      'game-3': token('game-3'),
      'game-4': token('game-4'),
      'game-5': token('game-5'),
      'game-6': token('game-6'),
    },
    fontFamily: {
      // Una sola familia (Inter): "display" y "body" son roles de peso/tamaño,
      // no tipografías distintas.
      display: ['Inter', 'system-ui', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.4' }],
      sm: ['0.875rem', { lineHeight: '1.4' }],
      base: ['1rem', { lineHeight: '1.5' }],
      md: ['1.125rem', { lineHeight: '1.45' }],
      lg: ['1.25rem', { lineHeight: '1.4' }],
      xl: ['2rem', { lineHeight: '1.3' }],
      // 2xl (ADR-008): para números "hero" (puntaje de resultado) — el hueco
      // entre lg y xl ya alcanza para títulos, este tamaño es exclusivo de
      // lo que necesita pesar más que cualquier título de sección.
      '2xl': ['2.75rem', { lineHeight: '1.15' }],
    },
    extend: {
      spacing: {
        touch: '2.75rem', // 44px — objetivo táctil mínimo (RNF-04)
      },
      minHeight: {
        touch: '2.75rem',
      },
      minWidth: {
        touch: '2.75rem',
      },
      // Elevación (ADR-008): "card" para lo apoyado en la superficie (tarjetas,
      // filas de lista), "raised" para lo que flota sobre el contenido
      // (diálogos, panel de resultado). Desde ADR-009 el valor vive en una
      // variable por tema: el oscuro necesita sombras más marcadas (hay poco
      // contraste tonal contra el fondo), el claro las lleva suaves y difusas.
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        // Entrada de pantalla (ADR-008); ya cubierta por la regla global de
        // prefers-reduced-motion/.reduce-animations (src/styles/index.css).
        'fade-in': 'fade-in 200ms ease-out',
        // Celebración puntual de récord nuevo en ResultPanel.
        pop: 'pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
