# MELHORIAS do Memoras (plano da Fase 3)

Base: Memoras 1.1.4, branch `melhorias-claude`. Fonte: os 45 itens CONFIRMADOS de `.auditoria/auditoria-logica.md` (L1 a L15), `.auditoria/auditoria-ui-ux.md` (L1, U1, U2, A1, L2, U3, U4, U5, U6, A2, U7, T1, L3, L4, A3) e `.auditoria/auditoria-tecnica.md` (T1 a T15). Não existe NOTAS-DO-VINICIUS.md.

Este arquivo é o roteiro para quem vai executar. Cada lote roda sozinho, num worktree próprio, e só pode tocar nos arquivos da sua lista.

## 1. Como ler este plano

- Ids: `LOG-` (auditoria de lógica), `UI-` (auditoria de UI e UX), `TEC-` (auditoria técnica), `NOVO-` (itens acrescentados para lançar). Um item dividido entre dois lotes ganha letra no fim (`LOG-L9a` e `LOG-L9b`): cada metade funciona sozinha e as duas juntas fecham o item.
- Prioridade: P0 (bug ou quebra: perde dado, abre sem PIN, esconde tela), P1 (alto impacto em uso e produto), P2 (polimento).
- Itens iguais em mais de uma auditoria foram juntados:
  - LOG-L2 = UI-U2 = TEC-T3 (tarefa digitada se perde)
  - LOG-L3 = TEC-T1 (recarga com a janela escondida abre sem PIN)
  - LOG-L8 = UI-U1 = UI-A1 parte (a) = TEC-T4 parte (a) (foco e barra de título na confirmação)
  - LOG-L12 = UI-A1 parte (b) = TEC-T4 parte (b) (foco no Editar e Pronto)
  - LOG-L10 = TEC-T7 (banco local sem tratar bloqueio)
  - UI-L1 = TEC-T2 (área segura nas telas de entrada)
  - UI-L4 = TEC-T12 (barra de rolagem no Android)

### Quadro de prioridades

| Prioridade | Itens |
|---|---|
| P0 | LOG-L1, LOG-L2, LOG-L3, LOG-L6, UI-L1, TEC-T8 |
| P1 | LOG-L4, LOG-L5, LOG-L7, LOG-L8, LOG-L10, UI-L2, UI-U3, UI-U4a, UI-U4b, UI-U5, TEC-T14, NOVO-1, NOVO-2, NOVO-3 |
| P2 | LOG-L9a, LOG-L9b, LOG-L11, LOG-L12, LOG-L13, LOG-L14, LOG-L15a, LOG-L15b, UI-L3a, UI-L3b, UI-L3c, UI-L4, UI-A2, UI-A3, UI-U6, UI-U7, TEC-T9, TEC-T10, TEC-T11, TEC-T13 |

### Os lotes

| Lote | Título | Arquivos principais | Android |
|---|---|---|---|
| lote-1 | Sincronização e junção | `src/sync.ts`, `src/lib/items.ts`, `src/lib/notes.ts`, `supabase/schema.sql` | não |
| lote-2 | Estado, trava e banco local | `src/store.ts`, `src/lib/db.ts` | não |
| lote-3 | Foco, confirmação e Agenda | `src/App.tsx`, `src/screens/Agenda.tsx`, `src/screens/Docs.tsx`, `src/screens/Menu.tsx` | não |
| lote-4 | CSS: área segura, toque e contraste | `src/styles.css` | não |
| lote-5 | Entrada, chaves e acessibilidade | `src/screens/Auth.tsx`, `Keys.tsx`, `Forgot.tsx`, `Pin.tsx`, `Onboard.tsx`, `src/ui.tsx` | não |
| lote-6 | Shell: navegação e Ajustes | `src/screens/Shell.tsx` | não |
| lote-7 | Build, release, testes e Android | `package.json`, `scripts/release.mjs`, `vite.config.ts`, `src/main.tsx`, `src/themes.ts`, `file_paths.xml`, testes novos | sim |

Sugestão de ordem com 4 por vez: primeiro lote-1, lote-2, lote-3 e lote-4 (onde estão os P0); depois lote-5, lote-6 e lote-7.

## 2. Regras que valem para todos os lotes

1. Toque só nos arquivos da lista do seu lote. Se a correção pedir outro arquivo, pare e registre no relatório do lote; não edite.
2. Textos de tela em pt-BR, sem travessões. Referência de design: `design_handoff_memoras/`. Não mude direção de arte, nome nem proposta do app.
3. Nunca copie, consulte nem restaure nada do branch `obsoleto-nao-usar`.
4. Nunca abra `%APPDATA%\Memoras` nem o app instalado. Para testar o desktop, use `--user-data-dir` apontando para uma pasta de teste. Nunca crie contas nem envie nada ao Supabase real. Nunca rode `npm run release`.
5. Não mostre nem copie para relatório o conteúdo do `.env`.
6. Trava do PIN: com o app travado, nenhuma tela leva a login ou cadastro. `WHILE_LOCKED` (`src/store.ts`) e `lockedGuard` (`src/sync.ts`) continuam valendo em qualquer fluxo novo.
7. Nunca perder anotações:
   - Não mude os endereços `app://memoras` (Windows) e `https://localhost` (Android), o `appId` nem o nome do banco `memoras`.
   - Estrutura do banco: só com `DB_VERSION` maior e passo novo de migração, sem apagar stores. Neste plano nenhum lote sobe `DB_VERSION`.
   - Cadernos e Agenda nunca ganham campo `segs`.
   - `content()` e `itemContent()` continuam aceitando dados sem `color`, `colorTs`, `pinned` e `pinnedTs`.
   - O estado `status: 'archived'` de caderno não muda de nome.
   - O PIN da conta continua em `prefs` como `pin: { hash, salt, ts }`; `pinOn` e `bioOn` continuam por aparelho.
   - As cópias `backup:<versão>` (3 últimas) continuam existindo.
8. Mini-Memoras: modo e tamanho ficam em `janela.json`; nunca passe o modo pela URL. No CSS o mini é `html[data-mini]`; a classe `.mini` é dos botões das tarefas e não pode ser reutilizada.
9. CSS: só `backdrop-filter`, nunca `-webkit-backdrop-filter`.
10. `memoras://senha` existe em `src/sync.ts`, `electron/main.cjs`, `AndroidManifest.xml` e nas Redirect URLs do Supabase. Nenhum lote muda esse endereço.
11. Antes de dar o lote por pronto: `npx tsc --noEmit` e `npm run build` sem erro, mais os testes do lote.

## 3. Como rodar os testes da auditoria num worktree

Os testes de `.auditoria/testes/` não estão no Git, então o worktree não os tem. Eles também têm o caminho da pasta principal e portas fixas escritos dentro (`_util.mjs` 5193, `_util-logica.mjs` 5191, `_util-uiux.mjs` 5192) e reaproveitam um servidor já aberto na porta. Para não testar o código da pasta principal por engano, faça uma cópia ajustada dentro do worktree, com uma porta só do lote:

| Lote | Porta |
|---|---|
| lote-1 | 5201 |
| lote-2 | 5202 |
| lote-3 | 5203 |
| lote-4 | 5204 |
| lote-5 | 5205 |
| lote-6 | 5206 |
| lote-7 | 5207 |

No Bash, dentro do worktree (troque 5203 pela porta do seu lote):

```bash
npm ci
mkdir -p .auditoria/testes-lote
cp "C:/Users/Vinicius Costa/Desktop/Memoras/.auditoria/testes/"*.mjs .auditoria/testes-lote/
WT="$(pwd -W)"
sed -i "s#C:/Users/Vinicius Costa/Desktop/Memoras#$WT#g; s#519[123]#5203#g" .auditoria/testes-lote/*.mjs
node .auditoria/testes-lote/logica-L2.mjs; echo "saida: $?"
```

- Saída 1 quer dizer "o defeito existe"; saída 0 quer dizer "corrigido".
- A pasta `.auditoria/testes-lote/` é de trabalho: não entra em commit.
- Os testes usam o Edge pelo `playwright-core` e bloqueiam a rede do Supabase. O worktree não tem `.env`; o app sobe sem contas e isso basta para os testes listados aqui.
- Teste novo pedido neste plano: crie em `.auditoria/testes/` do worktree, com o nome exato indicado no item (nomes únicos, para não bater com os de outro lote), seguindo o padrão dos existentes (saída 1 quando o defeito existe). Use caminho relativo para o código (`../../src/...`) e a porta do lote.

Testes que continuam saindo 1 por construção, mesmo com a correção certa (eles simulam o comportamento antigo dentro do próprio arquivo, sem chamar o código do app): `logica-L5.mjs`, `logica-L6.mjs`, `logica-L14.mjs`. Para esses, o plano pede um teste novo. `tecnica-T5.mjs` e `tecnica-T6.mjs` também continuam em 1, porque os itens foram adiados.

## 4. Contratos entre lotes

Cada contrato é escrito do mesmo jeito nos dois lotes. Cada metade precisa compilar e funcionar sozinha.

| Contrato | Quem escreve o JSX | Quem escreve o CSS |
|---|---|---|
| Pílula só de texto: classe `txt` junto de `pill` (`className="pill press txt"`) | lote-3 (`Agenda.tsx`, pílula "Hoje") | lote-4 (`.ibar .pill:not(.go):not(.txt)` e `.pill.txt`) |
| Campo com erro: atributo `aria-invalid="true"` no `<input className="field">` | lote-5 (`Auth.tsx`, `Forgot.tsx`) | lote-4 (`.field[aria-invalid="true"]`) |
| Caixinha em destaque: classe `warn` junto de `check` (`className="check warn"`) | lote-5 (`Keys.tsx`) | lote-4 (`.check.warn i`) |
| Barras do início: classe `obar` no contêiner e classe `on` nas barras já cumpridas; o estilo inline atual continua | lote-5 (`Onboard.tsx`) | lote-4 (só dentro de `@media (forced-colors: active)`) |

Não há identificador novo compartilhado entre `src/store.ts` (lote-2) e `src/sync.ts` (lote-1). Os dois lotes só usam o que já existe hoje (`hooks.recoveryPending`, `get`, `set`, `isLocked`, exports de `db.ts`).

---

## lote-1: Sincronização e junção

Arquivos que pode tocar:
- `src/sync.ts`
- `src/lib/items.ts`
- `src/lib/notes.ts`
- `src/lib/pull.ts` (novo)
- `supabase/schema.sql`
- `.auditoria/testes/logica-L5-condicional.mjs` (novo)
- `.auditoria/testes/logica-L6-cursor.mjs` (novo)

Não precisa de build do Android.

### LOG-L1 (P0): caderno apagado é reenviado a cada sincronização

- Onde: `src/lib/items.ts`, função `mergeItem`, linha `if (l.deleted || r.deleted) return { merged: { ...itemContent(tombstoneItem(l)), created } };`. O `tombstoneItem` carimba `Date.now()`, então a junção nunca fica igual ao servidor.
- O que mudar em `mergeItem`: montar a lápide sem `Date.now()` e sem `tombstoneItem`, só com os dois lados, de modo que o resultado seja o mesmo em qualquer aparelho e em qualquer hora:
  - caderno (`doc`): `deleted: true`, `title: ''`, `body: ''`, `status: 'trashed'`, `titleTs`, `bodyTs` e `statusTs` = maior dos dois lados; `color`/`colorTs` e `pinned`/`pinnedTs` escolhidos pelas mesmas regras que a função já usa para cadernos vivos (use `itemContent(l)` e `itemContent(r)` para ler, porque dado antigo vem sem esses campos); `created` = menor dos dois.
  - tarefa (`task`): `deleted: true`, `text: ''`, `textTs`, `doneTs`, `dateTs` e `orderTs` = maior dos dois; `date`, `done` e `order` pelas mesmas regras de escolha da tarefa viva.
  - observação do dia (`daynote`): `deleted: true`, `text: ''`, `textTs` = maior dos dois, `date` do lado local.
  - Lápide nunca gera `copy`.
- O que mudar em `src/sync.ts`, na junção dos itens dentro de `syncNow` (trecho `const { merged, copy } = mergeItem(local, r.c); ... byId.set(r.id, n); touched.push(n);`): só gravar e marcar como tocado quando algo mudou, como já é feito nas anotações: `n.rev !== local.rev || n.syncedRev !== local.syncedRev || !local.pushed || n.base !== local.base` (e `|| n.srv !== local.srv`, ver LOG-L5).
- `tombstoneItem` continua como está para quando a pessoa apaga (ali o carimbo de hora é certo).
- Compatibilidade: aparelhos até a 1.1.4 continuam reenviando a lápide deles; o aparelho novo aceita e, no máximo, responde uma vez. Não mude o formato do conteúdo.
- Teste que falhava: `logica-L1.mjs`.
- Critério de pronto: `logica-L1.mjs` sai 0 (5 ciclos, 0 reenvios); juntar duas lápides em qualquer ordem dá o mesmo conteúdo (`sameItem`).

### LOG-L6 (P0): a paginação do recebimento pode pular linhas

- Onde: `src/sync.ts`, laço `for (let from = 0; ; from += 500)` de `syncNow`, que usa `.range(from, from + 499)`. Se outra gravação acontece entre duas páginas, as linhas mudam de posição e uma fica de fora; o `lastPull` passa adiante dela.
- O que mudar:
  1. Criar `src/lib/pull.ts`, sem importar nada do app (para rodar no Node), com uma função pura, por exemplo:
     `export async function pullAll<T extends { id: string; updated_at: string }>(page: (q: { from: string | null; exact?: string; offset?: number }) => Promise<T[]>, since: string | null, onRow: (r: T) => void): Promise<void>`
  2. Algoritmo: `cursor = since`; a cada volta pede `updated_at >= cursor` (sem filtro quando `cursor` é `null`), ordenado por `updated_at` e `id`, com limite de 500; ignora linha já vista nesta rodada com o mesmo `updated_at` (guarde `id -> updated_at` num `Map`); chama `onRow` nas novas; `cursor` = `updated_at` da última linha da página; para quando a página vem com menos de 500.
  3. Proteção: se uma página cheia terminar com `updated_at` igual ao `cursor` (mais de 500 linhas no mesmo instante), ler o restante daquele instante com `exact = cursor` e `offset` de 500 em 500, e depois seguir com o próximo instante. Não use filtro `.or()`.
  4. Em `syncNow`, trocar o laço por `pullAll`, com `page` montando a consulta: `.select('id,data,updated_at').eq('user_id', acc.userId).order('updated_at').order('id').limit(500)`, mais `.gte('updated_at', from)` ou `.eq('updated_at', exact).range(offset, offset + 499)`. Passe o `updated_at` exatamente como o servidor devolveu.
  5. O cálculo de `since` (`lastPull` menos 60 s) e de `lastPull` (maior `updated_at` visto) não muda.
- Teste que falhava: `logica-L6.mjs` (continua em 1 por construção).
- Teste novo: `.auditoria/testes/logica-L6-cursor.mjs`, em Node, importando `../../src/lib/pull.ts`: tabela em memória de 1.200 linhas, uma linha antiga regravada entre a primeira e a segunda página; todas as 1.200 precisam chegar. Um segundo caso com 700 linhas no mesmo `updated_at`.
- Critério de pronto: o teste novo sai 0 nos dois casos; não sobra `.range(from, from + 499)` no recebimento.

### LOG-L5 (P1): edição de caderno se perde quando dois aparelhos sincronizam juntos

- Onde: `src/sync.ts`, envio dentro de `syncNow` (`sb.from('notes').upsert(rows)` em blocos de 100). O envio é cego: se o outro aparelho gravou entre o recebimento e o envio, o texto dele é sobrescrito sem virar "(outra versão)".
- O que mudar:
  1. Em `src/lib/items.ts`, acrescentar ao tipo local de `Doc` e `DayNote` um campo opcional `srv?: string` (o `updated_at` do servidor visto por último). Ele é só local, como `base`: nunca entra em `itemContent()`, nunca vai para o texto cifrado.
  2. No recebimento, gravar `srv = r.updated_at` no item local junto com `base`.
  3. No envio, itens com `pushed === true`, `srv` definido e `baseText(item) !== null` (cadernos e observações) saem um a um com escrita condicional: `sb.from('notes').update({ data }).eq('user_id', acc.userId).eq('id', it.id).eq('updated_at', it.srv).select('id,updated_at')`.
     - Voltou 1 linha: sucesso; atualizar `syncedRev`, `base` e `srv` (o `updated_at` novo).
     - Voltou 0 linhas: o servidor mudou. Buscar a linha (`select('id,data,updated_at').eq('user_id', ...).eq('id', it.id).maybeSingle()`) e passar pela mesma junção do recebimento (extraia a junção de uma linha para uma função local e use nos dois lugares). O `base` antigo faz o texto do outro aparelho virar "(outra versão)". Não mexer em `syncedRev`; marcar `again = true` para o próximo ciclo enviar o resultado. Se a linha não existir no servidor, apagar o `srv` local para o próximo ciclo usar o `upsert`.
  4. O resto (anotações, tarefas, itens nunca enviados, lápides) continua no `upsert` em blocos de 100. Acrescente `.select('id,updated_at')` ao `upsert` para preencher o `srv` de cadernos e observações enviados pela primeira vez.
- Compatibilidade: nada muda no conteúdo cifrado nem nas colunas. Aparelhos antigos continuam com envio cego; a proteção vale entre aparelhos atualizados.
- Teste que falhava: `logica-L5.mjs` (continua em 1 por construção).
- Teste novo: `.auditoria/testes/logica-L5-condicional.mjs`, em Node, com `mergeItem`: A e B partem do mesmo caderno; B grava no "servidor" (muda o `updated_at`); o envio condicional de A falha; A junta a linha de B com o `base` antigo; o resultado precisa ter o texto de A e uma `copy` com o texto de B e título terminado em "(outra versão)".
- Critério de pronto: o teste novo sai 0; nenhum caderno ou observação já enviado sai por `upsert` quando tem `srv`.

### LOG-L15a (P2): link de senha que chega durante o carregamento ignora a trava

- Onde: `src/sync.ts`, tratador de `PASSWORD_RECOVERY`. Durante `screen === 'loading'` o `cfg` ainda não foi lido, então `isLocked()` não vale, e mesmo assim o código marca `hooks.recoveryPending = true`.
- O que mudar: quando o evento chegar com `get().screen === 'loading'`, não marcar `hooks.recoveryPending`; guardar `{ userId, email }` numa variável do módulo. No começo de `startSync()` (que roda depois de `init`), se houver pendência, repetir a conferência (`isLocked() && userId !== get().cfg.account?.userId` descarta) e só então fazer `hooks.recoveryPending = true; set({ screen: 'forgot', fStep: 2, fEmail })`. O caminho fora do carregamento fica como está. `lockedGuard` não muda.
- Teste que falhava: `logica-L15.mjs` (ele exercita o `init` do `store.ts`; quem o deixa verde é o LOG-L15b, do lote-2).
- Critério de pronto: lendo o código, não existe caminho em que `hooks.recoveryPending` vire `true` antes de `init` terminar; link da mesma conta com o app destravado continua abrindo a tela de nova senha.

### LOG-L9a (P2): a sincronização continua depois de sair da conta ou apagar o diário

- Onde: `src/sync.ts`, `syncNow` (lê `acc` uma vez no começo e segue gravando depois de cada `await`).
- O que mudar: depois de cada `await` e antes de qualquer `set`, `notePut`, `itemPut` ou `setCfg`, conferir `get().cfg.account?.userId === acc.userId`; se não for, parar o ciclo sem gravar. Se a conta sumiu sem passar por `logout()` (caso do "Apagar todo o diário"): quando `dkCache !== null` e não há mais conta, limpar `dkCache` e encerrar a sessão só neste aparelho (`signOut({ scope: 'local' })`), sem aviso. Não faça isso quando `dkCache` é `null`: durante o login, a espera da chave e a troca de senha existe sessão sem conta, e ela não pode ser encerrada.
- Teste que falhava: nenhum (LOG-L9 não tem arquivo).
- Critério de pronto: lendo `syncNow`, toda gravação depois de um `await` está atrás da conferência de conta; login, cadastro e "Esqueci minha senha" continuam funcionando.

### TEC-T11 (P2): endurecer o esquema do Supabase e a criação do cofre

- Onde: `supabase/schema.sql` e `createVault` em `src/sync.ts`.
- O que mudar em `schema.sql` (só o arquivo; não aplicar no projeto real): `set search_path = ''` na função `memoras_touch`; políticas com `to authenticated` e `(select auth.uid()) = user_id`; limite de tamanho em `data` (`check (octet_length(data) < 1048576)` ou equivalente para o tipo da coluna). Escreva de forma que rodar o arquivo de novo num banco existente não quebre (`create or replace`, `drop policy if exists` antes de `create policy`, `add constraint` protegido).
- O que mudar em `createVault`: trocar `upsert` por `insert`. Se o erro for de chave repetida (código `23505`), devolver `null` em vez de sobrescrever. Em `signUp`, se `createVault` devolver `null`, seguir pelo caminho do `login(email, password)`. Em `login`, se a criação devolver `null`, reler o cofre e continuar pelo caminho de cofre existente.
- Teste que falhava: `tecnica-T11.mjs`.
- Critério de pronto: `tecnica-T11.mjs` sai 0. A aplicação no Supabase real fica para o Vinicius (ver "Ações externas").

---

## lote-2: Estado, trava e banco local

Arquivos que pode tocar:
- `src/store.ts`
- `src/lib/db.ts`
- `.auditoria/testes/logica-L14-limpeza.mjs` (novo)

Não precisa de build do Android. Mantenha os nomes exportados de `db.ts` (`kvRead`, `notesRead`, `kvSet`, `notePut`, `kvDel`, `noteDel`, `itemsRead`, `itemPut`, `itemDel`, `wipeAll`, `dbHooks`): o lote-7 escreve testes contra eles. Não suba `DB_VERSION`. Não mude `tasksOn` (a Agenda depende dele para as linhas em branco).

### LOG-L3 (P0): recarga com a janela escondida abre sem PIN

- Onde: `src/store.ts`, `init` (trecho `const away = Date.now() - cfg.awayAt, grace = ...; cfg.awayAt = 0;`) e a variável `awaySince`. Se a página nasce escondida (recarga depois de falha com a janela minimizada), nenhum `visibilitychange` acontece, `awaySince` fica 0 e, ao voltar horas depois, `appBack` calcula 0 de ausência.
- O que mudar em `init`: quando `grace` for verdadeiro e `document.visibilityState === 'hidden'`, fazer `awaySince = cfg.awayAt` (o valor salvo), não zerar `cfg.awayAt` e não gravar o `cfg` zerado (`if (saved?.awayAt) void kvSet('cfg', cfg)` só nos outros casos). Assim `appBack` mede a ausência desde a saída de verdade e trava se passou do tempo.
- Teste que falhava: `logica-L3.mjs` e `tecnica-T1.mjs`.
- Critério de pronto: os dois testes saem 0; abrir o app visível dentro do prazo continua sem pedir PIN.

### LOG-L7 (P1): a cópia de segurança pode falhar em silêncio

- Onde: `src/store.ts`, `snapshotOnUpgrade`; `src/lib/db.ts`, `kvSet` (engole o erro pelo `quiet`).
- O que mudar:
  1. Em `db.ts`, exportar uma gravação que rejeita quando falha, por exemplo `export const kvSetStrict = (k: string, v: unknown) => run('kv', 'readwrite', s => s.put(v, k)).then(() => {});`.
  2. Em `snapshotOnUpgrade`: gravar a cópia com `kvSetStrict` dentro de `try`. Se falhar: `console.error`, sair da função sem apagar cópias antigas, sem mexer em `backups` e sem gravar `appVersion` (na próxima abertura tenta de novo). Se der certo: gravar a lista `backups` (3 mais novas), depois apagar as antigas, e só então gravar `appVersion`.
  3. O app abre normalmente mesmo quando a cópia falha.
- Teste que falhava: `logica-L7.mjs`.
- Critério de pronto: `logica-L7.mjs` sai 0; com gravação normal, continuam ficando as 3 últimas cópias `backup:<versão>`.

### LOG-L4 (P1): o app não trava na tela "Esqueci o PIN" aberta pelos Ajustes

- Onde: `src/store.ts`, `relock`: a condição de saída tem `s.screen === 'forgotPin'`.
- O que mudar: tirar `s.screen === 'forgotPin'` da condição (com o app já travado, o `!s.unlocked` continua barrando). No cálculo de `resume`, tratar `forgotPin` como `'settings'`: `const resume = s.screen === 'pin' ? s.pinReturn : s.screen === 'forgotPin' ? 'settings' : s.screen;`.
- Teste que falhava: `logica-L4.mjs`.
- Critério de pronto: `logica-L4.mjs` sai 0; "Esqueci o PIN" a partir da tela de PIN travada continua funcionando.

### LOG-L10 (P1): o banco local abre sem tratar bloqueio nem fechamento

- Onde: `src/lib/db.ts`, função `db()` (só tem `onupgradeneeded`, `onsuccess` e `onerror`).
- O que mudar:
  - `r.onblocked = () => { dbp = null; rej(new Error('Memoras: banco bloqueado por outra janela')); };`
  - em `onsuccess`: `d.onversionchange = () => { d.close(); dbp = null; dbHooks.outdated(); };` e `d.onclose = () => { dbp = null; };`
  - acrescentar `outdated: () => {}` a `dbHooks`.
  - Em `src/store.ts`, ligar `dbHooks.outdated` a um aviso único: `toast('O Memoras foi atualizado em outra janela. Feche e abra o app de novo.')`.
- Teste que falhava: `logica-L10.mjs` e `tecnica-T7.mjs`.
- Critério de pronto: os dois testes saem 0; uso normal (uma janela só) não mostra aviso novo.

### LOG-L14 (P2): a limpeza de item vazio já enviado apaga o item em outro aparelho

- Onde: `src/store.ts`, `cleaned` e `cleanItems` (ramo `if (n.pushed) { const t = tombstone(n); ... }`).
- O que mudar: a limpeza automática só apaga de vez o que nunca foi enviado (`noteDel`, `itemDel`). Item vazio já enviado (`pushed`) fica na lista como está, sem lápide e sem `hooks.changed()`. A pessoa ainda pode mandar para a lixeira pelo caminho normal. O filtro de `init` já mantém esses itens; não mude.
- Teste que falhava: `logica-L14.mjs` (continua em 1 por construção).
- Teste novo: `.auditoria/testes/logica-L14-limpeza.mjs`, no navegador (padrão de `_util-logica.mjs`): gravar no banco uma anotação vazia e um caderno em branco com `pushed: true` e `syncedRev` igual a `rev`, abrir o app, trocar de tela algumas vezes (`go('docs')`, `go('history')`) e conferir que nenhum dos dois ficou com `deleted: true`. Um terceiro item vazio com `pushed: false` precisa sumir.
- Critério de pronto: o teste novo sai 0.

### LOG-L11 (P2): tentativas simultâneas de PIN contam como uma

- Onde: `src/store.ts`, `pressKey`, `submitPin` e `pinFail`.
- O que mudar:
  1. Fila: as conferências rodam uma depois da outra (`let pinQueue = Promise.resolve()` e `pinQueue = pinQueue.then(() => submitPin(pin))` no lugar da chamada direta).
  2. Em `submitPin`, depois do `await verifySecret(...)`, ler de novo `state.cfg` para somar `pinFails` e `pinLocks` (hoje usa o `c` capturado antes da espera).
  3. `pinFail` recebe o PIN que falhou e só limpa os pontos depois de 420 ms se `state.pin` ainda for esse PIN (para não apagar o que a pessoa já digitou de novo).
  4. Não bloqueie a digitação durante a conferência: o teste digita a segunda tentativa enquanto a primeira ainda está sendo conferida e espera duas falhas contadas.
- Teste que falhava: `logica-L11.mjs`.
- Critério de pronto: `logica-L11.mjs` sai 0 (`pinFails >= 2`); PIN certo continua destravando; os bloqueios por excesso de erros continuam nos mesmos limites.

### LOG-L13 (P2): aviso "Tarefa passada para amanhã" errado em outros dias

- Onde: `src/store.ts`, `moveTask` (texto fixo no `toast`).
- O que mudar: `toast(date === addDays(todayKey(), 1) ? 'Tarefa passada para amanhã' : 'Tarefa passada para o dia seguinte', ...)`. Importar `addDays` de `./lib/items` (já existe lá; não edite `items.ts`).
- Teste que falhava: `logica-L13.mjs`.
- Critério de pronto: `logica-L13.mjs` sai 0.

### LOG-L9b (P2): "Apagar todo o diário" deixa a tela antiga viva enquanto apaga

- Onde: `src/store.ts`, `resetDiary` (`await wipeAll()` antes de trocar o estado).
- O que mudar: trocar o estado primeiro (o bloco `state = { ...initial(), ... }`, `applyTheme`, `subs.forEach`) e só depois `await wipeAll()` e o `toast`. Com o estado já sem conta, a sincronização em andamento para de gravar (metade LOG-L9a, do lote-1).
- Teste que falhava: nenhum.
- Critério de pronto: depois de confirmar o apagamento, a tela de início aparece na hora e o banco termina vazio (`notesRead()` e `itemsRead()` devolvem listas vazias).

### LOG-L15b (P2): `init` abre a troca de senha mesmo travado

- Onde: `src/store.ts`, fim de `init`: `if (hooks.recoveryPending) set({ unlocked, screen: 'forgot', fStep: 2 });`.
- O que mudar: só abrir `forgot` quando `unlocked` for verdadeiro. Travado, seguir o caminho normal (tela de PIN). `WHILE_LOCKED` não muda.
- Teste que falhava: `logica-L15.mjs`.
- Critério de pronto: `logica-L15.mjs` sai 0; com o app sem PIN, o link de senha continua abrindo o passo 2 de "Esqueci minha senha".

---

## lote-3: Foco, confirmação e Agenda

Arquivos que pode tocar:
- `src/App.tsx`
- `src/screens/Agenda.tsx`
- `src/screens/Docs.tsx`
- `src/screens/Menu.tsx`

Não precisa de build do Android.

### LOG-L2 (P0): tarefa digitada se perde ao trocar de tela sem tirar o foco

- Onde: `src/screens/Agenda.tsx`, componente `NewTask`. O texto só é salvo no `onBlur` ou no Enter; ao trocar de tela por atalho (Ctrl+1, por exemplo), o componente some sem `blur` e o texto se perde.
- O que mudar em `NewTask`: guardar o texto atual e o dia (`k`) em refs atualizadas a cada render, e salvar na saída do componente: `useEffect(() => () => { const t = val.current.trim(); if (t) addTask(dia.current, t); }, []);`. Quando o Enter ou o `blur` salvarem, limpar também a ref, para a tarefa entrar uma vez só.
- Contadores: em `Agenda.tsx`, os textos "X de Y feitas", "N tarefas a fazer" e o resumo dos próximos dias contam só tarefas com texto (`t.text.trim()`); se o `store.ts` já exporta um auxiliar para isso (`realTasks`), use-o sem editar o `store.ts`. As linhas em branco continuam aparecendo.
- Teste que falhava: `logica-L2.mjs`, `tecnica-T3.mjs`, `ui-ux-U2.mjs`.
- Critério de pronto: os três testes saem 0; digitar e apertar Enter cria uma tarefa só; sair do campo vazio não cria nada.

### LOG-L8 (P1): a confirmação não devolve o foco e congela a barra de título

- Onde: `src/App.tsx` (efeito que usa `before`, e `<div className="contents" inert={!!c}>` com `<TitleBar />` dentro) e `src/screens/Menu.tsx` (`run`, `back` e o item "Mover para a lixeira").
- O que mudar:
  1. `App.tsx`: mover `<TitleBar />` para fora do `div.contents` (logo antes dele, dentro de `.stage`). A barra já fica acima da confirmação (`z-index` 60 contra 45), então não precisa de CSS.
  2. `App.tsx`: lembrar a origem de verdade. Enquanto não há confirmação aberta, um ouvinte de `focusin` guarda o último elemento focado dentro de `.contents`. Ao abrir a confirmação, se `document.activeElement` for o `body`, usar esse elemento guardado como origem.
  3. `Menu.tsx`: no item "Mover para a lixeira", devolver o foco a `back.current` (se ainda estiver no documento, com `preventScroll`) antes de chamar `askTrash`.
  4. `App.tsx`: ao fechar a confirmação, se a origem não existir mais (o item foi para a lixeira), levar o foco ao primeiro botão visível e habilitado dentro de `.contents`. O foco nunca fica no `body`.
- Teste que falhava: `logica-L8.mjs`, `tecnica-T4.mjs`, `ui-ux-U1.mjs`.
- Critério de pronto: os três testes saem 0; com a confirmação aberta, minimizar e fechar da barra de título respondem; Esc continua cancelando; Tab não chega aos controles do app atrás da confirmação.

### LOG-L12 (P2): Editar e Pronto perdem o foco do teclado

- Onde: `src/screens/Docs.tsx`, `stopEdit` e os botões `key="done"` e `key="edit"` (um substitui o outro e o foco cai no `body`).
- O que mudar: uma ref no botão "Editar"; depois de `stopEdit`, no próximo quadro, se o foco estiver no `body`, focar o "Editar" (`focus({ preventScroll: true })`). O `startEdit` continua levando o cursor ao texto.
- Teste que falhava: `logica-L12.mjs`.
- Critério de pronto: `logica-L12.mjs` sai 0; Ctrl+Enter e o botão Pronto deixam o foco no Editar.

### UI-L3c (P2): pílula "Hoje" espremida (metade do JSX)

- Onde: `src/screens/Agenda.tsx`, botão `<button className="pill press" onClick={() => openDay(today)}>Hoje</button>` em `AgendaDay`.
- O que mudar: `className="pill press txt"`. O CSS é do lote-4 (UI-L3b).
- Teste que falhava: `ui-ux-L3.mjs` (só fica verde depois de juntar com o lote-4).
- Critério de pronto: o botão tem a classe `txt`.

---

## lote-4: CSS: área segura, toque e contraste

Arquivo que pode tocar:
- `src/styles.css`

Não precisa de build do Android para escrever, mas UI-L1, UI-L2 e UI-L4 pedem conferência num aparelho depois (ver "Ações externas"). Lembretes: só `backdrop-filter`; o mini é `html[data-mini]`; não reutilize `.mini`; nenhuma mudança de cor, fonte ou desenho além do que está escrito.

### UI-L1 (P0): telas de entrada perdem a área segura em celulares baixos

- Onde: regra de janela baixa (`@media (max-height:760px)`, perto das linhas 398 a 403) que troca o padding de `.flow` por `padding-top:12px;padding-bottom:12px`.
- O que mudar: `padding-top:calc(12px + var(--sat));padding-bottom:calc(12px + var(--sab))`. No Windows as duas variáveis valem 0.
- Teste que falhava: `tecnica-T2.mjs` e `ui-ux-L1.mjs`.
- Critério de pronto: os dois testes saem 0; em 1366x768 o teclado do PIN continua cabendo sem rolar.

### UI-L2 (P1): alvos de toque menores que 44 px no celular

- Onde: `.tick` (linha 274), `.grip` (283), dias e setas do calendário (187 a 188), `.ctxcolors .cswatch` (298), `.sumtask .tick` (311), `.link` (72). O modelo é o `.invx::after{inset:-8px}` (389).
- O que mudar, só a área de toque, sem mudar o desenho, dentro de `.wrap.m` (ou `@media (pointer:coarse)`):
  - `.tick` e `.sumtask .tick`: `position:relative` e `::after{content:'';position:absolute;inset:-9px}`.
  - `.grip`: 32 px de largura útil, sem cruzar com a área da caixinha (ajuste o `inset` lateral do `::after` da caixinha do lado da alça, se preciso).
  - `.day`: 44 px de altura; setas do mês: 44 px.
  - cores do menu de contexto: área de 44 px (com `::after`, mantendo o círculo de 36 px).
  - `.link`: `min-height:44px;display:inline-flex;align-items:center` (vale para todos os tamanhos; no desktop o texto não muda de lugar se o contêiner já centraliza, confira nas telas de PIN e login).
- Teste que falhava: nenhum.
- Critério de pronto: em 390x844, medindo com `getBoundingClientRect` (somando o `::after`), cada controle tem pelo menos 44x44 px e as áreas da alça e da caixinha não se cruzam; os prints novos ficam iguais aos de `.auditoria/` na aparência.

### UI-L3b (P2): pílula de texto no painel estreito (metade do CSS)

- Onde: regra de contêiner (perto das linhas 407 a 412): `.ibar .pill:not(.go){width:44px;padding:0;justify-content:center}`.
- O que mudar: `.ibar .pill:not(.go):not(.txt){...}` e, no mesmo bloco, `.ibar .pill.txt{height:44px;padding:0 14px}`.
- Teste que falhava: `ui-ux-L3.mjs` (só fica verde depois de juntar com o lote-3).
- Critério de pronto: uma pílula com classe `txt` num painel de 520 px mostra a palavra inteira com pelo menos 12 px de cada lado.

### UI-L4 (P2): barra de rolagem de desktop aplicada também no Android

- Onde: bloco `::-webkit-scrollbar` (linhas 190 a 194).
- O que mudar: pôr as cinco regras dentro de `@media (hover:hover) and (pointer:fine){...}` e trocar a cor fixa `rgba(12,60,90,...)` por uma variável de tema já existente (derivada de `--ink2`, por exemplo com `color-mix`), de modo que no tema Turquesa o resultado fique igual ao de hoje.
- Teste que falhava: `tecnica-T12.mjs`.
- Critério de pronto: `tecnica-T12.mjs` sai 0; no Windows a barra continua igual no Turquesa e aparece no tema Noite.

### UI-A3 (P2): alto contraste do Windows apaga marcas feitas só com fundo e sombra

- Onde: bloco `@media (forced-colors: active)` (perto das linhas 428 a 439).
- O que acrescentar dentro do bloco:
  - `.gel,.soft,.pill{border:1px solid ButtonText}`
  - `.day.has::after,.sdot{forced-color-adjust:none;background:CanvasText}`
  - `.obar > *{border:1px solid CanvasText}` e `.obar > .on{forced-color-adjust:none;background:CanvasText !important}` (contrato com o lote-5; o `!important` é para vencer o estilo inline)
  - `.item.ctxon,.task.ctxon,.task:focus-within{outline:2px solid Highlight}`
- Teste que falhava: nenhum.
- Critério de pronto: com `forcedColors: 'active'` no Playwright, os botões têm contorno, o dia com conteúdo tem a marca e a tarefa em foco tem contorno.

### Metades de contrato com o lote-5 (entram junto, P1)

- `.field[aria-invalid="true"]{border-color:#b0284a}` (a mesma cor de `.err`), e o mesmo no foco.
- `.check.warn i{border-color:#b0284a;box-shadow:0 0 0 3px rgba(176,40,74,.18)}`.
- Critério de pronto: as duas regras existem e não mudam nenhum campo sem o atributo ou a classe.

---

## lote-5: Entrada, chaves e acessibilidade

Arquivos que pode tocar:
- `src/screens/Auth.tsx`
- `src/screens/Keys.tsx`
- `src/screens/Forgot.tsx`
- `src/screens/Pin.tsx`
- `src/screens/Onboard.tsx`
- `src/ui.tsx`

Não precisa de build do Android. Use só classes que já existem no CSS (`.err`, `.link`, `.meta`, `.field`, `.check`) mais as do contrato com o lote-4. Nenhuma dessas telas pode ganhar caminho novo para login ou cadastro com o app travado.

### UI-U3 (P1): erros de login e cadastro longe do campo e sem marcação

- Onde: `src/screens/Auth.tsx` (mensagem única depois dos dois campos, perto das linhas 55 a 66) e os campos de `Forgot.tsx`.
- O que mudar:
  1. Saber de qual campo é o erro (email ou senha). Mostrar a mensagem (`className="err"`, com `id`) logo abaixo desse campo; erro geral (rede, servidor) continua onde está hoje.
  2. No campo com erro: `aria-invalid="true"` e `aria-describedby` com o `id` da mensagem; levar o foco para ele. Tirar a marcação quando a pessoa voltar a digitar.
  3. No cadastro, texto fixo abaixo da senha: "Mínimo 8 caracteres" (`className="meta"`), ligado por `aria-describedby`. O placeholder pode continuar.
  4. Botão "Mostrar senha" abaixo do campo de senha: `<button type="button" className="link" aria-pressed={ver}>` com o texto "Mostrar senha" ou "Esconder senha", trocando o `type` do campo entre `password` e `text`.
  5. Esconder "Esqueci minha senha" na aba "Criar conta".
  6. Em `Forgot.tsx`, a mesma marcação de erro nos campos (itens 1 e 2).
- Teste que falhava: nenhum.
- Critério de pronto: email sem arroba mostra "Digite um email válido." logo abaixo do campo Email, com o campo focado e `aria-invalid="true"`; senha de 3 letras no cadastro marca o campo Senha; a regra de 8 caracteres continua visível com a senha digitada; dá para ver a senha antes de enviar.

### UI-U4a (P1): botão ocupado ou bloqueado só fica mais claro, sem explicar

- Onde: `src/screens/Auth.tsx` (botão de envio), `src/screens/Forgot.tsx` (botões de envio), `src/screens/Keys.tsx` ("Continuar" com `aria-disabled`, cliques que só retornam perto das linhas 43 e 76).
- O que mudar:
  1. Durante a espera (`busy`): rótulo "Entrando…", "Criando conta…", "Enviando…" ou "Salvando…" conforme a ação, `aria-busy={busy}` e novos cliques ignorados.
  2. Em `Keys.tsx`, ao clicar em "Continuar" sem marcar a caixinha: acrescentar a classe `warn` à caixinha (`className="check warn"`) e mostrar a linha `<div role="status" className="err">Marque que guardou a chave para continuar.</div>`. Ao marcar a caixinha, tirar os dois.
- Teste que falhava: nenhum.
- Critério de pronto: nenhum botão de envio dessas telas fica com o rótulo parado enquanto `busy`; clicar em "Continuar" bloqueado sempre mostra a mensagem.

### UI-A2 (P2): calendário, pontos do PIN e passos do início pouco claros no leitor de tela

- Onde: `src/ui.tsx` (`MonthCal`, `DOW`), `src/screens/Pin.tsx` (pontos), `src/screens/Onboard.tsx` (barras, linha 39).
- O que mudar:
  1. `MonthCal`: `aria-label` completo em cada dia, montado com o que o componente já sabe: "16 de novembro", mais ", hoje", ", com anotações", ", tudo feito" quando for o caso; dia escolhido com `aria-pressed` ou `aria-current="date"` no dia de hoje.
  2. `DOW`: cada letra com `aria-label` do nome inteiro ("domingo", "segunda-feira"...).
  3. `Pin.tsx`: o contêiner dos pontos com `role="img"` e `aria-label` do tipo "2 de 4 dígitos" (nunca os números).
  4. `Onboard.tsx`: o contêiner das barras com `className="row obar"`, `role="progressbar"`, `aria-valuemin={1}`, `aria-valuenow={step}`, `aria-valuemax={4}` e `aria-label={'Passo ' + step + ' de 4'}`; cada barra já cumprida (`i <= step`) ganha `className="on"`. O estilo inline atual continua (contrato com o lote-4).
- Teste que falhava: nenhum.
- Critério de pronto: a árvore de acessibilidade mostra esses nomes; nenhum dígito do PIN aparece em texto; a aparência das quatro telas não muda.

---

## lote-6: Shell: navegação e Ajustes

Arquivo que pode tocar:
- `src/screens/Shell.tsx`

Não precisa de build do Android. Não edite `store.ts`, `App.tsx`, `styles.css` nem `lib/notes.ts`: use o que eles já exportam.

### UI-U5 (P1): no celular, Busca e Arquivo não têm Voltar nem aba marcada

- Onde: `Search` (botão Voltar com `{s.mini && ...}`, perto da linha 282), `Shelf` (linha 319), `TAB_OF` (linha 515) e os botões da barra de abas (linha 593).
- O que mudar:
  1. Mostrar o Voltar quando `onePane(s)`, com o mesmo padrão do editor: `onClick={() => s.mini ? goBack() : go('history')}`, `aria-label="Voltar"`.
  2. Em `TAB_OF`, acrescentar `search: 'history'` e `archive: 'history'` (a Lixeira usa a mesma tela do Arquivo).
  3. Nos botões da barra: `aria-current={TAB_OF[scr] === k ? 'page' : undefined}`.
- Teste que falhava: nenhum.
- Critério de pronto: em 390x844, Busca, Arquivo e Lixeira têm Voltar de 44 px que leva ao Diário, a aba Diário aparece ativa e tem `aria-current="page"`.

### UI-U6 (P2): ações do celular escondidas no toque longo, sem pista

- Onde: `Shell.tsx`, no componente principal (onde `scr` e `s.mobile` estão à mão).
- O que mudar: um `useEffect` que, só com `s.mobile` e sem `toast` na tela, mostra uma vez cada dica:
  - no Diário ou em Cadernos, com pelo menos um item na lista: `toast('Segure um item para ver mais opções')`, marca `memoras:dicaToque`;
  - na Agenda, com pelo menos uma tarefa com texto: `toast('Segure uma tarefa para ver mais opções')`, marca `memoras:dicaToqueAgenda`.
  As marcas ficam em `localStorage` (por aparelho), sempre dentro de `try/catch`. Não use `prefs` nem o `cfg` (não mexer no que sincroniza). Nenhum elemento fixo novo na tela.
- Teste que falhava: nenhum.
- Critério de pronto: num perfil novo, cada dica aparece uma vez e não volta depois de recarregar; no desktop e no Mini não aparece.

### UI-U7 (P2): "Sair da conta" age na hora, sem confirmação

- Onde: `Settings`, botão da linha 458 (`void logout(); toast(...)`).
- O que mudar: confirmação em dois passos dentro dos Ajustes, sem usar `s.confirm` (que é de outro lote). Estado local `saindo`. O primeiro toque troca o botão por um bloco com o texto "Sair da conta neste aparelho? As anotações continuam aqui, mas param de sincronizar até você entrar de novo." e os botões "Cancelar" (recebe o foco) e "Sair". "Sair" chama o que o botão chama hoje. Esc no bloco cancela e devolve o foco ao botão "Sair da conta". Use as classes de botão que a seção já usa (`soft press`).
- Teste que falhava: nenhum.
- Critério de pronto: um toque só não encerra a sessão; o foco vai para Cancelar; Esc cancela; "Sair" mostra o aviso de hoje.

### UI-U4b (P1): "Gerar nova chave" sem texto de andamento

- Onde: `Settings`, botão da linha 473 (`className={'soft press' + (busy ? ' off' : '')}`).
- O que mudar: com `busy`, rótulo "Gerando…", `aria-busy={busy}` e cliques ignorados.
- Teste que falhava: nenhum.
- Critério de pronto: durante a geração o botão diz "Gerando…" e um segundo clique não dispara outra chamada.

### UI-L3a (P2): data cortada no editor do celular

- Onde: `Editor`, linha que monta `date` (`dayLabel(t0) + (... ? ', ' + dayMonth(t0) : '')`) e o `<div className="ibar-t">`.
- O que mudar: com `s.mobile`, usar o mês curto na parte depois da vírgula ("Hoje, 16 nov"): calcule no próprio `Shell.tsx` com `new Date(t0).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })`, tirando " de " e o ponto final. Ponha a data completa no `title` do `div`. No desktop nada muda.
- Também neste arquivo: em `focusLast`, usar `el.focus({ preventScroll: true })`.
- Teste que falhava: nenhum.
- Critério de pronto: em 390x844, a data de uma anotação de hoje e de ontem aparece inteira, sem reticências; confira também uma data antiga e registre no relatório se ainda cortar.

---

## lote-7: Build, release, testes e Android

Arquivos que pode tocar:
- `package.json`
- `package-lock.json`
- `scripts/release.mjs`
- `vite.config.ts`
- `vitest.config.ts` (novo)
- `test/**` (novo)
- `src/main.tsx`
- `src/themes.ts`
- `src/ErrorBoundary.tsx` (novo)
- `index.html` (só se for preciso)
- `android/app/src/main/res/xml/file_paths.xml`
- `.auditoria/testes/tecnica-T13-segunda-abertura.mjs` (novo)

Precisa de build do Android para conferir TEC-T9 e TEC-T10. Não rode `npm run release`. Não mude versão do app, `appId`, `nsis`, endereços nem a chave do APK. Em `src/main.tsx`, a ordem `void init().then(() => { startSync(); startUpdates(); })` continua.

### TEC-T8 (P0): `npm run release` não confere o estado do Git nem a versão já publicada

- Onde: `scripts/release.mjs` (o envio usa `gh release upload ... --clobber`).
- O que mudar, logo no começo, antes de qualquer build, cancelando com mensagem clara em pt-BR e `process.exit(1)`:
  1. `git status --porcelain` com qualquer saída: cancela ("Há mudanças sem commit.").
  2. `git fetch origin main` e comparar `git rev-parse HEAD` com `git rev-parse origin/main`: se forem diferentes, cancela ("O commit desta versão não está no main do GitHub."). Ler o branch com `git rev-parse --abbrev-ref HEAD` e mostrar na tela; a trava é o commit ser o mesmo do `origin/main` (os releases podem sair de um worktree).
  3. `gh release view v<versão> -R <repo> --json isDraft`: se existir e não for rascunho, cancela ("A versão já foi publicada. Suba a versão."). Se for rascunho de uma tentativa anterior, continua.
  4. Tirar o `--clobber`. Antes do envio, se o rascunho já tiver arquivo com o mesmo nome, apagar esse arquivo do rascunho (`gh release delete-asset v<versão> <nome> -y -R <repo>`) e então enviar.
  5. A conferência da assinatura do APK e a exigência do `.env` continuam.
- Teste que falhava: `tecnica-T8.mjs`.
- Critério de pronto: `tecnica-T8.mjs` sai 0; leitura do script mostra as quatro travas antes de `npm run apk`. Não execute o script.

### TEC-T14 e NOVO-1 (P1): testes automáticos para cifra, junção e migração

- Onde: `package.json` (sem `scripts.test`), pasta nova `test/`.
- O que mudar:
  1. Instalar `vitest` e `fake-indexeddb` como dependências de desenvolvimento, em versões compatíveis com o Vite do projeto. `"test": "vitest run"` em `package.json`. `vitest.config.ts` separado do `vite.config.ts` (sem PWA e sem CSP), com `include: ['test/**/*.test.ts']` e ambiente `node`.
  2. `test/notes.test.ts`: `content()` aceita anotação da 1.0.4 (sem `color` e `colorTs`) e devolve `color: ''`, `colorTs: 0`; `merge` devolve a cor do lado com `colorTs` maior quando o outro lado veio sem cor; `merge` de anotação apagada é igual nas duas ordens.
  3. `test/items.test.ts`: `itemContent()` de caderno sem `color`, `colorTs`, `pinned` e `pinnedTs` (formas da 1.1.1, 1.1.2 e 1.1.3) devolve os padrões; nenhum conteúdo de caderno, tarefa ou observação tem a chave `segs`; `status: 'archived'` atravessa `itemContent`, `parseItem` e `mergeItem` com o mesmo nome; `mergeItem` devolve "fixado" pelo `pinnedTs` e a cor pelo `colorTs`; edição nos dois lados gera `copy` com "(outra versão)"; `parseItem` devolve `null` para `kind` desconhecido. Lápide estável (juntar duas vezes dá o mesmo conteúdo) entra como `it.todo`, para ligar depois do lote-1.
  4. `test/crypto.test.ts`: ida e volta de `sealText`/`openText` e `seal`/`open`; chave errada falha; `hashSecret` com `verifySecret` (certo e errado); `kekFromCode(normCode(...))` dá a mesma chave para o mesmo código escrito com espaços e minúsculas.
  5. `test/db.test.ts` com `fake-indexeddb/auto`: criar o banco `memoras` na versão 1 (stores `kv` e `notes` com `keyPath: 'id'`) com uma anotação e um `cfg`; depois importar `src/lib/db.ts` (import dinâmico, depois de `vi.resetModules()`) e conferir que `notesRead()` devolve a anotação, `kvRead('cfg')` devolve o `cfg` e `itemsRead()` devolve lista vazia. Use só os exports públicos de `db.ts`.
  6. Os testes precisam passar com o código de hoje (sem depender dos lotes 1 e 2).
- Teste que falhava: `tecnica-T14.mjs`.
- Critério de pronto: `npm test` passa; `tecnica-T14.mjs` sai 0; `npx tsc --noEmit` continua passando.

### NOVO-2 (P1): o release só sai com testes verdes

- Onde: `scripts/release.mjs`.
- O que mudar: depois das travas do TEC-T8 e antes de `npm run apk`, rodar `npm test`. Se falhar, o release cancela (o `tsc` já roda dentro dos builds).
- Critério de pronto: leitura do script mostra `npm test` antes do primeiro build.

### NOVO-3 (P1): tela de erro no lugar da tela em branco

- Onde: `src/ErrorBoundary.tsx` (novo) e `src/main.tsx`.
- O que mudar: componente de classe com `getDerivedStateFromError` e `componentDidCatch` (`console.error`). Quando pega um erro de renderização, mostra, com classes que já existem (`flow`, `card`, `gel`), o título "Algo deu errado", o texto "Suas anotações continuam salvas neste aparelho." e o botão "Abrir de novo" (`location.reload()`). Não apaga nem grava dado nenhum. Em `main.tsx`: `<ErrorBoundary><App /></ErrorBoundary>`. Ao recarregar, o `init` segue o caminho normal, com a trava do PIN.
- Critério de pronto: forçando um erro de renderização num teste manual (por exemplo um `throw` temporário, removido depois), aparece o cartão e o botão recarrega o app; sem erro, nada muda.

### TEC-T9 (P2): sem CSP no Android e na versão web

- Onde: `vite.config.ts` (`mode === 'desktop' && csp(...)`).
- O que mudar:
  1. Aplicar a política em todo build e nunca no servidor de desenvolvimento: `defineConfig(({ mode, command }) => ...)` e `command === 'build' && csp(...)`. No `vite dev` a política quebraria o recarregamento do React e os testes da auditoria.
  2. Em `connect-src`, acrescentar `https://api.github.com` (usado por `src/updates.ts`). Supabase continua lá. Acrescentar `worker-src 'self'` e `manifest-src 'self'` para a versão web.
  3. Depois de `npm run build`, abrir `dist/index.html` e conferir que não há `<script>` inline (o registro do PWA precisa sair como arquivo); se houver, ajuste a opção de registro do PWA para arquivo externo.
  4. Android: gerar o build (`npm run build:mobile`) e conferir num emulador ou aparelho que o app abre, a tela de entrar aparece, "Salvar cópia" compartilha e a busca de atualização roda, sem violação de CSP no console. Se não for possível conferir no lote, deixe o Android de fora (`command === 'build' && mode !== 'mobile'`) e registre no relatório.
- Teste que falhava: `tecnica-T9.mjs`.
- Critério de pronto: `tecnica-T9.mjs` sai 0; `dist/index.html` e `dist-desktop/index.html` têm a meta `Content-Security-Policy`; o desktop abre numa pasta de dados de teste (`--user-data-dir`) sem violação no console.

### TEC-T10 (P2): FileProvider do Android expõe a raiz do armazenamento externo

- Onde: `android/app/src/main/res/xml/file_paths.xml`.
- O que mudar: tirar a linha `<external-path ... path="."/>` e deixar só o `cache-path` (a exportação grava em `Directory.Cache`, `src/native.ts`).
- Teste que falhava: `tecnica-T10.mjs`.
- Critério de pronto: `tecnica-T10.mjs` sai 0; o projeto Android compila (`npm run build:mobile` e `gradlew assembleDebug`, se o ambiente tiver o SDK). A conferência de "Salvar cópia" e da atualização do APK no aparelho fica registrada em "Ações externas" se não der para fazer no lote.

### TEC-T13 (P2): piscada do tema turquesa ao abrir com outro tema

- Onde: `src/themes.ts` (`applyTheme`) e `src/main.tsx` (renderiza antes do `init`).
- O que mudar: em `applyTheme`, gravar a chave do tema em `localStorage` (`memoras:tema`) dentro de `try/catch`. Em `main.tsx`, antes do `createRoot`, ler essa chave (em `try/catch`) e, se for um tema válido, chamar `applyTheme`. O IndexedDB continua sendo a fonte da verdade; o `init` aplica o tema de novo.
- Teste que falhava: `tecnica-T13.mjs` (ele grava o tema só no IndexedDB e abre uma vez; nessa primeira abertura o espelho ainda não existe, então continua em 1).
- Teste novo: `.auditoria/testes/tecnica-T13-segunda-abertura.mjs`: igual ao original, mas abre a página uma vez para o espelho ser gravado e mede os quadros na segunda abertura.
- Critério de pronto: o teste novo sai 0 (nenhum quadro turquesa na segunda abertura com o tema roxo).

---

## 5. Depois de juntar os lotes

1. Ordem sugerida para juntar: lote-4, lote-3, lote-5, lote-6, lote-2, lote-1, lote-7. Como nenhum arquivo se repete, não deve haver conflito.
2. Na pasta principal, rodar `npx tsc --noEmit`, `npm run build`, `npm test` e todos os testes de `.auditoria/testes/`.
3. Esperado em 0: todos, menos os que ficam em 1 por construção ou por adiamento: `logica-L5.mjs`, `logica-L6.mjs`, `logica-L14.mjs`, `tecnica-T5.mjs`, `tecnica-T6.mjs` e `tecnica-T13.mjs` (cobertos por `logica-L5-condicional.mjs`, `logica-L6-cursor.mjs`, `logica-L14-limpeza.mjs` e `tecnica-T13-segunda-abertura.mjs`).
4. `ui-ux-L3.mjs` e `logica-L15.mjs` dependem de dois lotes juntos; confira os dois aqui.
5. Ligar o `it.todo` da lápide estável em `test/items.test.ts` (depende do lote-1).
6. Refazer os prints da Fase 1 nas telas tocadas (login, cadastro, PIN, início, chave, Agenda, Busca, Arquivo, Ajustes, editor no celular) e comparar com os de antes.
7. Conferir à mão a trava: com PIN ligado e app travado, nenhuma tela leva a login ou cadastro (inclusive pelo link `memoras://senha`).

## 6. Itens descartados ou adiados

| Item | Decisão | Motivo |
|---|---|---|
| TEC-T5 (cada tecla re-renderiza o app e abre uma transação) | adiado | Pede seletores no estado e gravação com atraso em `store.ts` e em todas as telas: cruza vários lotes e, se errar, perde texto digitado. Ganho pequeno hoje (não há lentidão relatada). Fica para uma rodada própria, com medição antes e depois. |
| TEC-T6 (pacote único de 590 kB) | adiado | Dividir o pacote mexe em `App.tsx`, `Shell.tsx` e `vite.config.ts` ao mesmo tempo (três lotes). O app é local e abre do disco; o ganho é pequeno. Segunda rodada. |
| TEC-T15 (exports mortos, ativos duplicados, avisos de dependências) | descartado nesta rodada | Limpeza sem efeito para quem usa. Apagar `memoras-site.zip` e `portfolio-preview/` depende do Vinicius. |
| UI-T1 ("Ajustes" e "Configurações") | para o Vinicius | A referência de design usa os dois nomes; escolher um é decisão de produto. Depois da escolha, a troca é de poucas linhas. |
| TEC-T1, parte opcional em `electron/main.cjs` | descartado | A correção em `store.ts` (LOG-L3) resolve; mexer no processo principal traria risco sem ganho. |
| LOG-L5, escrita condicional no servidor (função SQL) | para o Vinicius | Exige mudar o banco real. A versão no cliente já cobre os aparelhos atualizados. |
| Observações menores da auditoria de lógica (atualização sem esperar a sincronização, indicador de sincronização preso, Agenda depois da meia-noite) | adiado | Fora dos 45 itens confirmados; impacto baixo. |

## 7. Itens novos para lançar

| Item | Lote | O que é |
|---|---|---|
| NOVO-1 | lote-7 | Testes automáticos de cifra, junção e migração, com os formatos das versões 1.0.4, 1.1.1, 1.1.2 e 1.1.3 (junto do TEC-T14). |
| NOVO-2 | lote-7 | `npm run release` roda `npm test` antes de qualquer build. |
| NOVO-3 | lote-7 | Tela de erro com "Abrir de novo" no lugar da tela em branco quando algo quebra na renderização. |

## 8. Sugestões que precisam do Vinicius

Nada daqui entra nos lotes. São decisões de produto, de identidade ou de conta.

1. Tela "Restaurar cópia": as cópias `backup:<versão>` existem, mas não há como a pessoa restaurar uma pelo app.
2. Excluir a conta pelo app e por uma página: as lojas pedem isso de apps com cadastro. Junto, política de privacidade e termos publicados.
3. Um nome só para a tela: "Ajustes" ou "Configurações" (UI-T1).
4. O que "Sair da conta" faz com o diário do aparelho: manter (como hoje) ou oferecer apagar.
5. Campo "Repita a senha" no cadastro (hoje é um campo só; o plano acrescenta "Mostrar senha").
6. Botão "mais" visível em cada linha no celular, no lugar de depender só do toque longo.
7. Rótulos nos ícones do alto e da lateral.
8. Tarefa em branco: manter as linhas vazias da Agenda ou esconder.
9. Trava por inatividade com o app aberto (hoje só trava ao sair e voltar).
10. Virada do dia com a Agenda aberta: trocar de dia sozinha ou avisar.
11. Aviso visível de "sem internet" nos Ajustes, na seção Conta.
12. Texto de exemplo do título mais claro no editor.
13. Cifrar o diário local com o PIN (hoje o PIN tranca a tela; o banco do aparelho não é cifrado por ele).
14. Escrita condicional no servidor (função SQL) para fechar de vez a disputa entre aparelhos, inclusive os antigos.
15. Assinatura de código no Windows, para o instalador não mostrar o aviso do SmartScreen.
16. Apagar do repositório `memoras-site.zip` e `portfolio-preview/`, se não forem mais usados.

## 9. Ações externas

Nenhum lote faz estas ações. Elas ficam com o Vinicius ou pedem a confirmação dele.

- Supabase (projeto real): aplicar o `supabase/schema.sql` endurecido do TEC-T11 e conferir os Advisors. Antes, testar num projeto de teste. As Redirect URLs não mudam (`memoras://senha` continua igual nos quatro lugares).
- Android: gerar o APK com a chave de `~/.memoras` e conferir num aparelho de verdade: área segura nas telas de PIN e login num celular baixo (UI-L1), áreas de toque (UI-L2), barra de rolagem do sistema (UI-L4), CSP sem violação ao entrar, sincronizar e procurar atualização (TEC-T9), "Salvar cópia" e atualização do APK com o `file_paths.xml` reduzido (TEC-T10).
- Windows: conferir o alto contraste (UI-A3) com um tema de contraste do sistema, numa pasta de dados de teste.
- Hostinger (site): política de segurança de conteúdo no `.htaccess` do site e as páginas de privacidade, termos e exclusão de conta, se a sugestão 2 for aceita.
- Certificado de assinatura de código para o Windows, se a sugestão 15 for aceita.
- Release: só com a confirmação do Vinicius, depois de juntar os lotes, subir a versão e fazer o commit da versão. O script novo cancela se houver mudança sem commit, se o commit não for o do `main` no GitHub ou se a versão já estiver publicada.
