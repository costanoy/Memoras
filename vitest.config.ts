import { defineConfig } from 'vitest/config';

// Testes automáticos (cifra, junção e migração). Config separada do vite.config.ts: sem PWA e sem CSP.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
