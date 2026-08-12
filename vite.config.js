import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // O manifesto já existe em public/manifest.webmanifest, escrito à mão
      // (com o nome, ícones e cores do Memoras) — o plugin só cuida do
      // service worker, não gera um manifesto novo por cima do nosso.
      manifest: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      workbox: {
        // Todo o "app shell" (HTML/JS/CSS/ícones) fica em cache: o site abre
        // e funciona sem internet. Os dados em si já são locais (IndexedDB).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            // Fontes do Google (Nunito / Source Serif 4) também ficam
            // disponíveis offline depois da primeira visita.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'memoras-google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'memoras-google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
