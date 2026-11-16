# Auditoria técnica do Memoras (branch melhorias-claude)

Auditor Técnico, Fase 2. Somente leitura: nenhum arquivo do app foi alterado, o app instalado e `%APPDATA%\Memoras` não foram abertos e nada foi enviado ao Supabase.

Base: os resumos da Fase 1 (`fase1-mapa.md`, `fase1-ferramentas.md`, `fase1-inventario.md`, `fase1-prints.md`) e a leitura do código atual (`src/`, `electron/`, `android/`, `supabase/schema.sql`, `scripts/`, `site/`).

Legenda: **confirmado** quer dizer verificado no código, com o caminho até o defeito seguido de ponta a ponta. **Provável** quer dizer que o código indica o defeito, mas ele ainda precisa ser reproduzido no app.

## Pistas da revisão anterior: o que ainda vale

| Pista | Situação no código atual |
|---|---|
| Recarga após crash com a janela minimizada pula o PIN | **Vale** (T1) |
| Regra de PIN em janela baixa perde a área segura do Android | **Vale** (T2) |
| Atalhos trocam de tela sem salvar o campo focado | **Vale** para a tarefa nova da Agenda (T3) |
| Diálogo de confirmação não devolve o foco; inert congela a barra de título | **Vale** (T4) |
| Teclas Editar/Pronto perdem o foco | **Vale** (T4) |
| `::-webkit-scrollbar` global afeta Android/PWA | **Vale** (T12) |
| Piscada de tema ao abrir | **Vale** fora do fundo da janela do Windows (T13) |
| Placeholder `#56707f` sem contraste | Não incluída: dá cerca de 5:1 sobre o vidro claro, passa no AA |
| Defeitos em forced-colors | Não incluída: `styles.css:428-440` já cobre toggle, PIN, seleção e botões |
| Regra só-ícones espreme a pílula "Hoje" | Não incluída: virou container query (`styles.css:410-414`), sem defeito visível nos prints |
| Barra de título cortada entre 360 e 400 px | Não incluída: `.tbtitle` some abaixo de 480 px e `.tbupd` tem reticências (`styles.css:416-417`) |
| `focusLast` ainda dá salto de rolagem | Não incluída: não reproduzida, e o `focus()` em `Shell.tsx:208` só roda com a anotação vazia ou no clique no papel |
| Página `site/confirmado.html` | Não incluída: tira o código do endereço (`:45`), trata erro na consulta e no `#`, tem `noindex`. Sem defeito |

## Itens

### T1. Recarga após crash com a janela minimizada abre o diário sem PIN
- **Severidade:** alta (confirmado no código)
- **Evidência:** `electron/main.cjs:223-230` (o `render-process-gone` chama `webContents.reload()`); `src/store.ts:653-684` (`init`: `grace` = saída recente, e depois `cfg.awayAt = 0`); `src/store.ts:253-259` (`appBack` só retranca se `awaySince` > 0); `src/store.ts:269` (só `visibilitychange` alimenta `awaySince`).
- **Como reproduzir:** ligue o PIN e minimize a janela. Ela grava `awayAt`. Com a janela ainda minimizada, derrube o renderizador (por exemplo `process.crash()` no DevTools de uma cópia de teste com `--user-data-dir`). O reload acontece em segundo plano. Como a saída foi há segundos, `init` aplica a carência e destrava. A página já nasce `hidden`, então nunca recebe o evento de esconder, e `awaySince` fica 0. Volte horas depois: o diário aparece aberto, sem PIN.
- **O que mudar:** no fim de `init`, se `document.visibilityState === 'hidden'`, chamar `appAway()` (ou fazer `awaySince = cfgAntigo.awayAt || Date.now()`) antes de liberar. Opcional: no `main.cjs`, só recarregar após crash se a janela estiver visível, ou mandar um `away` logo depois do reload.
- **Critério de pronto:** numa cópia de teste, crash com a janela minimizada e volta depois do tempo de "Pedir PIN após" mostram o PIN. Crash com a janela visível continua sem PIN dentro da carência.

### T2. PIN em tela baixa no Android fica por baixo da barra de status
- **Severidade:** média (confirmado no CSS)
- **Evidência:** `src/styles.css:94` (`.flow` soma `var(--sat)` e `var(--sab)` ao padding); `src/styles.css:399-404` (`@media (max-height:760px)` troca por `padding-top:12px;padding-bottom:12px`, sem as áreas seguras). A maioria dos celulares tem menos de 760 px de altura em CSS (o print de referência usa 390x844, então o defeito não aparece nele).
- **Como reproduzir:** num Android com 360x740 (ou no emulador), ligue o PIN e bloqueie. O título do PIN encosta ou passa por baixo da barra de status, e o teclado encosta na barra de gestos.
- **O que mudar:** `padding-top:calc(12px + var(--sat));padding-bottom:calc(12px + var(--sab))` na regra de 760 px. Se a regra só serve a laptops, outra saída é restringir a `html.electron`.
- **Critério de pronto:** print do PIN a 360x740 com inset de status simulado mostra o cartão inteiro abaixo da barra. O desktop a 1366x768 continua sem rolagem.

### T3. Atalho de teclado troca de tela e perde a tarefa que estava sendo digitada
- **Severidade:** média (provável; só no Windows)
- **Evidência:** `src/App.tsx:22-55` (Ctrl+N, Ctrl+1/2/3 e Ctrl+F chamam `addNew`, `goSection` e `openTool` sem salvar o campo focado); `src/screens/Agenda.tsx:104-117` (`NewTask` guarda o texto em `useState` local e só grava no Enter ou no `onBlur`). O React não dispara `onBlur` quando o campo é desmontado com a tela.
- **Como reproduzir:** na Agenda, clique em "Nova tarefa", digite "comprar pão" e aperte Ctrl+1. Volte à Agenda: a tarefa não existe. Os campos das tarefas que já existem salvam a cada tecla (`Agenda.tsx:96`) e não perdem nada.
- **O que mudar:** em `useShortcuts`, antes de trocar de tela, chamar `(document.activeElement as HTMLElement)?.blur()` para o `onBlur` gravar. Outra saída: `NewTask` gravar o rascunho num efeito de desmontagem.
- **Critério de pronto:** com o texto digitado na tarefa nova, Ctrl+1/2/3, Ctrl+N e Ctrl+F deixam a tarefa salva na lista.

### T4. Foco do teclado se perde no diálogo de confirmação e no Editar/Pronto
- **Severidade:** média (confirmado no código; acessibilidade)
- **Evidência:** `src/App.tsx:61-73` (`before.current ??= document.activeElement` roda num `useEffect`, depois do `autoFocus` do Cancelar em `:111`, então guarda o próprio Cancelar e não o botão que abriu o diálogo); `src/App.tsx:80-81` (`<div className="contents" inert={!!c}>` envolve a `<TitleBar />`: com o diálogo aberto, minimizar, fechar e o Mini-Memoras ficam mortos); `src/screens/Docs.tsx:220-222` (Editar e Pronto têm `key` diferentes, então o botão some e o foco cai no `body`).
- **Como reproduzir:** com o teclado, foque "Lixeira" num caderno, aperte Enter e depois Esc. O foco vai para o `body`, e Tab recomeça do topo. Com o diálogo aberto, o "x" da barra de título não responde. No caderno, Tab até Editar, Enter, Ctrl+Enter: o foco vai para o `body`.
- **O que mudar:** guardar o elemento focado no momento em que `confirm` é definido no store (ou num `useLayoutEffect` que rode antes do `autoFocus`), e devolver o foco no fechamento. Tirar a `TitleBar` de dentro do wrapper `inert`. No Docs, usar um botão só com rótulo trocado (mesma `key`) ou focar o Pronto/Editar novo depois da troca.
- **Critério de pronto:** Esc ou Cancelar devolvem o foco ao botão de origem. A barra de título funciona com o diálogo aberto. Depois do Pronto, o foco fica no Editar.

### T5. Cada tecla re-renderiza o app inteiro e abre uma transação no IndexedDB
- **Severidade:** média (confirmado no código; desempenho)
- **Evidência:** `src/store.ts:100-104` (`set()` avisa todos os assinantes); `useApp` usa `useSyncExternalStore` sem seletor, então todas as telas montadas re-renderizam; `src/store.ts:302-306` (`upd` chama `notePut` a cada edição); `src/lib/db.ts:23-29` (uma transação por `put`).
- **Como reproduzir:** no React DevTools Profiler, digite rápido numa anotação longa com a lista ao lado (desktop). Cada tecla re-renderiza a lista, a barra de título e o editor. No painel Performance, aparece uma transação IDB por tecla.
- **O que mudar:** seletores em `useApp` (por exemplo `useApp(s => s.notes)`, com comparação rasa), ou separar o texto em edição num store próprio. Agrupar as gravações com um debounce curto (300 a 500 ms) e gravar na hora em `blur`, `visibilitychange`, `closeApp` e troca de tela, para não arriscar perda.
- **Critério de pronto:** no Profiler, uma tecla re-renderiza só o editor. No máximo uma gravação a cada 500 ms durante a digitação, e fechar o app logo depois de digitar não perde texto (testar numa cópia).

### T6. Pacote único de 590 kB atrasa a abertura
- **Severidade:** média (confirmado no build da Fase 1: `index-*.js` com 590,59 kB, 169,93 kB gzip)
- **Evidência:** `fase1-ferramentas.md` (aviso de chunk acima de 500 kB); `src/main.tsx:11-12` importa `sync` (e com ele o `@supabase/supabase-js`) e `updates` direto no início; as telas também entram no mesmo pacote.
- **Como reproduzir:** `npm run build` mostra o aviso. No Android de entrada, a tela de abertura fica mais tempo antes do PIN.
- **O que mudar:** `import()` dinâmico do Supabase dentro de `startSync` (só quando há conta e `.env`), e `React.lazy` para Busca, Ajustes, Resumão e Lixeira. Opcional: `build.rollupOptions.output.manualChunks` separando o `react` e o `supabase`.
- **Critério de pronto:** o pacote inicial fica abaixo de 350 kB sem o aviso do Vite, e o app abre sem conta com zero requisições ao Supabase.

### T7. IndexedDB sem tratamento de bloqueio, de troca de versão e de conexão fechada
- **Severidade:** média (confirmado no código; afeta a versão web ou PWA e qualquer `DB_VERSION` futuro)
- **Evidência:** `src/lib/db.ts:10-21` (`indexedDB.open` sem `onblocked`; a conexão aberta não tem `onversionchange` nem `onclose`; `dbp` guarda a conexão para sempre).
- **Como reproduzir:** na versão web, abra duas abas com `DB_VERSION` 2 e depois publique uma versão com `DB_VERSION` 3. A aba nova fica presa na abertura enquanto a velha não fecha, e o app fica na tela de carregamento sem aviso. Se o navegador fechar a conexão (limpeza de dados, falta de espaço), as gravações falham até recarregar.
- **O que mudar:** `r.onblocked` mostrando "Feche as outras janelas do Memoras". Na conexão: `d.onversionchange = () => { d.close(); dbp = null; avisar e recarregar }` e `d.onclose = () => { dbp = null }`. Manter a regra de só acrescentar passos de migração.
- **Critério de pronto:** com duas abas e uma subida de `DB_VERSION`, a aba velha fecha a conexão e avisa, e a nova termina a migração sem perder notas.

### T8. `npm run release` não confere o estado do Git nem a versão já publicada
- **Severidade:** média (confirmado no script)
- **Evidência:** `scripts/release.mjs:16-19` (confere só o `.env`), `:27-31` (assinatura do APK, bom), `:35-36` (electron-builder publica), `:39-47` (`gh release upload ... --clobber`). Não há conferência de árvore limpa, de branch `main`, de tag ou release já existente, nem de `package.json` commitado.
- **Como reproduzir:** num branch como `melhorias-claude`, com mudanças não commitadas e a versão 1.1.4 já publicada, `npm run release` seguiria: geraria binários de código que não está no Git e, com `--clobber`, trocaria o `Memoras.apk` de uma versão que os celulares já baixaram.
- **O que mudar:** no começo do script, cancelar se `git status --porcelain` não estiver vazio, se o branch não for `main`, se `git ls-remote --tags origin v<versão>` ou `gh release view v<versão>` já existirem (fora rascunho), ou se `HEAD` não estiver no `origin/main`. Tirar o `--clobber` ou só usá-lo em rascunho.
- **Critério de pronto:** o release cancela, com mensagem clara, em cada um dos quatro casos, e continua passando no caminho certo (main limpo, versão nova).

### T9. Sem CSP no Android e na versão web
- **Severidade:** baixa (confirmado; o desktop está protegido)
- **Evidência:** `vite.config.ts:27` (o `csp()` só entra com `mode === 'desktop'`); a política em `vite.config.ts:11-13`.
- **Como reproduzir:** `npm run build` (modo padrão) e procurar `Content-Security-Policy` no `dist/index.html`: não há.
- **O que mudar:** aplicar a mesma política no Android e na web, acrescentando `https://api.github.com` e o host de download dos releases em `connect-src` (usados por `src/updates.ts`), e o que o Capacitor precisar (`https://localhost`, `capacitor:`). Conferir que o Supabase continua em `connect-src`.
- **Critério de pronto:** o `index.html` dos três builds tem a meta CSP. No Android, entrar, sincronizar e procurar atualização funcionam sem violação no console.

### T10. FileProvider do Android expõe a raiz do armazenamento externo
- **Severidade:** baixa (confirmado; o provedor não é exportado e só concede URI por arquivo)
- **Evidência:** `android/app/src/main/res/xml/file_paths.xml` (`<external-path name="my_images" path="."/>`, modelo padrão do Capacitor); o app só compartilha o APK do cache e o arquivo exportado.
- **Como reproduzir:** leitura do XML. Um bug futuro que passe um caminho errado ao `getUriForFile` poderia gerar URI para qualquer arquivo do armazenamento.
- **O que mudar:** deixar só o `cache-path` (e o caminho exato que a exportação usa), sem `external-path` ".".
- **Critério de pronto:** atualização do APK e "Salvar cópia" continuam funcionando no Android com o XML reduzido.

### T11. Ajustes de endurecimento no esquema do Supabase
- **Severidade:** baixa (confirmado; o RLS está certo e os dados vão cifrados)
- **Evidência:** `supabase/schema.sql`: RLS ligado e políticas `auth.uid() = user_id` corretas; a função `memoras_touch` sem `set search_path = ''`; políticas sem `to authenticated`; `auth.uid()` sem `(select ...)`, que é reavaliado por linha; nenhum limite de tamanho em `data`. Em `src/sync.ts:74-82`, `createVault` usa `upsert`, o que permite sobrescrever um cofre existente se uma corrida entre aparelhos chegar ali.
- **Como reproduzir:** rodar os Advisors do Supabase num projeto de teste (não no real) com o `schema.sql`. Eles apontam o `search_path` e o `auth.uid()` por linha.
- **O que mudar:** `set search_path = ''` na função; `to authenticated` e `(select auth.uid())` nas políticas; `check (octet_length(data) < 1048576)` ou parecido. No `createVault`, `insert` (e, se der conflito, reler o cofre em vez de sobrescrever).
- **Critério de pronto:** Advisors sem avisos de segurança e desempenho para essas tabelas. Dois aparelhos criando conta ao mesmo tempo terminam com um cofre só, e os dois o abrem.

### T12. Barra de rolagem personalizada vale também no Android
- **Severidade:** baixa (provável)
- **Evidência:** `src/styles.css:190-194` (`::-webkit-scrollbar` global). No Chromium, qualquer regra `::-webkit-scrollbar` troca a barra sobreposta por uma barra fixa de 8 px, inclusive no WebView do Android.
- **Como reproduzir:** no Android, abra uma lista longa: aparece uma faixa de 8 px fixa à direita, no lugar da barra fina que some sozinha.
- **O que mudar:** restringir a `html.electron ::-webkit-scrollbar` (a classe já existe, `TitleBar.tsx:11`) ou a `@media (pointer:fine)`.
- **Critério de pronto:** no Android a rolagem usa a barra do sistema. No Windows, a barra personalizada continua igual.

### T13. Piscada do tema turquesa ao abrir com outro tema
- **Severidade:** baixa (confirmado no código)
- **Evidência:** `src/main.tsx:15-19` renderiza antes de `init`; `src/store.ts:677` só chama `applyTheme` depois de ler o IndexedDB. No Windows, `setBg` (`src/themes.ts:58`) cobre só o fundo da janela, e o conteúdo da tela de abertura e o `theme-color` ficam turquesa por um instante.
- **Como reproduzir:** escolha um tema não turquesa e reabra o app (ou recarregue a versão web): o primeiro quadro sai turquesa.
- **O que mudar:** espelhar só a chave do tema em `localStorage` dentro de `applyTheme` e aplicá-la de forma síncrona no `main.tsx`, antes do `createRoot`, com `try/catch`. O IndexedDB continua sendo a fonte da verdade. A origem e o banco não mudam.
- **Critério de pronto:** gravação de tela da abertura sem nenhum quadro turquesa com outro tema escolhido.

### T14. Nenhum teste protege as regras de compatibilidade de dados
- **Severidade:** média (confirmado: a Fase 1 não achou testes nem linter)
- **Evidência:** `fase1-ferramentas.md`. As regras do `CLAUDE.md` (aceitar dados sem `color`, `colorTs`, `pinned`, `pinnedTs`, `pin`; Cadernos sem `segs`; `status: 'archived'`; migração só acrescentando passos) dependem de `content()` e `itemContent()` em `src/lib/items.ts` e da junção em `src/sync.ts`.
- **Como reproduzir:** hoje, uma refatoração que exija `colorTs` em `itemContent()` passaria no build e só quebraria no aparelho de quem tem dados antigos.
- **O que mudar:** `vitest` com uma pasta `test/fixtures` contendo objetos gravados por 1.0.4, 1.1.1, 1.1.2 e 1.1.3, testando `content()`, `itemContent()`, a junção por `colorTs` e `pinnedTs`, e `encrypt`/`decrypt` de ida e volta. Rodar no `npm run release` antes de publicar.
- **Critério de pronto:** `npm test` passa, cobre cada regra do `CLAUDE.md` com um caso, e o release cancela se falhar.

### T15. Exports mortos, ativos duplicados e avisos de dependências de desenvolvimento
- **Severidade:** baixa (confirmado na Fase 1)
- **Evidência:** `fase1-inventario.md`: exports usados só no próprio arquivo (`Account`, `Block`, `Caret`, `Cfg`, `DOCS`, `DayNoteContent`, `DocContent`, `MenuKind`, `ModeResult`, `Screen`, `Sync`, `SyncPill`, `TASKS`, `Tap`, `TaskContent`, `UpdState`, `WinMode`, `updItem`, `closeApp`, `fitArea`, `newer`, `paperOf`, `parseDoc`, `scheduleSync`, `scrollerOf`, `smooth`, `supabase`, `trashDoc`); o ícone de 420 KB em 6 caminhos; `memoras-site.zip` e `portfolio-preview` parecem cópias antigas. `fase1-ferramentas.md`: 25 vulnerabilidades no `npm audit`, todas de desenvolvimento (zod via remotion, rimraf, uuid, deepmerge), 0 em produção.
- **Como reproduzir:** `npx knip` (ou `ts-prune`) e `npm audit --omit=dev`.
- **O que mudar:** tirar o `export` do que só é usado no arquivo (sem apagar código usado); manter um ícone-fonte e gerar os demais no build; confirmar com o Vinicius antes de apagar `memoras-site.zip` e `portfolio-preview`; atualizar ou isolar o `remotion` se ele só serve à arte de divulgação.
- **Critério de pronto:** `knip` sem exports não usados; um ícone-fonte; `npm audit --omit=dev` continua com 0.

## Pontos verificados e sem defeito

- Electron: `contextIsolation`, `sandbox` e `nodeIntegration:false` (`main.cjs:184`); `will-navigate` e `setWindowOpenHandler` só abrem http(s) e mailto fora do app (`:199-200`); o protocolo `app://` barra saída da pasta (`:318-324`); o IPC confere a origem (`:258`); a lista de permissões é fechada (`:330-332`); a CSP do desktop não tem `unsafe-eval`.
- Android: `allowBackup=false`; o `UpdatePlugin` confere a origem do download, o nome do pacote e o `versionCode` maior, e o sistema confere a assinatura; o APK do release tem a assinatura conferida.
- Criptografia: PBKDF2 a 600 mil iterações separado em auth e kek, AES-GCM, PIN dentro de `prefs` cifrado.
- Site: `.htaccess` com `nosniff`, `X-Frame-Options`, HSTS e `Permissions-Policy`; `sw.js` só desinstala o service worker antigo.

## Sugestões que precisam do Vinicius

1. **Assinatura de código no Windows.** O instalador sai sem assinatura (`package.json`, sem config de `win.sign`), então o SmartScreen avisa e o `electron-updater` não confere o editor. Um certificado custa dinheiro por ano. A decisão é dele.
2. **Cifrar o diário no aparelho com o PIN.** Hoje a chave local (`dk`) fica em texto puro no `cfg` do IndexedDB, e o PIN só tranca a tela. Quem copia a pasta de dados lê tudo. Amarrar a chave ao PIN (e à digital, com `CryptoObject` no `BiometricPlugin`) muda a proposta: esquecer o PIN passaria a exigir a conta ou a chave de recuperação. Precisa de decisão de produto e de um plano de migração que nunca perca anotação.
3. **`deleteAppDataOnUninstall: true` no NSIS.** A atualização é segura (`--updated`), mas uma desinstalação manual apaga o diário sem perguntar. Vale decidir se o desinstalador deve perguntar ou manter os dados.
4. **CSP no site** (`site/.htaccess`). Dá para acrescentar, mas exige liberar o Google Fonts e os scripts inline das páginas. Mudança de baixo risco, porém no site público.

## Confirmação

Confirmador da área "tecnica". Nenhum código do app foi alterado. Os testes ficam em `.auditoria/testes/` (script Node que sai com código 1 quando o defeito existe; `_util.mjs` sobe o Vite em 5193, aborta `*.supabase.co` e usa msedge). Os testes de navegador rodaram contra o Vite, com um cfg semeado no IndexedDB do perfil temporário do Playwright. A janela de Windows foi simulada com um stub de `memorasWin`.

| Item | Status | Como foi verificado | Teste |
|---|---|---|---|
| T1 | CONFIRMADO | Página nasce `hidden` com `awayAt` de 5 s atrás: `init` aplica a carência e `awaySince` fica 0. Três horas depois o `visibilitychange` não trava. O controle (página visível que depois esconde) pede o PIN | `testes/tecnica-T1.mjs` |
| T2 | CONFIRMADO | Em 360x740 com `--sat`/`--sab` simulados, o `.flow` fica com 12 px de padding em cima e embaixo | `testes/tecnica-T2.mjs` |
| T3 | CONFIRMADO | Digitar em "Adicionar tarefa" e apertar Ctrl+1 descarta a tarefa. O controle com Enter salva | `testes/tecnica-T3.mjs` |
| T4 | CONFIRMADO | Esc no diálogo de lixeira deixa o foco no `body`, e a `.titlebar` fica dentro do `inert` com o diálogo aberto. A parte Editar/Pronto vem só da leitura do código (`key` diferentes), sem teste | `testes/tecnica-T4.mjs` |
| T5 | CONFIRMADO | 30 teclas geram 30 transações de escrita em `notes` | `testes/tecnica-T5.mjs` |
| T6 | CONFIRMADO | `main.tsx` importa `./sync` direto, `sync.ts` importa o supabase-js estático e não há `lazy`. O tamanho (590 kB) vem do build da Fase 1 | `testes/tecnica-T6.mjs` |
| T7 | CONFIRMADO | Outra conexão pedindo a versão 3 recebe `blocked` e não termina em 3 s, porque o app não fecha a sua | `testes/tecnica-T7.mjs` |
| T8 | CONFIRMADO | `release.mjs` não tem conferência de árvore, branch nem versão publicada, e usa `--clobber` | `testes/tecnica-T8.mjs` |
| T9 | CONFIRMADO | `csp()` só entra com `mode === 'desktop'` | `testes/tecnica-T9.mjs` |
| T10 | CONFIRMADO | `external-path path="."` presente (risco só teórico, severidade baixa mantida) | `testes/tecnica-T10.mjs` |
| T11 | CONFIRMADO | Faltam `search_path`, `to authenticated` e `(select auth.uid())`; `createVault` usa `upsert` e é chamado após `maybeSingle` vazio (leitura e escrita não atômicas). A corrida entre dois aparelhos não foi reproduzida (exigiria Supabase) | `testes/tecnica-T11.mjs` |
| T12 | CONFIRMADO (pelo código) | `::-webkit-scrollbar` global; o efeito no WebView do Android não foi medido em aparelho | `testes/tecnica-T12.mjs` |
| T13 | CONFIRMADO | Com tema roxo salvo, 3 quadros com o app na tela saem com o tema padrão antes do `applyTheme` | `testes/tecnica-T13.mjs` |
| T14 | CONFIRMADO | Sem script `test` e sem framework | `testes/tecnica-T14.mjs` |
| T15 | CONFIRMADO | Exports usados só no próprio arquivo, ícone de cerca de 420 KB em vários caminhos (`assets/`, `build/`, `public/`, `site/img/`, `design_handoff_memoras/`) e `memoras-site.zip` e `portfolio-preview` na raiz. Sem `knip` instalado, não foi rodada a ferramenta | sem teste (higiene) |

Descartados: nenhum item. A tabela das pistas da revisão anterior já excluiu os itens não reproduzidos.
