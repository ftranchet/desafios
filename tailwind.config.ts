import type { Config } from 'tailwindcss';

// Tokens de diseño — contrato visual del proyecto (PRD sección 10.1).
// Ningún juego define colores, fuentes ni escalas fuera de este archivo.
// Paleta validada contra contraste AA (WCAG) sobre bg/surface — ver ADR-003.
// Tipografía y geometría: minimalismo moderno sobre tema oscuro — ver ADR-004
// (reemplaza el pixel art de la ADR-003; la paleta de colores sigue vigente).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
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
      lg: ['1.25rem', { lineHeight: '1.4' }],
      xl: ['2rem', { lineHeight: '1.3' }],
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
    },
  },
  plugins: [],
} satisfies Config;
