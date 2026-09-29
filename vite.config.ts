/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const sha = (process.env.GITHUB_SHA ?? '').slice(0, 7);

export default defineConfig({
  base: './',
  define: { __APP_BUILD__: JSON.stringify(sha ? `${stamp} UTC · ${sha}` : `${stamp} UTC`) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Osobný tréningový denník',
        short_name: 'Tréning',
        description: 'Osobný tréningový denník. Funguje offline, dáta zostávajú v zariadení.',
        lang: 'sk',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2,webp}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 700 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
