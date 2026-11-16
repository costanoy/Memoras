# Fase 1: Agente Ferramentas

Projeto: Memoras, branch melhorias-claude, versão 1.1.4. Nenhum código do app foi alterado e nenhum commit foi feito.

## Resultado por checagem

| Checagem | Resultado | Log |
|---|---|---|
| `npx tsc --noEmit` | Sem erros (saída 0) | `.auditoria/tsc.log` |
| `npm run build` (tsc + vite build) | Sem erros. 1 aviso de tamanho de chunk (ver abaixo) | `.auditoria/build.log` |
| `npx vite build --mode desktop --outDir .auditoria/tmp-desktop` | Sem erros. Mesmo aviso de chunk. Pasta temporária apagada depois | `.auditoria/desktop.log` |
| `npm audit --omit=dev` | 0 vulnerabilidades em dependências de produção | `.auditoria/audit-prod.log` |
| `npm audit` (completo) | 25 vulnerabilidades: 10 altas, 13 moderadas, 2 baixas. Todas em dependências de desenvolvimento | `.auditoria/audit-all.log` |
| `node --check` | OK em `electron/main.cjs`, `electron/preload.cjs`, `scripts/apk.mjs`, `scripts/release.mjs` | (saída direta) |

## Avisos e erros com arquivo e linha

- Erros de TypeScript: nenhum.
- Erros de build: nenhum.
- Erros de sintaxe Node: nenhum.
- Aviso do Vite (chunk maior que 500 kB após minificação):
  - `dist/assets/index-CLadwVsK.js`, 590,59 kB (gzip 169,93 kB). Igual no build de produção e no desktop.
  - O Vite sugere code splitting (import() dinâmico) ou ajustar `build.chunkSizeWarningLimit`. Não há linha de código associada.
- Aviso do plugin PWA (informativo): 42 entradas no precache, 1537,68 KiB. Arquivos gerados: `dist/sw.js` e `dist/workbox-9c191d2f.js`.
- Efeito colateral: o `npm run build` regravou a pasta `dist/` do projeto (saída normal do build).

## Linter e testes

- Não há ESLint, Vitest, Jest nem outro linter ou runner de testes configurado. Não há arquivos `eslint*`, `.eslintrc*`, `vitest*` ou `jest*` na raiz, e o `package.json` não tem scripts de `lint` ou `test`. Nada foi instalado.

## Vulnerabilidades (npm audit completo)

Todas são de dependências de desenvolvimento (fora do `--omit=dev`):
- `zod <4.6.6` (alta): puxada por `@remotion/*` (`cli`, `codemods`, `elevenlabs`, `media`, `openai-whisper`, `studio-protocol`, `studio-server`, `bundler`, `studio`). Afeta o pacote de vídeo (Remotion), não o app.
- `rimraf 4.2.0 - 6.1.3` e `glob` (moderada): via `@electron/universal` e dependências do electron-builder.
- `uuid <11.1.1` (moderada): via `xcode`/electron-builder.
- `deepmerge` (moderada): via `@rollup/plugin-node-resolve`.
- Correção automática existe com `npm audit fix`, mas `--force` pode quebrar dependências. Não foi executado.

## Observações

- A pasta `.auditoria/prints/` já existia antes desta checagem. Não foi tocada.
- Arquivos criados por esta fase: `.auditoria/tsc.log`, `.auditoria/build.log`, `.auditoria/desktop.log`, `.auditoria/audit-prod.log`, `.auditoria/audit-all.log` e este relatório.
