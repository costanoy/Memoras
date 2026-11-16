# Fase 1: Inventário mecânico

Projeto: Memoras (branch melhorias-claude). Levantamento feito com git ls-files, wc, md5sum e git grep. Nenhum código do app foi alterado. Ignorados: node_modules, dist*, release, android/app/build, .claude, video/out.

## 1. Maiores arquivos de código (linhas, excluindo lockfile e binários)

Código do app e do site:
1. src/store.ts (684)
2. src/screens/Shell.tsx (602)
3. src/styles.css (568)
4. src/sync.ts (413)
5. electron/main.cjs (355)
6. video/src/Screens.tsx (337)
7. video/src/Memoras.tsx (260)
8. src/screens/Docs.tsx (242)
9. site/index.html (241)
10. site/styles.css (211)
11. src/screens/Agenda.tsx (200)
12. src/ui.tsx (159)
13. src/lib/items.ts (150)
14. src/screens/Forgot.tsx (146)
15. src/App.tsx (136)
16. src/TitleBar.tsx (126)
17. src/screens/Menu.tsx (114)
18. site/privacidade.html (99)
19. src/screens/Onboard.tsx (97)
20. src/screens/Keys.tsx (96)

Referência de design (fora do app, mas versionada):
- design_handoff_memoras/support.js (1911)
- design_handoff_memoras/Memoras.dc.html (1178)
- design_handoff_memoras/README.md (255)
- package-lock.json (lockfile, 495 KB)

## 2. Maiores assets (bytes)

1. video/public/audio/musica.wav (5.776.616)
2. package-lock.json (494.963), não é asset
3. Ícone 420.237 B, arquivo idêntico em 6 caminhos: build/icon.png, public/icon-512.png, site/img/memoras-icon.png, video/public/icon.png, design_handoff_memoras/assets/memoras-icon.png, design_handoff_memoras/site/img/memoras-icon.png
4. android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png (227.482)
5. design_handoff_memoras/Memoras.dc.html (154.114)
6. android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png (133.462)
7. video/public/audio/video-typing.mp3 (73.197)
8. site/img/og.jpg (70.890)
9. android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (84.445)
10. android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png (81.771)
11. video/public/audio/video-encrypt.mp3 (36.909)
12. video/public/audio/video-logo.mp3 (49.581)

## 3. Duplicados binários exatos (md5 igual)

- public/sounds/pin-key.mp3 = video/public/audio/pin-key.mp3
- public/sounds/unlock.mp3 = video/public/audio/unlock.mp3
- public/sounds/new-note.mp3 = video/public/audio/new-note.mp3
- android/app/src/main/res/drawable/splash.png = android/app/src/main/res/drawable-land-mdpi/splash.png
- Grupo do ícone de 420 KB (seção 2, item 3)

## 4. Trechos de código duplicado evidentes

- src/screens/Forgot.tsx:123 e src/screens/Forgot.tsx:133: mesmo botão `<button className={'gel' + (busy ? ' off' : '')} onClick={submit}>Confirmar</button>`, em dois ramos do mesmo componente.
- src/screens/Forgot.tsx:36 e :105 e src/screens/Auth.tsx:36: `} catch (x) { setErr(friendly(x)); }` (repetido em 3 pontos).
- src/App.tsx:51 e :71 e src/screens/Pin.tsx:33: `window.addEventListener('keydown', onKey);`
- src/screens/Auth.tsx:11, Forgot.tsx:19 e :90, Shell.tsx:369: `const [busy, setBusy] = useState(false);`
- src/screens/Shell.tsx:399, :409, :419, :451, :470, :500: `<div className="gcard setcard">` repetido seis vezes no mesmo arquivo.
- video/src/Memoras.tsx:46, :60, :82, :192, :215: `const frame = useCurrentFrame(), { fps } = useVideoConfig();`
- src/sounds.ts:3-14: a lista de nomes de sons aparece duas vezes (primeira como tipo, depois como mapa).
- Sem ocorrência de bloco longo idêntico (60+ caracteres) acima de 2 linhas além dos citados.

## 5. Arquivos possivelmente mortos (sem import ou referência)

Checagem: nome do módulo buscado em import, require ou caminho em src, electron, video/src e raiz.
- Nenhum módulo de src/ ou video/src/ ficou sem importação. Todos têm pelo menos 1 importador.
- electron/preload.cjs: sem import, mas referenciado por path em electron/main.cjs:184 (não é morto).
- src/env.d.ts: sem import, é declaração de tipo (checagem por import não se aplica).
- video/src/index.ts: sem import, é entrada do Remotion (package.json:20-21).
- scripts/apk.mjs e scripts/release.mjs: não checados por import (são executados por npm scripts).

## 6. Exports sem uso (exportado e citado só no próprio arquivo)

Lista mecânica: nome aparece em um único arquivo de src, video/src ou electron. Pode ser uso local, então é só candidato.
- Account, Block, Caret, Cfg, DOCS, DayNoteContent, DocContent, MenuKind, ModeResult, Screen, Sync, SyncPill, TASKS, Tap, TaskContent, UpdState, WinMode, updItem, closeApp, fitArea, newer, paperOf, parseDoc, scheduleSync, scrollerOf, smooth, supabase, trashDoc

## 7. TODO, FIXME, HACK, XXX

Nenhuma ocorrência em src, electron, video/src, scripts, site e raiz (exceto design_handoff_memoras e package-lock.json, também sem ocorrência).

## 8. Assets sem referência

- public/sounds/*.mp3 (6 arquivos): sem nome literal no código, mas são carregados dinamicamente em src/sounds.ts:26 (`'/sounds/' + name + '.mp3'`). Os 6 nomes (pin-key, pin-error, unlock, new-note, archive, trash) batem com src/sounds.ts. Uso confirmado.
- video/public/audio/*.mp3 (7 arquivos sem nome literal: new-note, pin-key, unlock, video-color, video-encrypt, video-logo, video-typing, video-whoosh): carregados em video/src/Memoras.tsx:252 por `audio/${name}.mp3`. Não confirmei quais nomes estão na lista usada por esse template. Verificar manualmente se video-color e video-whoosh entram nela.
- video/public/audio/musica.wav: referenciado em video/src/Memoras.tsx:249-250.
- site/img/*: todos referenciados em site/*.html.
- site/sw.js: referenciado em site/.htaccess:22-23 (desinstala service worker antigo).
- build/icon.png e public/icon-512.png: referenciados (4 ocorrências cada, inclusive nomes de arquivo).
- assets/icon-only.png: pasta assets/ fora do Git (ignorado em .gitignore:10). Sem referência no código rastreado.
- design_handoff_memoras/: pasta inteira de referência de design, não usada pelo build. Os arquivos dela não entram no inventário de referência.

## 9. Observações fora do escopo pedido

- .auditoria/ tem arquivos não rastreados (build.log, desktop.log, tsc.log, audit-all.log, audit-prod.log, fase1-ferramentas.md). Não foram tratados aqui.
