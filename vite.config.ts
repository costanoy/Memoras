import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// `--mode desktop` e `--mode mobile` geram os pacotes que vão dentro do .exe e do .apk:
// sem service worker, porque ali os arquivos já estão no aparelho.
export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    mode !== 'desktop' && mode !== 'mobile' && VitePWA({
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
      workbox: { globPatterns: ['**/*.{js,css,html,png,woff2,mp3}'] },
    }),
  ],
}));
