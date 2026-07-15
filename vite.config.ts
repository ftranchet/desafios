/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/desafios/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: '/desafios/',
        name: 'Desafíos Mentales',
        short_name: 'Desafíos',
        description:
          'Colección de juegos mentales — matemática, lógica, memoria, velocidad y razonamiento espacial. Sin publicidad, sin cuentas.',
        lang: 'es-AR',
        start_url: '/desafios/',
        scope: '/desafios/',
        display: 'standalone',
        // Splash e interfaz de la PWA instalada: el tema claro por defecto
        // (ADR-009). El meta theme-color del documento sí sigue al tema activo
        // en vivo (App.tsx); el manifest es estático y toma el default.
        background_color: '#f4f2fa',
        theme_color: '#f4f2fa',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Sin .woff: RNF-09 apunta a las últimas dos versiones de Chrome/Safari
        // móviles, que ya soportan woff2 — evita precachear el fallback de más peso.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    // Node por defecto (lógica pura); los tests que necesitan DOM (smoke de
    // render, persistencia) lo piden por archivo con `@vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
