# Auditoria de lógica e fluxo

Projeto: Memoras, branch `melhorias-claude`. Auditor de Lógica, somente leitura.

Como foi feito: leitura do código (`src/store.ts`, `src/sync.ts`, `src/lib/`, `src/screens/`, `src/App.tsx`, `src/native.ts`, `src/TitleBar.tsx`, `electron/main.cjs`, `supabase/schema.sql`, `site/confirmado.html`). Nada do app foi alterado, o app instalado e `%APPDATA%\Memoras` não foram abertos, nada foi enviado ao Supabase.

O que foi executado de verdade: só o item L1, com um script de Node fora do projeto que importou `src/lib/items.ts` e repetiu a junção de `sync.ts:333-335`. Todos os outros itens vêm de leitura do código e ainda precisam de um teste manual antes da correção.

Não há item de gravidade crítica: nenhum caminho encontrado apaga o diário inteiro nem expõe o texto das anotações.

## Resumo dos itens

| Id | Título | Gravidade |
|---|---|---|
| L1 | Caderno apagado é reenviado a cada sincronização, para sempre | alta |
| L2 | Tarefa digitada se perde ao trocar de tela sem tirar o foco | média |
| L3 | Recarga depois de falha com a janela minimizada abre sem PIN | média |
| L4 | O app não trava na tela "Esqueci o PIN" aberta pelos Ajustes | média |
| L5 | Edição de caderno se perde quando dois aparelhos sincronizam juntos | média |
| L6 | A paginação do recebimento pode pular linhas | média |
| L7 | A cópia de segurança pode falhar em silêncio | média |
| L8 | A confirmação não devolve o foco e congela a barra de título | média |
| L9 | "Apagar todo o diário" não espera a sincronização nem encerra a sessão | baixa |
| L10 | O banco local abre sem tratar bloqueio nem fechamento | baixa |
| L11 | Tentativas simultâneas de PIN contam como uma | baixa |
| L12 | Editar e Pronto perdem o foco do teclado | baixa |
| L13 | Aviso "Tarefa passada para amanhã" errado em outros dias | baixa |
| L14 | A limpeza de item vazio já enviado apaga o item em outro aparelho | baixa |
| L15 | Link de senha que chega durante o carregamento ignora a trava | baixa |

## L1. Caderno apagado é reenviado a cada sincronização, para sempre

- Gravidade: alta.
- Evidência: `src/lib/items.ts:73-77` (`tombstoneItem` grava `statusTs: Date.now()` e soma 1 em `rev`), `src/lib/items.ts:85` (a junção chama `tombstoneItem` de novo a cada vez), `src/sync.ts:333-335` (resultado diferente do local sobe `rev` e zera `syncedRev`), `src/sync.ts:339` e `:343` (grava no IndexedDB sem conferir se mudou), `src/sync.ts:357-361` (reenvia), `src/sync.ts:289` e `:303` (o aparelho sempre recebe de volta o que ele mesmo enviou).
- O que acontece: a junção de um caderno apagado nunca dá um resultado igual ao que já existe, porque carimba a hora atual. O aparelho recebe a própria linha, junta, acha que mudou e envia de novo. Isso se repete a cada ciclo (60 segundos com o app aberto), para cada caderno apagado, em cada aparelho, sem fim. Com tarefas apagadas que tinham campos diferentes em dois aparelhos, os dois ficam se reenviando.
- Confirmado por simulação: um caderno apagado, um aparelho, 5 ciclos, 5 reenvios (`rev` foi de 5 a 9). Tarefa apagada em dois aparelhos: 6 reenvios em 6 turnos.
- Efeito: não perde dados. Gasta rede, bateria e escritas no servidor para sempre, cresce com o número de cadernos apagados (inclusive os cadernos em branco limpos por `cleanItems`) e aumenta a chance do L6.
- Como reproduzir: com conta, crie um caderno, espere sincronizar, apague de vez pela lixeira. Observe a aba de rede: a cada ciclo sai um `upsert` em `notes` mesmo sem mexer em nada.
- O que mudar: em `mergeItem`, montar a lápide de forma canônica, sem `Date.now()`: valores vazios e o maior de cada carimbo dos dois lados (como `merge` de `lib/notes.ts:42` já faz para anotações). Em `sync.ts:339-343`, só gravar e marcar para envio quando o resultado for diferente do local.
- Critério de pronto: com um caderno e uma tarefa apagados, a segunda sincronização sem mudanças envia zero linhas e não grava nada no IndexedDB. Um teste de unidade prova que `mergeItem(x, x)` de um item apagado devolve conteúdo igual ao de `x`.

## L2. Tarefa digitada se perde ao trocar de tela sem tirar o foco

- Gravidade: média.
- Evidência: `src/screens/Agenda.tsx:104-114` (o texto da tarefa nova fica em estado local e só é gravado no Enter ou ao perder o foco), `src/App.tsx:32-44` (atalhos trocam de tela direto), `src/native.ts:61` (botão voltar do Android), `src/store.ts:262-268` (`relock` troca a tela), `src/store.ts:474-482` e `:140` (tarefa em branco entra na contagem).
- O que acontece: o React não dispara a perda de foco quando o campo é removido da tela. Se a tela muda com o campo ainda em foco, o texto digitado some sem aviso.
- Como reproduzir: na Agenda, digite uma tarefa nova e, sem apertar Enter, use Ctrl+1, Ctrl+2, Ctrl+3 ou Ctrl+F. No Mini, Alt+Seta para a esquerda. No Android, o botão voltar com o teclado já fechado. Também acontece se o app travar por tempo fora enquanto o texto estava no campo.
- Problema vizinho: `insertTaskAfter` cria uma tarefa em branco que só some ao perder o foco. Se ela já foi enviada e o texto foi apagado, fica em branco em todos os aparelhos e conta em `tasksOn` (`store.ts:140`, usado em `Agenda.tsx:36` e `:170`), mas não no selo do Mini (`Shell.tsx:163`). Os dois números podem divergir.
- O que mudar: em `go()` e em `relock()`, antes de trocar a tela, tirar o foco do elemento ativo (`document.activeElement.blur()`), ou gravar o texto de `NewTask` na desmontagem. Tirar as tarefas em branco de `tasksOn` ou apagá-las na limpeza de `go()`.
- Critério de pronto: digitar uma tarefa e sair por cada um dos caminhos acima mantém a tarefa. Uma tarefa em branco não aparece em nenhuma contagem.

## L3. Recarga depois de falha com a janela minimizada abre sem PIN

- Gravidade: média.
- Evidência: `electron/main.cjs:222-230` (recarrega a página quando o processo de tela cai; o comentário da linha 222 diz "o PIN é pedido de novo"), `src/store.ts:244` (`awaySince` começa em 0 na página nova), `src/store.ts:253-259` (`appBack` calcula o tempo fora a partir de `awaySince`), `src/store.ts:666-667` (a tolerância é concedida e `awayAt` é zerado), `src/store.ts:679`.
- O que acontece: com a janela minimizada ou o computador bloqueado, `appAway` gravou `awayAt`. Se o processo de tela cai e a página recarrega dentro da tolerância, `init` abre destravado e apaga `awayAt`. A página nova não sabe que está fora da tela, então ao restaurar a janela `appBack` calcula tempo fora igual a zero e não trava, mesmo horas depois.
- Como reproduzir: numa cópia dos dados (`--user-data-dir`), com PIN ligado, destrave, minimize, derrube o processo de tela pelo Gerenciador de Tarefas dentro do tempo de trava, espere mais do que o tempo de trava e restaure a janela. O diário aparece sem pedir o PIN.
- O que mudar: em `init`, quando a tolerância valer e o documento estiver oculto (`document.hidden`), carregar `awaySince` com o `awayAt` gravado e manter o valor salvo, para o `appBack` seguinte medir o tempo real. Alternativa mais simples: não conceder a tolerância numa recarga por falha.
- Critério de pronto: o roteiro acima termina na tela do PIN. Reabrir o app normalmente dentro da tolerância continua sem pedir o PIN.

## L4. O app não trava na tela "Esqueci o PIN" aberta pelos Ajustes

- Gravidade: média.
- Evidência: `src/store.ts:264` (`relock` sai cedo sempre que a tela é `forgotPin`, mesmo destravado), `src/screens/Pin.tsx:64` (o link "Esqueci o PIN" aparece também no modo `verify`), `src/screens/Pin.tsx:38` (Cancelar volta para `pinReturn`), `src/screens/Forgot.tsx:92`.
- O que acontece: a exceção para `forgotPin` existe para quem já está travado. Mas a mesma tela é alcançada destravado, por Ajustes, Trocar PIN, "Esqueci o PIN". Nesse caso o app nunca trava por tempo fora, e `appBack` ainda zera o contador.
- Como reproduzir: com PIN ligado e o app destravado, abra Ajustes, Trocar PIN, toque em "Esqueci o PIN". Saia do app por mais tempo do que o configurado e volte. Toque em Voltar e depois em Cancelar: os Ajustes e o diário estão abertos sem PIN.
- O que mudar: em `relock`, pular `forgotPin` (e `forgot`) só quando `!s.unlocked`. Destravado, travar normalmente e levar para o PIN no modo `unlock`.
- Critério de pronto: o roteiro acima termina na tela do PIN. Quem abriu "Esqueci o PIN" já travado continua na mesma tela ao voltar.

## L5. Edição de caderno se perde quando dois aparelhos sincronizam juntos

- Gravidade: média.
- Evidência: `src/sync.ts:351` e `:361` (envio com `upsert` cego, sem conferir o que está no servidor), `src/sync.ts:367-368` (`base` passa a ser o texto enviado), `src/lib/items.ts:96` (se o local é igual à `base`, a junção aceita o remoto inteiro).
- O que acontece: sequência A recebe; B envia a versão XB; A envia XA por cima; B recebe XA com o local igual à própria `base`, aceita XA, e XB some sem gerar a cópia "(outra versão)". A janela é o tempo entre o recebimento e o envio de A, de frações de segundo a alguns segundos em rede lenta. Vale para o corpo de cadernos e para a observação do dia. Anotações e tarefas juntam campo a campo e não sofrem disso.
- Como reproduzir: dois aparelhos na mesma conta, mesmo caderno aberto. Edite linhas diferentes nos dois e force a sincronização quase ao mesmo tempo (por exemplo, saindo do app nos dois). Em parte das tentativas, uma das edições desaparece dos dois aparelhos.
- O que mudar: guardar, para cada caderno e observação, o `updated_at` do servidor visto no último recebimento (campo só local, fora do texto cifrado, para não afetar versões antigas). No envio, trocar o `upsert` por `update(...).eq('updated_at', visto)` quando a linha já existe. Se nenhuma linha for alterada, não marcar como enviado e deixar o próximo ciclo juntar com a `base` antiga, o que gera a cópia "(outra versão)" como previsto.
- Critério de pronto: um teste com dois clientes simulados na sequência acima termina com as duas edições preservadas (juntas ou com a cópia "(outra versão)"). Nenhum campo novo entra no conteúdo cifrado.

## L6. A paginação do recebimento pode pular linhas

- Gravidade: média.
- Evidência: `src/sync.ts:285-306` (páginas de 500 por `range` com deslocamento, ordenadas por `updated_at`), `src/sync.ts:303` e `:374` (`lastPull` avança até a linha mais nova recebida).
- O que acontece: se outro aparelho grava uma linha enquanto este pagina, a linha muda de posição na ordenação e uma vizinha escorrega para uma página já lida. Ela não é recebida, e `lastPull` passa adiante dela, então também não vem no próximo ciclo (a folga de 60 segundos só cobre atrasos pequenos). Só acontece com mais de 500 linhas na janela, ou seja, na primeira sincronização de um diário grande. O L1 torna as gravações simultâneas frequentes.
- Como reproduzir: conta com mais de 500 linhas, aparelho novo fazendo a primeira sincronização enquanto outro aparelho edita anotações antigas. Difícil de ver à mão; melhor provar com teste.
- O que mudar: paginar por chave em vez de deslocamento: guardar o último par (`updated_at`, `id`) e pedir a próxima página com `updated_at` maior, ou igual com `id` maior.
- Critério de pronto: um teste que altera uma linha entre duas páginas mostra todas as linhas recebidas. A primeira sincronização de 1.200 linhas traz 1.200.

## L7. A cópia de segurança pode falhar em silêncio

- Gravidade: média.
- Evidência: `src/store.ts:640-651` (`snapshotOnUpgrade`), `src/lib/db.ts:32` (`quiet` engole o erro), `src/lib/db.ts:37` (`kvSet` nunca rejeita).
- O que acontece: a cópia `backup:<versão>` duplica o diário inteiro dentro do IndexedDB. Se a gravação falha (o caso provável é falta de espaço, justo quando a cópia é maior), o código segue: apaga a cópia mais antiga (`:647`), registra na lista uma chave que não existe (`:648`) e grava `appVersion` (`:650`), então não tenta de novo. A regra do CLAUDE.md "a cada versão nova, o app guarda uma cópia" deixa de valer sem nenhum aviso. Quando `lastVersion` não existe, também não há cópia.
- Como reproduzir: simular a falha de `kvSet` na chave `backup:` (teste de unidade com o IndexedDB falso) e conferir que a lista `backups` aponta para uma chave ausente e que uma cópia boa foi apagada.
- O que mudar: usar para a cópia uma gravação que rejeita em caso de erro. Só podar as cópias antigas, atualizar `backups` e gravar `appVersion` depois que a cópia nova for confirmada. Se falhar, manter as cópias antigas e tentar de novo na próxima abertura.
- Critério de pronto: com a gravação falhando, nenhuma cópia antiga é apagada, `backups` só lista chaves que existem e a tentativa se repete na abertura seguinte.
- Observação: nada no app lê essas cópias de volta. Uma tela de restauração está nas sugestões ao final.

## L8. A confirmação não devolve o foco e congela a barra de título

- Gravidade: média.
- Evidência: `src/App.tsx:61-73` (o efeito guarda `document.activeElement` na linha 69 e devolve o foco na 66), `src/App.tsx:80-81` (`inert` envolve também a `TitleBar`), `src/App.tsx:111` (botão Cancelar com `autoFocus`), `src/screens/Menu.tsx:43` e `:87`.
- O que acontece: quando o efeito roda, o `inert` já tirou o foco de quem abriu a confirmação e o `autoFocus` já levou o foco para Cancelar. O elemento guardado é o próprio botão Cancelar, que deixa de existir ao fechar, então o foco cai no `body`. Quem usa teclado ou leitor de tela volta para o começo da página. Além disso, enquanto a confirmação está aberta, minimizar, maximizar, fechar e o botão do Mini não respondem, porque a barra de título está dentro da área inerte.
- Como reproduzir: no Windows, com o teclado, mova uma anotação para a lixeira e cancele: o foco não volta para a anotação. Com a confirmação aberta, tente minimizar a janela pelo botão da barra.
- O que mudar: guardar o elemento em foco no momento em que a confirmação é pedida (em `askTrash` e nos outros pontos que fazem `set({ confirm })`), antes da renderização. Quando a origem for o menu de contexto, guardar o elemento que abriu o menu. Tirar a `TitleBar` de dentro do contêiner inerte.
- Critério de pronto: cancelar ou confirmar devolve o foco ao elemento de origem (ou ao vizinho, se ele foi apagado). Os botões da janela funcionam com a confirmação aberta.

## L9. "Apagar todo o diário" não espera a sincronização nem encerra a sessão

- Gravidade: baixa.
- Evidência: `src/store.ts:503-509` (`resetDiary` chama `wipeAll` e recria o estado), `src/sync.ts:239` (a conta é lida uma vez no começo de `syncNow` e não é conferida de novo), `src/sync.ts:321`, `:343` e `:374` (gravações feitas depois das esperas de rede), `src/sync.ts:56` (`dkCache`).
- O que acontece: uma sincronização em andamento continua depois do apagamento e pode gravar no banco recém-limpo as linhas recebidas e o `lastPull`. A sessão do Supabase e a chave em memória também ficam. O dano real só existe quando o recebimento traz linhas, por exemplo a primeira sincronização logo depois de entrar na conta.
- Como reproduzir: entre numa conta com muitas anotações e, durante a primeira sincronização, use "Apagar diário e recomeçar". Em parte das tentativas, anotações reaparecem no diário novo.
- O que mudar: em `resetDiary`, esperar `sync` voltar a `idle` ou cancelar com um contador de geração conferido depois de cada espera em `syncNow`. Encerrar a sessão do Supabase e limpar `dkCache`.
- Critério de pronto: apagar o diário durante uma sincronização deixa as stores `notes` e `items` vazias e a sessão encerrada.

## L10. O banco local abre sem tratar bloqueio nem fechamento

- Gravidade: baixa.
- Evidência: `src/lib/db.ts:10-21` (só `onupgradeneeded`, `onsuccess` e `onerror`; a conexão fica guardada em `dbp` na linha 9 e só é descartada em `onerror`).
- O que acontece: sem `onblocked` e `onversionchange`, uma futura subida de `DB_VERSION` com duas abas do PWA abertas deixa a aba nova parada na tela de carregamento, sem mensagem. Sem `onclose`, se o navegador fechar a conexão (limpeza de dados, pouco espaço), todas as gravações seguintes falham até reiniciar o app.
- Como reproduzir: no modo web, abra duas abas, suba `DB_VERSION` numa cópia de teste e recarregue só uma delas.
- O que mudar: na conexão aberta, `onversionchange` fecha a conexão e pede para recarregar; `onclose` zera `dbp` para a próxima chamada reabrir; `onblocked` mostra um aviso pedindo para fechar as outras abas.
- Critério de pronto: o roteiro das duas abas mostra o aviso em vez de travar. Depois de um fechamento forçado da conexão, a próxima gravação funciona.

## L11. Tentativas simultâneas de PIN contam como uma

- Gravidade: baixa.
- Evidência: `src/store.ts:526-536` (`pressKey` agenda `submitPin` 140 ms depois do quarto dígito, e `del` continua aceito), `src/store.ts:548` (o `cfg` é lido antes da espera), `:551` (espera da verificação), `:564` e `:571` (`pinFails` gravado a partir do valor antigo), `src/store.ts:537-541` (`pinFail` limpa o PIN 420 ms depois), `src/screens/Pin.tsx:27-35`.
- O que acontece: apagar um dígito e digitar outro enquanto a primeira verificação ainda roda dispara uma segunda. As duas leem o mesmo `pinFails` e gravam o mesmo valor, então duas tentativas erradas contam uma. Além disso, a limpeza atrasada de `pinFail` pode apagar dígitos digitados logo depois de um erro.
- Como reproduzir: com um teclado físico, digite quatro dígitos errados, Backspace e outro dígito, tudo rápido. Confira `cfg.pinFails` depois das duas respostas.
- O que mudar: uma marca "verificando" que bloqueia teclas e novas chamadas enquanto `submitPin` roda, e reler `state.cfg` depois da espera antes de somar a falha. Cancelar o temporizador de `pinFail` se o usuário voltar a digitar.
- Critério de pronto: duas tentativas erradas em sequência rápida somam 2 em `pinFails`. Nenhum dígito digitado depois do erro é apagado.

## L12. Editar e Pronto perdem o foco do teclado

- Gravidade: baixa.
- Evidência: `src/screens/Docs.tsx:221-222` (dois botões com chaves diferentes, um substitui o outro), `:134-150` (`startEdit` só põe o foco quando existe `[data-line]` e não é celular, linhas 145 a 147), `:152-171` (`stopEdit`, com `focus: false` na 168), `:128`.
- O que acontece: o botão clicado é removido da tela, então o foco cai no `body`. Ao entrar na edição no celular, ou num caderno com título e corpo vazio, nada recebe o foco. Ao sair com Pronto, o foco nunca volta.
- Como reproduzir: abra um caderno só com o teclado, acione Editar com Enter e depois Pronto. Aperte Tab: a navegação recomeça do topo.
- O que mudar: usar a mesma chave nos dois botões (ou pôr o foco no botão novo depois da troca). Em `startEdit`, quando não houver linha para focar, focar o título ou o botão Pronto.
- Critério de pronto: depois de Editar, o foco está numa linha, no título ou em Pronto. Depois de Pronto, o foco está em Editar.

## L13. Aviso "Tarefa passada para amanhã" errado em outros dias

- Gravidade: baixa.
- Evidência: `src/store.ts:490` (texto fixo do aviso), `src/screens/Agenda.tsx:97` e `src/screens/Menu.tsx:108` (o botão e o menu dizem "dia seguinte" quando a tarefa não é de hoje).
- Como reproduzir: abra um dia que não seja hoje, passe uma tarefa para o dia seguinte. O aviso diz "amanhã".
- O que mudar: escolher o texto em `moveTask` pelo dia de destino: "amanhã" só quando o destino é o dia seguinte a hoje; senão, "Tarefa passada para o dia seguinte".
- Critério de pronto: o aviso bate com o rótulo do botão em qualquer dia.

## L14. A limpeza de item vazio já enviado apaga o item em outro aparelho

- Gravidade: baixa.
- Evidência: `src/store.ts:157-165` (`cleaned`) e `:272-280` (`cleanItems`) transformam em apagado qualquer anotação vazia ou caderno em branco ao trocar de tela, inclusive os que já foram enviados; `src/lib/notes.ts:42` e `src/lib/items.ts:85` (apagado sempre vence a junção).
- O que acontece: aparelho A cria uma anotação, ela sobe vazia ou é esvaziada, B recebe e começa a escrever nela. A sai da tela, a limpeza marca como apagada e envia. Na junção, "apagado" vence e o texto escrito em B some. É raro: exige abrir o mesmo item vazio nos dois aparelhos.
- Como reproduzir: dois aparelhos, anotação nova e vazia sincronizada, digitar em B, navegar em A, sincronizar os dois.
- O que mudar: na limpeza automática, apagar de vez só o que nunca foi enviado. Para itens já enviados e vazios, não gerar lápide (ou fazer a junção preferir o lado com texto quando o apagamento veio da limpeza automática).
- Critério de pronto: o roteiro acima termina com o texto de B preservado nos dois aparelhos.

## L15. Link de senha que chega durante o carregamento ignora a trava

- Gravidade: baixa.
- Evidência: `src/sync.ts:397-404` (a conferência `isLocked()` da linha 400 roda com o `cfg` padrão antes de `init` terminar), `src/store.ts:682` (`init` abre a troca de senha se `recoveryPending`), `src/sync.ts:48-51` (`lockedGuard`).
- O que acontece: se o link `memoras://senha` abre o app e o evento de recuperação chega antes de `init` ler o `cfg`, a conferência de trava passa para qualquer conta, e o app travado mostra a etapa de senha nova. A adoção da conta continua barrada por `lockedGuard`, então o diário não vaza: é um beco sem saída. Mas a senha da outra conta já foi trocada nessa etapa. Na prática é muito difícil de acontecer, porque `init` quase sempre termina antes.
- Como reproduzir: só com atraso artificial em `init` (teste), abrindo o app travado por um link de recuperação de outra conta.
- O que mudar: em `init`, depois de carregar o `cfg`, repetir a conferência de `lockedGuard` antes de abrir a etapa de senha. Se estiver travado e a conta for outra, descartar a recuperação e mostrar o PIN.
- Critério de pronto: com o app travado, nenhum link de recuperação de outra conta chega à etapa de senha nova, qualquer que seja a ordem dos eventos. `WHILE_LOCKED` e `lockedGuard` continuam cobrindo o fluxo.

## Pistas da revisão anterior, conferidas

- Confirmadas por leitura e incluídas: confirmação sem devolver o foco e barra de título inerte (L8), atalhos que perdem a tarefa digitada (L2), Editar e Pronto perdem o foco (L12), recarga depois de falha com a janela minimizada pula o PIN (L3).
- Confirmada, fora dos 15 por ser estética: piscada de tema ao abrir. `index.html` não aplica tema e `applyTheme` só roda em `src/store.ts:677`, depois da leitura do IndexedDB. Correção: aplicar um tema guardado antes da primeira pintura.
- Não é defeito no código atual: `site/confirmado.html` trata `error` e `error_code` (linha 43) e tira o código do endereço (linha 45).
- Plausível, sem prova por leitura: salto de rolagem do `focusLast` (`src/screens/Shell.tsx:208` chama `focus()` sem `preventScroll`). Precisa de teste manual.
- Deixadas para o auditor de interface (as regras existem, o efeito não foi medido aqui): barras de rolagem globais (`src/styles.css:190-194`), placeholder `#56707f` (`:27`), cores forçadas (`:428`), regra do PIN em janela baixa e área segura (`:399`, `:554`), pílula "Hoje" espremida, barra de título entre 360 e 400 px (`:417`).

## Observações menores, fora dos 15 itens

- "Atualizar" e "Reiniciar e atualizar" fecham por `electron/main.cjs:307` sem `flushSync` nem `saveCfg`. Nada se perde (as edições já estão no IndexedDB); só o PIN é pedido de novo.
- O indicador fica em "sincronizando" depois das saídas forçadas de `src/sync.ts:254` e `:259`.
- Um item nunca enviado, apagado de vez enquanto o primeiro envio dele está em andamento, volta no recebimento seguinte (janela de poucos décimos de segundo).
- Depois da meia-noite, a Agenda continua no dia anterior até tocar em "Hoje" (`src/store.ts:87`, `src/screens/Agenda.tsx:170`).
- `verifyAccount` em `src/sync.ts` não limita tentativas no app; o limite fica por conta do servidor.
- A regra "vale o mais novo" depende do relógio de cada aparelho. Um aparelho com a hora adiantada vence sempre.
- `fase1-mapa.md` diz que sair da conta limpa o aparelho, mas `logout` (`src/sync.ts:127-131`) mantém as anotações locais, como o aviso de `src/screens/Shell.tsx:458` informa.

## Sugestões que precisam do Vinicius

Estas ideias mudam o que o app promete ou como ele se comporta para o usuário. Nenhuma foi tratada como defeito.

1. Tela para restaurar as cópias `backup:<versão>`. Hoje o app guarda as 3 últimas, mas não há como usá-las sem ferramentas de desenvolvedor.
2. Mudar o servidor (coluna de versão ou função no banco) para gravação condicional, em vez da solução só no cliente descrita em L5. É mais robusto, mas exige migração no Supabase.
3. O que "Sair da conta" deve fazer com o diário local. Hoje ele fica no aparelho e é enviado para a próxima conta que entrar ali.
4. Tarefa em branco: esconder, apagar sozinha ou manter como está.
5. Trava por inatividade com o app na tela. Hoje o app só trava depois de sair da tela.
6. Virada do dia: voltar a Agenda para "Hoje" automaticamente depois da meia-noite ou manter o dia aberto.

## Confirmação

Confirmador da área lógica. Cada item foi conferido contra o código e, quando possível, reproduzido por um teste em `.auditoria/testes/` (Node puro ou `playwright-core` com Edge contra um Vite na porta 5191, com `*.supabase.co` bloqueado). Cada teste sai com código 1 quando o bug existe. Nenhum código do app foi alterado. Resultado: os 15 itens foram CONFIRMADOS, nenhum foi descartado; os ajustes de alcance estão nas observações.

| Id | Status | Como foi confirmado | Teste |
|---|---|---|---|
| L1 | CONFIRMADO | `mergeItem` de caderno apagado devolve conteúdo diferente do servidor a cada ciclo (5 reenvios em 5 ciclos) | `.auditoria/testes/logica-L1.mjs` |
| L2 | CONFIRMADO | No navegador com a ponte do Windows simulada, digitar na Agenda e apertar Ctrl+1 sem sair do campo perde a tarefa | `.auditoria/testes/logica-L2.mjs` |
| L3 | CONFIRMADO | Página que nasce com a janela escondida e volta 3 h depois abre sem PIN (mesmo cenário do T1 da técnica) | `.auditoria/testes/logica-L3.mjs` |
| L4 | CONFIRMADO | Destravado em `forgotPin`, 1 h fora: `unlocked` continua `true` | `.auditoria/testes/logica-L4.mjs` |
| L5 | CONFIRMADO | Simulação com o upsert cego: a edição de B some e não há cópia "(outra versão)". Depende de a janela de corrida acontecer | `.auditoria/testes/logica-L5.mjs` |
| L6 | CONFIRMADO | Simulação do laço de `range`: com 1.200 linhas e uma regravação entre páginas, a linha 500 nunca chega (1.199 de 1.200) | `.auditoria/testes/logica-L6.mjs` |
| L7 | CONFIRMADO | Com `put` de `backup:` falhando, a lista passa a apontar `backup:0.9.0` inexistente, a cópia `backup:0.6.0` é apagada e `appVersion` é gravado. Observação: `dbHooks.writeFailed` mostra um aviso genérico, então a falha não é totalmente muda, mas o estado fica corrompido | `.auditoria/testes/logica-L7.mjs` |
| L8 | CONFIRMADO | Depois de cancelar, o foco vai para `BODY`, e a `.titlebar` está dentro de `[inert]` | `.auditoria/testes/logica-L8.mjs` |
| L9 | CONFIRMADO por leitura | `resetDiary` não espera nem cancela `syncNow`, que continua com o `acc` antigo e grava `notes`, `items` e `lastPull` depois. Não foi montado um Supabase falso para provar | sem teste |
| L10 | CONFIRMADO | Outra conexão que abre o banco numa versão maior fica bloqueada (`onblocked`, sem sucesso em 4 s), porque o app não trata `versionchange`. O `onclose` não foi exercitado | `.auditoria/testes/logica-L10.mjs` |
| L11 | CONFIRMADO, com ressalva | Reproduzido só com verificação lenta (simulada em 800 ms): duas tentativas erradas contam 1. Em PC rápido a verificação termina antes da segunda tentativa, então o alcance real é celular fraco. A limpeza de 420 ms que apaga dígitos novos vem direto do código | `.auditoria/testes/logica-L11.mjs` |
| L12 | CONFIRMADO em parte | Depois de "Pronto" por teclado, o foco cai em `BODY`. Depois de "Editar" o foco vai para a área de texto no computador (só falha no celular ou com caderno vazio, como o item já dizia) | `.auditoria/testes/logica-L12.mjs` |
| L13 | CONFIRMADO | Aviso diz "amanhã" para destino que é daqui a 11 dias | `.auditoria/testes/logica-L13.mjs` |
| L14 | CONFIRMADO | Junção da lápide de limpeza automática com o texto de B devolve apagado, sem texto e sem cópia. Cenário raro, como o item já dizia | `.auditoria/testes/logica-L14.mjs` |
| L15 | CONFIRMADO, com ressalva | Com `recoveryPending` ligado, `init` abre `forgot` etapa 2 com o app travado, sem nova conferência. O teste força a flag; o evento real do Supabase não foi simulado. Muito raro na prática | `.auditoria/testes/logica-L15.mjs` |

Utilitário compartilhado dos testes novos: `.auditoria/testes/_util-logica.mjs` (Vite na porta 5191). O processo dessa porta foi encerrado ao fim.
