import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// Versões de Windows e web: a página só roda os próprios scripts e só conversa com o Supabase do .env
// e com o GitHub (busca de atualização).
// Se um dia algum texto virar código por engano, ele não roda nem manda nada para fora.
function csp(supabase = '') {
  const sb = supabase ? ' ' + supabase + ' ' + supabase.replace(/^http/, 'ws') : '';
  const policy = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "font-src 'self' data:", "media-src 'self' data: blob:", "connect-src 'self' https://api.github.com" + sb,
    "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'",
  ].join('; ');
  return {
    name: 'memoras-csp',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' as const }],
  };
}

// `--mode desktop` e `--mode mobile` geram os pacotes que vão dentro do .exe e do .apk:
// sem service worker, porque ali os arquivos já estão no aparelho.
// A política vale em todo build (nunca no `vite dev`, onde quebraria o recarregamento do React).
// O pacote do Android ainda fica sem ela: falta conferir num aparelho que o app abre sem violação de CSP.
export default defineConfig(({ mode, command }) => ({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    command === 'build' && mode !== 'mobile' && csp(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL),
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
