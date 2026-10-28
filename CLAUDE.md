# Memoras

- Referência de design: `design_handoff_memoras/` (fidelidade alta, textos finais em pt-BR, sem travessões).
- O branch `obsoleto-nao-usar` do GitHub guarda uma versão antiga (React + Firebase). É obsoleto: nunca copie, consulte nem restaure nada dele.
- Versões do app de Windows saem pelos Releases de `costanoy/Memoras` (`npm run release`); o app instalado se atualiza por eles.
- O `.env` (fora do Git) tem a URL e a chave publishable do Supabase. Sem ele o app sai sem contas, e o `npm run release` cancela.
- Com o app travado pelo PIN, nenhuma tela leva a login ou cadastro: entrar em outra conta enviaria o diário do aparelho para ela. Quem garante são `WHILE_LOCKED` em `src/store.ts` e `lockedGuard` em `src/sync.ts`; mantenha os dois em qualquer fluxo novo.
- Mini-Memoras (só no Windows): o modo e o tamanho das duas janelas ficam em `janela.json`, na pasta de dados do app (`electron/main.cjs`), fora do IndexedDB. Nunca passe o modo pela URL: a origem `app://memoras` não pode mudar. No CSS, o mini é `html[data-mini]` (a classe `.mini` já é dos botões das tarefas).
- No CSS, use só `backdrop-filter`, sem o `-webkit-backdrop-filter`: o build juntava os dois e ficava com o prefixado, que o Chromium do app não aplica (o vidro saía sem desfoque).
- O link de "Esqueci minha senha" abre o app por `memoras://senha` (fluxo PKCE). Esse endereço está em `src/sync.ts`, `electron/main.cjs`, `AndroidManifest.xml` e nas Redirect URLs do Supabase: mude nos quatro ou em nenhum.

## Nunca perder anotações numa atualização
- As anotações ficam no IndexedDB `memoras`, preso ao endereço do app: `app://memoras` no Windows (`electron/main.cjs`) e `https://localhost` no Android (`capacitor.config.json`). Não mude esses endereços, o `appId` nem o nome do banco.
- Mudança de estrutura do banco: suba `DB_VERSION` em `src/lib/db.ts` e só acrescente passos de migração; nunca apague stores.
- Cadernos e Agenda (`src/lib/items.ts`) vão para o servidor na tabela `notes`, com `kind` dentro do texto cifrado. Nunca dê a eles um campo `segs`: é por não terem `segs` que as versões antigas (até a 1.0.4) os ignoram sem quebrar.
- A cor de anotações e cadernos (`color`/`colorTs`) não existe até a 1.1.1: essas versões descartam a cor ao gravar, e a junção pelo `colorTs` devolve a cor no aparelho novo. `content()` e `itemContent()` precisam continuar aceitando dados sem esses campos.
- Caderno arquivado (`status: 'archived'`) não existe até a 1.1.2: essas versões não reconhecem e deixam o caderno de fora, sem apagar. Não troque esse estado por outro nome.
- Caderno fixado (`pinned`/`pinnedTs`) não existe até a 1.1.3: essas versões descartam o campo ao gravar, e a junção pelo `pinnedTs` devolve o "fixado" no aparelho novo. `itemContent()` precisa continuar aceitando cadernos sem esses campos.
- Com conta, o PIN é um só para todos os aparelhos: vai cifrado dentro de `prefs` do cofre (`pin: { hash, salt, ts }`, vale o `ts` mais novo; quem entra na conta adota o PIN dela). Versões até a 1.1.2 gravam `prefs` sem o `pin`, e a próxima sincronização de um aparelho novo o devolve. Pedir PIN (`pinOn`) e a digital (`bioOn`) continuam sendo de cada aparelho.
- A cada versão nova, o app guarda uma cópia dos dados anteriores no próprio aparelho (`backup:<versão>`, as 3 últimas).
- O APK precisa sair sempre com a chave de `~/.memoras`; o `npm run release` confere a assinatura e cancela se for outra.
- No Windows, a atualização chama o desinstalador antigo com `--updated`, que não apaga os dados (testado em 01/10/2026 com uma cópia "MemorasTeste").
