# Fase 1: Mapa do projeto Memoras

Gerado em 2026-11-16 a partir do branch `melhorias-claude` (versão 1.1.4 em `package.json`). Só leitura: nenhum código do app foi alterado.

## 1. Estrutura de pastas

Ignorados aqui: `node_modules`, `dist`, `dist-desktop`, `dist-mobile`, `release`, `android/app/build`, `video/out`, `portfolio-preview`.

| Pasta | O que tem |
|---|---|
| `src/` | App web (React). Entrada `main.tsx`, raiz `App.tsx`, estado `store.ts`, sync `sync.ts`, estilos `styles.css`, temas `themes.ts`, sons `sounds.ts`, atualizações `updates.ts`, ponte nativa `native.ts`, barra de título `TitleBar.tsx`, janela `win.ts`, componentes `ui.tsx` e `icons.tsx`. |
| `src/screens/` | Telas (uma por arquivo, detalhadas na seção 3). |
| `src/lib/` | `crypto.ts` (AES-GCM, códigos), `db.ts` (IndexedDB `memoras`, `DB_VERSION = 2`), `notes.ts` (modelo do diário, junção), `items.ts` (Cadernos e Agenda, datas). |
| `electron/` | `main.cjs` (processo principal: janelas, Mini-Memoras, protocolo `app://`, atualizador, links `memoras://`) e `preload.cjs` (ponte `window.memorasWin`). |
| `android/` | Projeto Capacitor (Gradle). Código próprio em `android/app/src/main/java/br/com/cyberhat/memoras/`: `BiometricPlugin.java`, `RingerModePlugin.java`, `UpdatePlugin.java`, `MainActivity.java`. |
| `site/` | Site estático de divulgação (`index.html`, `privacidade.html`, `confirmado.html`, `404.html`, `styles.css`, `site.js`, `sw.js`, `sitemap.xml`, `robots.txt`, `.htaccess`). Não é buildado pelo Vite do app. |
| `supabase/` | `schema.sql` (tabelas `vaults` e `notes`, RLS, trigger `memoras_touch`) e modelos de email em português (`emails/`). |
| `scripts/` | `release.mjs` (publica no GitHub Releases), `apk.mjs` (gera o APK assinado). |
| `video/` | Vídeo de divulgação em Remotion (`src/Memoras.tsx`, `Screens.tsx`, `Root.tsx`, `time.ts`) e sons em `public/audio/`. Fora do app. |
| `build/`, `assets/` | Ícones para o instalador de Windows e marca. |
| `design_handoff_memoras/` | Referência de design (fidelidade alta, citada no CLAUDE.md). |
| `.auditoria/` | Arquivos desta auditoria (ignorados pelo Git exceto README). |
| `.claude/` | `launch.json` com os servidores `memoras-dev` (porta 5174) e `memoras-site` (porta 5176). |

Raiz relevante: `index.html` (entrada do Vite), `vite.config.ts`, `tsconfig.json`, `capacitor.config.json`, `remotion.config.ts`, `.env.example`, `README.md`, `CLAUDE.md`, `memoras-site.zip` (cópia antiga do site, não usada).

Não existe nenhuma pasta de testes automatizados (nem `*.test.*`, `*.spec.*`, Vitest ou Jest). O único teste no repositório é o exemplo padrão do Android em `android/app/src/test` e `androidTest`, do template do Capacitor.

## 2. Stack e versões

Versões tiradas do `package.json` (faixa aceita, não a instalada).

| Item | Versão | Uso |
|---|---|---|
| React / react-dom | ^19.3.0 | Interface |
| TypeScript | ^7.0.2 | Checagem de tipos (`tsc --noEmit`) |
| Vite | ^8.3.5 | Build (modos `web`, `desktop` e `mobile`) |
| @vitejs/plugin-react | ^6.1.1 | JSX |
| vite-plugin-pwa | ^1.3.0 | Service worker e manifesto, só no modo web |
| Electron | ^44.9.3 | App de Windows |
| electron-builder | ^26.15.3 | Gera o instalador NSIS |
| electron-updater | ^6.8.9 | Atualização automática no Windows (via GitHub Releases) |
| Capacitor (core, cli, android, app, share, filesystem) | ^8.x (core/android/cli ^8.5.2) | App de Android |
| @supabase/supabase-js | ^2.117.2 | Contas e sincronização (PKCE) |
| @fontsource-variable/source-sans-3, @fontsource/source-code-pro | ^5.3.0 | Fontes locais |
| Remotion (remotion, @remotion/cli) | ^4.0.531 | Só o vídeo de divulgação |
| Android | minSdk 24, compileSdk/targetSdk 36 | `android/variables.gradle` |

Identificadores que não podem mudar (citados no CLAUDE.md): `appId` `br.com.cyberhat.memoras`, origem `app://memoras` no Windows, `https://localhost` no Android, nome do banco `memoras`.

## 3. Pontos de entrada

| Alvo | Entrada | Observação |
|---|---|---|
| Web (PWA) | `index.html` > `src/main.tsx` | Modo `web` gera service worker (`registerType: autoUpdate`). Precisa de https ou localhost (Web Crypto). |
| Windows (Electron) | `electron/main.cjs` (`"main"` do package.json) carrega `dist-desktop` | CSP restritiva em `vite.config.ts` (só o próprio app e o Supabase). Ponte em `electron/preload.cjs`. |
| Android (Capacitor) | `capacitor.config.json` (`webDir: dist-mobile`) e `MainActivity.java` | Build web no modo `mobile`, depois `cap sync android`. |
| Site | `site/index.html` (e demais páginas) | Servido com `vite site` no `launch.json` (porta 5176). Independente do app. |
| Supabase | `supabase/schema.sql` | Rodado manualmente no SQL Editor do projeto. |
| Vídeo | `video/src/index.ts` | Remotion, fora do app. |

## 4. Telas

### 4.1 Telas de estado (`store.ts`, tipo `Screen`)

| Estado | Componente | O que faz |
|---|---|---|
| `loading` | (App, sem tela) | Carregamento inicial do IndexedDB antes de escolher a tela. |
| `pin` | `screens/Pin.tsx` | Teclado do PIN nos modos desbloquear, confirmar, criar e verificar. |
| `onboard` | `screens/Onboard.tsx` | Primeiro uso: nome do diário, cor, armazenamento (só aparelho ou conta) e PIN opcional. |
| `auth` | `screens/Auth.tsx` | Criar conta ou entrar (e-mail e senha). Link para "Esqueci minha senha". |
| `recovery` | `screens/Keys.tsx` (`Recovery`) | Mostra a chave de recuperação uma única vez. Tem tela de impressão. |
| `pinkey` | `screens/Keys.tsx` (`PinKey`) | Mostra a chave do PIN uma única vez (sem conta). Tem tela de impressão. |
| `forgot` | `screens/Forgot.tsx` (`Forgot`) | Esqueci a senha, etapa 1: nova senha; etapa 2: chave de recuperação. |
| `forgotPin` | `screens/Forgot.tsx` (`ForgotPin`) | Esqueci o PIN: reabrir com a chave do PIN. |

Telas dentro do app (`inApp`), todas renderizadas por `screens/Shell.tsx`:

| Estado | Componente | O que faz |
|---|---|---|
| `history` | `Shell` (lista do Diário) | Lista de anotações do diário (aba Diário). |
| `editor` | `Editor` (em `Shell.tsx`) | Edita uma anotação do diário, com horário de cada trecho. |
| `docs` | `screens/Docs.tsx` (`DocsList`, `DocsEmpty`) | Lista de Cadernos (aba Cadernos). |
| `doc` | `screens/Docs.tsx` (`DocView`) | Lê e edita um caderno (títulos, listas, fixar, cor). |
| `summary` | `screens/Summary.tsx` | Resumão: tarefas de hoje em diante, separadas por dia. |
| `agenda` | `screens/Agenda.tsx` (`AgendaDay`, `AgendaSide`) | Agenda do dia: tarefas, anotações do dia e calendário. |
| `search` | `Search` (em `Shell.tsx`) | Busca em anotações e cadernos (Ctrl+F). |
| `archive` | `Shelf` (em `Shell.tsx`) | Arquivo e Lixeira (mesma tela, dois modos). |
| `settings` | `Settings` (em `Shell.tsx`) | Ajustes: Diário, Sons, PIN, Conta e sincronização, Chave de recuperação, Atualizações. |

### 4.2 Componentes de sobreposição e apoio

| Componente | Arquivo | O que faz |
|---|---|---|
| `TitleBar` | `src/TitleBar.tsx` | Barra de título própria do Windows (minimizar, maximizar, fechar e botão do Mini-Memoras). |
| `ItemMenu` | `screens/Menu.tsx` | Menu de opções de item (botão direito ou toque longo): fixar, cor, arquivar, lixeira. |
| `BioOffer` | `screens/BioOffer.tsx` | Oferta de entrar com a digital, no Android com leitor. |
| `UpdateCard` | `screens/UpdateCard.tsx` | Cartão de versão nova disponível ou em instalação. |
| Confirmação (modal) | `App.tsx` | Diálogo "Mover para a lixeira?", "Apagar para sempre?", "Apagar todo o diário?" e "Esvaziar a lixeira?". |
| Calendário | `Shell.tsx` (`Calendar`, `ui.tsx` `MonthCal`) | Calendário lateral, com dias que têm anotação ou tarefa. |
| Menu lateral / abas | `Shell.tsx` (`Side`, `MiniNav`) | Navegação no computador (lateral) e no celular (abas Diário, Cadernos, nova, Agenda, Ajustes). |
| Cor e tema | `ui.tsx` (`ThemeGrid`, `ColorPick`), `themes.ts` | 10 temas e 9 cores de papel (inclui "Sem cor"). |
| Sincronização | `ui.tsx` (`SyncDot`) | Bolinha de estado (sincronizado, sincronizando, offline, erro). |

## 5. Fluxos principais

| Fluxo | Passos no código | Arquivos |
|---|---|---|
| Primeiro uso | Abre em `loading`, sem anotações vai para `onboard`: nome do diário, cor, "só neste aparelho" ou conta, PIN opcional. Sem conta, o PIN pode mostrar a chave do PIN (`pinkey`). | `store.ts` (`init`), `Onboard.tsx`, `Keys.tsx` |
| PIN | Modos `create`, `verify`, `confirm`, `unlock`. Erros bloqueiam por tempo crescente (30 s a 15 min, `LOCK_S`). Relock após 1, 5, 15, 30 ou 60 min fora do app (`LOCK_AFTER`). Digital opcional. "Esqueci o PIN" leva a `forgotPin` com a chave do PIN. Com conta, o PIN é um só para todos os aparelhos (cifrado em `prefs` do cofre). | `store.ts` (`submitPin`, `unlockApp`, `relock`, `startCreatePin` e similares), `Pin.tsx`, `Forgot.tsx`, `native.ts` |
| Login / cadastro | `auth` com modo `signup` ou `login`. Cadastro gera a chave de recuperação (`recovery`), mostrada uma vez. Login pode pedir a chave (`needKey`). Ao sair, `logout` limpa o aparelho. | `Auth.tsx`, `Keys.tsx`, `sync.ts` (`signUp`, `login`, `logout`) |
| Esqueci a senha | `forgot`: e-mail manda link `memoras://senha` (PKCE). O app abre pelo link (`openAppLink`), define a nova senha (`setNewPassword`) e pede a chave de recuperação para reabrir as anotações (`reopenWithKey`). A senha sozinha não abre o diário. | `Forgot.tsx`, `sync.ts`, `electron/main.cjs`, `AndroidManifest.xml` |
| Criar anotação | `Ctrl+N` ou botão "Nova anotação" chama `addNew`/`newNote` e abre `editor`. Texto em trechos com horário próprio. Título opcional. Cor pelo menu. | `Shell.tsx` (`addNew`, `Editor`), `store.ts` (`openNew`, `editSeg`, `setTitle`) |
| Cadernos | Lista em `docs`; `newDoc` abre `doc`. Título e corpo em `parseDoc` (títulos, listas). Fixar (`setDocPinned`), cor, arquivar, lixeira e restaurar. Cadernos ficam na tabela `notes` do servidor, com `kind` dentro do texto cifrado. | `Docs.tsx`, `store.ts`, `lib/items.ts` |
| Agenda e Resumão | `agenda` mostra o dia (`openDay`): tarefas (`addTask`, `toggleTask`, `reorderTask`, `moveTask`, `deleteTask`) e anotação do dia (`setDayNote`). `summary` lista tudo de hoje em diante. O que ficou por fazer passa para o dia seguinte. | `Agenda.tsx`, `Summary.tsx`, `store.ts` |
| Arquivo e Lixeira | `archive` com dois modos. Arquivar, mover para a lixeira (`trash`), restaurar e esvaziar (confirmação). | `Shell.tsx` (`Shelf`), `store.ts` (`archive`, `trash`, `confirmDo`) |
| Busca | `search` (Ctrl+F), sobre anotações e cadernos, com realce. | `Shell.tsx` (`Search`) |
| Sincronização | Inicia em `init()` > `startSync()`. Mudanças agendam envio (`scheduleSync`, 2,5 s). `syncNow` faz pull e push, cifra com a chave do cofre e une por campo (`merge`, `mergeItem`) com timestamps. Caderno editado em dois aparelhos vira "(outra versão)". Com PIN travado, `lockedGuard` e `WHILE_LOCKED` impedem login ou cadastro. | `sync.ts`, `store.ts`, `lib/notes.ts`, `lib/items.ts`, `lib/crypto.ts`, `supabase/schema.sql` |
| Temas | 10 temas com variáveis CSS (`applyTheme`) e 9 cores de papel (inclui "Sem cor"), troca em Ajustes e no menu de cor. Preferência em `prefs`. | `themes.ts`, `ui.tsx`, `store.ts` (`setPrefs`) |
| Mini-Memoras (só Windows) | Botão na barra de título ou Ctrl+Shift+M (`toggleMini`). Modo e tamanho em `janela.json` na pasta de dados do app. Janela pequena do tamanho do Cynote (643 x 523), com `html[data-mini]` e opção de ficar por cima. | `TitleBar.tsx`, `win.ts`, `electron/main.cjs` (`setMode`, `placeMini`, `janela.json`), `preload.cjs` |
| Atualização | Windows: `electron-updater` consulta o GitHub Releases ao abrir e a cada 4 h (segundo o README), baixa em segundo plano e instala ao fechar. Android: `updates.ts` consulta a API de releases e `UpdatePlugin` baixa e instala o APK. Cartão `UpdateCard` mostra o andamento. Antes de cada versão nova, o app guarda cópia dos dados (`backup:<versão>`, as 3 últimas). | `updates.ts`, `electron/main.cjs` (`autoUpdater`), `UpdatePlugin.java`, `UpdateCard.tsx`, `store.ts` (`snapshotOnUpgrade`) |
| Backup e reset | Ajustes permite apagar todo o diário deste aparelho (`resetDiary`, com confirmação). | `Shell.tsx` (`Settings`), `store.ts` |

## 6. Como rodar, buildar e testar

Scripts do `package.json`:

| Script | O que faz |
|---|---|
| `npm run dev` | Vite em modo desenvolvimento (web). Porta padrão do Vite, ou 5174 via `launch.json`. |
| `npm run build` | `tsc --noEmit` e `vite build` (web, gera `dist/`). É a única checagem automática do app. |
| `npm run preview` | Serve `dist/`. |
| `npm run build:desktop` | Build para o Electron, em `dist-desktop/`, sem service worker. |
| `npm run desktop` | Build desktop e abre o Electron (`electron .`). Usa os dados reais do usuário (`%APPDATA%\Memoras`), por isso testar com `--user-data-dir` em uma cópia. |
| `npm run dist` | Build desktop e `electron-builder --win` (instalador em `release/`, sem publicar). |
| `npm run release` | `scripts/release.mjs`: confere `.env`, gera o APK, confere a assinatura do APK, gera o instalador, publica no GitHub (`v<versão>`). Pede confirmação. |
| `npm run build:mobile` | Build do modo `mobile` em `dist-mobile/` e `cap sync android`. |
| `npm run apk` | `build:mobile` e `scripts/apk.mjs` (gradle `assembleRelease`, copia para `release/Memoras.apk`). |
| `npm run video` / `video:render` | Remotion (estúdio e render do vídeo de divulgação). |

Testes: não há suíte automatizada. A verificação hoje é `npm run build` (tipos e build) mais teste manual no app (desktop com cópia dos dados, ou APK). Testes unitários de criptografia, junção (`merge`, `mergeItem`) e migração do IndexedDB seriam o primeiro candidato a cobertura.

Pré-requisitos para rodar com contas: `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ver `.env.example`). Sem o `.env` o app roda só no aparelho, e `npm run release` cancela. Não ler nem mostrar o conteúdo do `.env`.

Android: exige Android SDK (`ANDROID_HOME` ou `%LOCALAPPDATA%\Android\Sdk`) e a chave de assinatura em `~/.memoras` (fora do repositório).

## 7. Observações para as próximas fases

- Não existe teste automatizado para as partes de maior risco (criptografia, junção de anotações, migração do banco, PIN). Ponto de atenção para a fase de testes.
- A regra de "nunca perder anotações" (CLAUDE.md) depende de `DB_VERSION`, de `itemContent` e de `content()` aceitarem dados antigos. Vale checar isso na fase de dados.
- `memoras-site.zip` e `portfolio-preview/` parecem cópias antigas do site. Não foram lidos em detalhe.
- `src/sync.ts` (413 linhas) e `Shell.tsx` (602 linhas) são os arquivos maiores e concentram a maior parte da lógica de estado da interface.
