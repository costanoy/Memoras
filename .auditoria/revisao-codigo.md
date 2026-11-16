# Revisão de código: origin/main...melhorias-claude

Escopo: diff sem .auditoria, MELHORIAS.md e package-lock.json. tsc limpo; vitest com 4 arquivos, 15 testes passando e 1 todo.

## Achados

### R1 (alta): laço apertado de sync na atualização condicional (src/sync.ts)
Quando `update(...).eq('updated_at', srv)` volta com 0 linhas, o código busca a linha do servidor e marca `again = true` mesmo quando a linha não abre ou quando parseItem devolve null. Isso acontece, por exemplo, com um status ou campo gravado por uma versão mais nova, como já ocorreu no histórico de compatibilidade do CLAUDE.md. Nesse caso `srv` nunca é atualizado, o update condicional falha em todo ciclo e `finally { if (again) void syncNow() }` dispara outro ciclo na hora. O resultado é um laço sem pausa martelando o Supabase.
Correção: marcar `again` só quando applyItems aplicou a linha de fato, ou quando `!row` (a linha foi apagada). Nos outros casos, registrar no console, manter o item sujo e deixar para o ciclo normal de 60 s. Se possível, copiar o `updated_at` lido para `srv` para não repetir o conflito.

### R2 (média): limite de 1 MiB no banco sem proteção no cliente (supabase/schema.sql e src/sync.ts)
A nova constraint `octet_length(data) < 1048576` não tem verificação correspondente no cliente. Um caderno ou item grande (cerca de 750 KB de texto já cifrado em base64) faz o upsert em lote de 100 linhas, ou o update condicional, lançar erro. Isso aborta o ciclo inteiro: os lotes seguintes, os itens e o lastPull nunca são enviados. Aplicar a constraint num banco que já tem linhas maiores também falha.
Correção: medir o tamanho do texto cifrado antes de enviar, pular a linha grande demais com um aviso ("Caderno grande demais para sincronizar") e mandar o resto. No schema, criar a constraint `not valid` ou conferir as linhas existentes antes.

### R3 (média): critério de pronto não cumprido (test/items.test.ts:60)
O `it.todo('lápide estável ...')` continua lá, embora o lote 1 (lápide determinística em mergeItem) já esteja no branch. MELHORIAS §5 item 5 pede que esse teste seja ativado.
Correção: transformar o todo em um teste real que junta duas lápides nas duas ordens e confere o resultado com sameItem.

### R4 (baixa): signUp que cai em login mostra a mensagem errada (src/sync.ts e src/screens/Auth.tsx)
Quando o cofre já existe, signUp devolve `login(email, password)`, que retorna `{}` ou `{needKey}`. No modo cadastro, Auth trata a falta de recKey como "Enviamos um email de confirmação" e volta para o modo login, embora a conta já esteja conectada. O `needKey` também é ignorado, então o usuário não vai para o passo 3 do Esqueci.
Correção: signUp devolve `{ ...(await login(...)), loggedIn: true }`. No ramo de cadastro, Auth trata `needKey` e segue a navegação normal de login quando `loggedIn`.

### R5 (baixa): relock depois do Esqueci o PIN sempre volta para Ajustes (src/store.ts)
Com `forgotPin`, relock retoma sempre em 'settings'. Se o ForgotPin foi aberto pelo passo "conferir o PIN" do onboarding, o desbloqueio leva a Ajustes e pula o resto do onboarding.
Correção: guardar a tela de origem ao abrir o ForgotPin (por exemplo, no pinReturn que já existe ou num campo próprio) e usar esse valor no resume.

### R6 (baixa): onblocked agora rejeita a abertura do banco (src/lib/db.ts)
Uma janela antiga, sem o handler onversionchange (versão anterior ainda aberta), bloqueia o upgrade. Antes isso era só uma espera; agora init falha de vez. Além disso, a conexão que abre depois da rejeição fica vazando.
Correção: no onblocked, só mostrar o aviso e continuar esperando. Ou, se mantiver a rejeição, fechar a conexão no onsuccess quando a promessa já tiver sido rejeitada.

## Observação (não é bug)
- store.ts init: o ramo `recoveryPending && unlocked` quase nunca roda, porque earlyRecovery não liga recoveryPending durante o carregamento e o openRecovery do startSync já abre 'forgot'. O comportamento é permitido pelo plano, mas o comentário no init engana. Basta ajustar o comentário.

## Conferido sem problema
pullAll (avanço e dedup), srv fora de itemContent, lápide determinística coerente com tombstoneItem, guardas gone(), ordem do resetDiary, fila do PIN, hiddenGrace, kvSetStrict, origens da CSP (api.github.com), file_paths.xml (APK no cache), TitleBar fora de .contents e checagens do release.mjs.

## Correções

Um commit por achado, no branch melhorias-claude. No fim: tsc, vitest (16 testes) e build passam.

- R1 (real): o conflito do envio condicional só marca nova rodada na hora quando a linha do servidor foi aplicada (applyItems) ou quando ela não existe mais. Linha de versão mais nova (parseItem null) ou ilegível só registra no console e fica para o ciclo normal de 60 s. Não copiei o updated_at para srv: isso faria o próximo envio sobrescrever campos que esta versão não entende.
- R2 (real): sync.ts mede o texto cifrado (limite 1 MiB), pula a linha grande demais com console.warn e o aviso "Caderno grande demais para sincronizar" (uma vez por sessão) e envia o resto, nos três caminhos de envio. schema.sql cria a constraint como "not valid" (vale para linhas novas, não falha com linhas antigas maiores).
- R3 (real): o it.todo virou teste real, com duas lápides juntadas nas duas ordens e conferidas com sameItem (e idempotência).
- R4 (real): signUp devolve { ...login, loggedIn: true } quando o cofre já existe. Auth agora usa um só fluxo de navegação para cadastro e login, tratando needKey, recKey e onboarding; só mostra "Enviamos um email" quando não há login.
- R5 (real): relock usa pinReturn também na tela forgotPin (o onboarding e os ajustes já gravam a origem em pinReturn).
- R6 (real): onblocked não rejeita mais a abertura; avisa por dbHooks.blocked (toast) e continua esperando o onsuccess.
- VIS-1 (real): `.invite .link{margin:-12px 0}` em styles.css. "Ver todas" e "Ver o Resumão" não ficam dentro de .invite, então não mudam. Não consegui conferir por print: o Vite em dev na porta 5210 abriu em branco no painel do navegador; conferir nos prints do lote.
- VIS-2 (real): em Auth.tsx a dica e o erro da senha vêm logo depois do campo e "Mostrar senha" por último, com margin '-8px 0' para manter os 44 px de toque. Sem conferência por print, pelo mesmo motivo.
