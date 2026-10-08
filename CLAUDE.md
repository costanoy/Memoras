# Memoras

- Referência de design: `design_handoff_memoras/` (fidelidade alta, textos finais em pt-BR, sem travessões).
- O branch `obsoleto-nao-usar` do GitHub guarda uma versão antiga (React + Firebase). É obsoleto: nunca copie, consulte nem restaure nada dele.
- Versões do app de Windows saem pelos Releases de `costanoy/Memoras` (`npm run release`); o app instalado se atualiza por eles.
- O `.env` (fora do Git) tem a URL e a chave publishable do Supabase. Sem ele o app sai sem contas, e o `npm run release` cancela.
- O link de "Esqueci minha senha" abre o app por `memoras://senha` (fluxo PKCE). Esse endereço está em `src/sync.ts`, `electron/main.cjs`, `AndroidManifest.xml` e nas Redirect URLs do Supabase: mude nos quatro ou em nenhum.

## Nunca perder anotações numa atualização
- As anotações ficam no IndexedDB `memoras`, preso ao endereço do app: `app://memoras` no Windows (`electron/main.cjs`) e `https://localhost` no Android (`capacitor.config.json`). Não mude esses endereços, o `appId` nem o nome do banco.
- Mudança de estrutura do banco: suba `DB_VERSION` em `src/lib/db.ts` e só acrescente passos de migração; nunca apague stores.
- A cada versão nova, o app guarda uma cópia dos dados anteriores no próprio aparelho (`backup:<versão>`, as 3 últimas).
- O APK precisa sair sempre com a chave de `~/.memoras`; o `npm run release` confere a assinatura e cancela se for outra.
- No Windows, a atualização chama o desinstalador antigo com `--updated`, que não apaga os dados (testado em 01/10/2026 com uma cópia "MemorasTeste").
