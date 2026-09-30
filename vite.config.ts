import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `--mode desktop` gera o pacote que vai dentro do .exe: sem service worker,
// porque ali os arquivos já estão no disco.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode !== 'desktop' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png'],
      manifest: {
        name: 'Memoras',
        short_name: 'Memoras',
        description: 'Diário pessoal privado. Funciona sem internet.',
        lang: 'pt-BR',
        display: 'standalone',
        theme_color: '#1fd0c8',
        background_color: '#1fd0c8',
        icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,woff2}'] },
    }),
  ],
}));
