# Auditoria de UI e UX do Memoras 1.1.4

Branch `melhorias-claude`, 16/11/2026. Somente leitura: nenhum arquivo do app foi alterado.

## Como foi feita

- Prints de `.auditoria/prints/antes/` (74 imagens: 37 `celular-*` em 390x844 e 37 `desktop-*` em 1440x900), abertos junto com o código de `src/screens`, `src/ui.tsx`, `src/App.tsx`, `src/TitleBar.tsx`, `src/styles.css`, `src/themes.ts`, `electron/main.cjs` e `site/confirmado.html`.
- Limites dos prints: foram tirados no navegador, então não mostram a barra de título do Windows, o Mini-Memoras, telas baixas (menos de 760 px de altura), alto contraste nem erros reais de rede. Os itens L1, U1, A3 e parte de L3 e L4 vêm da leitura do código e estão marcados assim. O print `desktop-agenda-calendario` saiu sem o calendário aberto.
- Gravidade: alta (atrapalha uma tarefa principal ou pode esconder conteúdo), média (atrito real, com saída), baixa (acabamento).
- Prefixos: L = layout, U = uso e fluxo, A = acessibilidade, T = texto.

## Resumo dos itens

| Id | Título | Gravidade |
|----|--------|-----------|
| L1 | Telas de entrada perdem a área segura em celulares baixos | alta |
| U1 | Confirmação aberta congela os botões da barra de título | média |
| U2 | Tarefa digitada se perde ao trocar de tela por atalho | média |
| A1 | Foco some depois da confirmação e ao alternar Editar e Pronto | média |
| L2 | Alvos de toque menores que 44 px no celular | média |
| U3 | Erros de login e cadastro longe do campo e sem marcação | média |
| U4 | Botão ocupado ou bloqueado só fica mais claro, sem explicar | média |
| U5 | No celular, Busca e Arquivo não têm Voltar nem aba marcada | média |
| U6 | Ações do celular escondidas no toque longo, sem pista | média |
| A2 | Calendário, pontos do PIN e passos do início pouco claros no leitor de tela | média |
| U7 | "Sair da conta" age na hora, sem confirmação | baixa |
| T1 | A mesma tela se chama "Ajustes" e "Configurações" | baixa |
| L3 | Cabeçalhos apertados: data cortada no editor do celular e pílula "Hoje" espremida | baixa |
| L4 | Barra de rolagem de desktop aplicada também no Android e no PWA | baixa |
| A3 | Alto contraste do Windows apaga marcas feitas só com fundo e sombra | baixa |

## Itens

### L1. Telas de entrada perdem a área segura em celulares baixos
- Gravidade: alta (Android com tela de até 760 px de altura útil).
- Evidência: `src/styles.css:94` define `.flow` com `padding:calc(32px + var(--sat)) 20px calc(32px + var(--sab))`. A regra de janela baixa em `src/styles.css:399-400` troca por `padding-top:12px;padding-bottom:12px`, sem somar `--sat` e `--sab`. O `index.html:5` usa `viewport-fit=cover`, então o conteúdo vai até a borda. Telas afetadas: `celular-tela-pin`, `celular-login-vazio`, `celular-onboard-passo-2`, `celular-chave-do-pin` (os prints têm 844 px de altura e por isso não mostram o defeito; leitura de código).
- Como reproduzir: abrir o PIN ou o login num Android pequeno (360x640, por exemplo) ou com o teclado aberto. O topo do cartão fica a 12 px da borda, por baixo da barra de status ou do recorte da câmera, e o rodapé encosta na barra de gestos.
- O que mudar: na regra `@media (max-height:760px)`, usar `padding-top:calc(12px + var(--sat));padding-bottom:calc(12px + var(--sab))`. No Windows as duas variáveis valem 0, então nada muda lá.
- Critério de pronto: em 360x640 com `--safe-area-inset-top: 32px` e `--safe-area-inset-bottom: 24px` simulados, nenhuma parte do cartão do PIN, do login e do início fica dentro dessas faixas, e o teclado do PIN continua cabendo sem rolar em 1366x768.

### U1. Confirmação aberta congela os botões da barra de título
- Gravidade: média (só Windows).
- Evidência: `src/App.tsx:80-81`: `<div className="contents" inert={!!c}>` envolve `<TitleBar />`. Tela do diálogo: `desktop-dialogo-lixeira-anotacao` (print de navegador, sem barra de título; leitura de código).
- Como reproduzir: no app de Windows, abrir uma anotação, clicar em Lixeira e, com a pergunta na tela, tentar minimizar, maximizar, fechar, fixar no topo ou trocar para o Mini. Nada responde até cancelar.
- O que mudar: tirar `<TitleBar />` de dentro do bloco `inert` (o resto continua inerte). Os botões que mudam o conteúdo (Mini, Atualizar) podem ficar desligados enquanto `s.confirm` existir, mas minimizar, maximizar e fechar precisam funcionar.
- Critério de pronto: com a confirmação aberta, minimizar, maximizar e fechar funcionam com mouse; Tab continua preso entre Cancelar e Mover ou Apagar; Esc ainda fecha a pergunta.

### U2. Tarefa digitada se perde ao trocar de tela por atalho
- Gravidade: média (perda de texto, só no teclado do Windows).
- Evidência: `src/screens/Agenda.tsx:113-114`: o campo "Adicionar tarefa" guarda o texto em estado local e só grava no Enter ou no `onBlur`. Os atalhos em `src/App.tsx:32-40` (Ctrl+N, Ctrl+F, Ctrl+1/2/3) e o botão lateral do mouse no Mini (`src/App.tsx:49`) trocam de tela sem tirar o foco do campo, e o componente é desmontado com o texto dentro. Tela: `desktop-agenda-com-tarefas`.
- Como reproduzir: na Agenda, digitar "Comprar pão" em "Adicionar tarefa" e, sem Enter, apertar Ctrl+1. Voltar com Ctrl+3: a tarefa não existe.
- O que mudar: gravar na saída do componente. Em `NewTask`, manter o texto atual num `ref` e, na limpeza do `useEffect` de desmontagem, chamar `addTask(k, texto)` se houver texto. Isso cobre atalhos, botão do mouse e a troca para o Mini de uma vez. Conferir a mesma situação no campo de Observações do dia.
- Critério de pronto: teste automatizado (ou manual) digita no campo, dispara Ctrl+1, Ctrl+F, Ctrl+N e Ctrl+Shift+M, volta à Agenda e encontra a tarefa gravada uma única vez.

### A1. Foco some depois da confirmação e ao alternar Editar e Pronto
- Gravidade: média (teclado e leitor de tela).
- Evidência: (a) `src/App.tsx:61-73` só devolve o foco se quem abriu a pergunta ainda existir. Pelo menu de contexto, `src/screens/Menu.tsx:87` fecha o menu antes de chamar `askTrash` (`Menu.tsx:110`), então o "quem abriu" já saiu da tela; no toque, o menu nem guarda a origem (`Menu.tsx:29`). (b) `src/screens/Docs.tsx:221-222`: os botões Pronto e Editar têm `key` diferentes, o botão focado é desmontado e o foco cai no `body` (`stopEdit` usa `focus: false`, `Docs.tsx:168`). Prints: `desktop-menu-contexto-anotacao`, `desktop-dialogo-lixeira-anotacao`, `desktop-caderno-editor-novo`.
- Como reproduzir: (a) focar uma anotação da lista, abrir o menu com a tecla de menu, escolher "Mover para a lixeira" e apertar Esc: o próximo Tab recomeça do início da janela. (b) num caderno, ir de Tab até Editar e apertar Enter, depois Ctrl+Enter: o foco não está em nenhum botão.
- O que mudar: (a) o menu passa para a confirmação o elemento de origem (o item da lista) e, se ele não existir mais ao fechar, o foco vai para o item vizinho ou para o painel principal (`tabIndex={-1}`). (b) usar a mesma `key` nos dois botões (ou focar o botão novo num efeito depois da troca) quando a troca veio do teclado.
- Critério de pronto: depois de cancelar ou confirmar pelo menu de contexto, `document.activeElement` é um elemento visível da lista; depois de Editar ou Pronto pelo teclado, o foco está no botão que ficou no lugar (ou no texto, ao entrar em edição).

### L2. Alvos de toque menores que 44 px no celular
- Gravidade: média.
- Evidência: caixinha da tarefa `.tick` 26x26 (`src/styles.css:274`) colada na alça `.grip` de 24x36 (`styles.css:283`); dias do calendário com 38 px de altura e setas de 40 px (`styles.css:187-188`); cores do menu de contexto com 36 px (`styles.css:298`); links "Cancelar", "Usar a digital", "Esqueci o PIN", "Voltar" com cerca de 34 px de altura (`styles.css:72`; `src/screens/Pin.tsx:62-64`); caixinha do Resumão com 24 px (`styles.css:311`). O botão `.invx` já resolve isso com `::after{inset:-8px}` (`styles.css:389`). Prints: `celular-agenda-com-tarefas`, `celular-agenda-calendario`, `celular-menu-contexto-anotacao`, `celular-tela-pin`, `celular-resumao`.
- Como reproduzir: no celular, tentar marcar uma tarefa: é fácil pegar a alça de arrastar ou o texto. No calendário, tocar num dia da última linha.
- O que mudar: só a área de toque, sem mudar o desenho. Em `.wrap.m` (ou `@media (pointer:coarse)`): `.tick` e a caixinha do Resumão com `::after` de `inset:-9px`; alça com 32 px de largura útil, dividindo o espaço com a caixinha sem sobrepor; `.day` com 44 px de altura e setas com 44 px; cores do menu com área de 44 px; `.link` com `min-height:44px` e `display:inline-flex;align-items:center`.
- Critério de pronto: medindo com `getBoundingClientRect` (incluindo o `::after`) em 390x844, todos esses controles têm pelo menos 44x44 px e as áreas da alça e da caixinha não se cruzam; os prints novos ficam visualmente iguais aos de antes.

### U3. Erros de login e cadastro longe do campo e sem marcação
- Gravidade: média.
- Evidência: `src/screens/Auth.tsx:61` mostra uma única mensagem depois dos dois campos; os campos (`Auth.tsx:55-59`) não ganham `aria-invalid`, `aria-describedby` nem borda de erro. Em `celular-login-erro-email-invalido` o texto "Digite um email válido." aparece abaixo do campo Senha. A regra de 8 caracteres só existe no placeholder (`Auth.tsx:59`), que some ao digitar (`celular-cadastro-senha-curta`). Não há como ver a senha digitada e o cadastro tem um campo só de senha. O link "Esqueci minha senha" aparece também na aba "Criar conta" (`Auth.tsx:66`, visível em `celular-cadastro-senha-curta`).
- Como reproduzir: em Criar conta, digitar um email sem arroba e tocar em Criar conta; depois digitar uma senha de 3 letras.
- O que mudar: mostrar a mensagem logo abaixo do campo com problema, ligar com `aria-describedby`, marcar `aria-invalid` e a borda na cor de `.err`, e levar o foco para esse campo. Deixar "Mínimo 8 caracteres" como texto fixo abaixo da senha no cadastro. Acrescentar um botão "Mostrar senha" (44 px, `aria-pressed`). Esconder "Esqueci minha senha" na aba Criar conta.
- Critério de pronto: cada erro de validação aparece junto do seu campo, o campo fica focado e anunciado como inválido; a regra de tamanho continua visível com a senha digitada; dá para conferir a senha antes de enviar; os prints `login-erro-*` e `cadastro-senha-curta` refeitos mostram isso nos dois tamanhos.

### U4. Botão ocupado ou bloqueado só fica mais claro, sem explicar
- Gravidade: média.
- Evidência: `.off{opacity:.45}` (`src/styles.css:67`) é o único sinal. Em `src/screens/Auth.tsx:63` o botão continua "Entrar" ou "Criar conta" durante a chamada, sem `disabled` nem `aria-busy`; idem "Gerar nova chave" (`src/screens/Shell.tsx:473`) e os botões de `Forgot.tsx`. Em `src/screens/Keys.tsx:66` e `:92`, "Continuar" fica pálido com `aria-disabled` e o clique simplesmente retorna (`Keys.tsx:43`, `:76`). Print: `celular-chave-do-pin`.
- Como reproduzir: na tela da chave, tocar em Continuar sem marcar "Guardei a chave": nada acontece. No login com internet lenta, tocar em Entrar: o botão só clareia.
- O que mudar: durante a espera, trocar o rótulo ("Entrando…", "Criando conta…", "Gerando…"), pôr `aria-busy` e ignorar novos cliques. No "Continuar" bloqueado, ao clicar, destacar a caixinha "Guardei a chave" e mostrar uma linha com `role="status"`: "Marque que guardou a chave para continuar."
- Critério de pronto: nenhum botão de envio fica sem texto de andamento enquanto `busy`; clicar em "Continuar" bloqueado sempre produz uma mensagem visível e anunciada.

### U5. No celular, Busca e Arquivo não têm Voltar nem aba marcada
- Gravidade: média.
- Evidência: o botão Voltar dessas telas só existe no Mini (`src/screens/Shell.tsx:282` e `:319`, `{s.mini && ...}`); `TAB_OF` (`Shell.tsx:515`) não tem entrada para `search` nem para a prateleira, então nenhuma aba fica acesa; os botões da barra (`Shell.tsx:593`) não têm `aria-current`. Prints: `celular-busca-sem-resultado`, `celular-busca-com-resultado`.
- Como reproduzir: no celular, tocar na lupa do Diário. A tela de busca abre sem botão de voltar e sem aba ativa; a saída é adivinhar que "Diário" volta ou usar o voltar do Android (no PWA do iPhone nem isso).
- O que mudar: mostrar o Voltar quando `onePane(s)` (celular e Mini), como o editor já faz (`Shell.tsx:222`); marcar "Diário" como aba atual em Busca, Arquivo e Lixeira; pôr `aria-current="page"` na aba ativa.
- Critério de pronto: em 390x844, Busca, Arquivo e Lixeira mostram Voltar de 44 px que leva à tela anterior, a aba Diário aparece ativa e o leitor de tela anuncia a aba atual.

### U6. Ações do celular escondidas no toque longo, sem pista
- Gravidade: média.
- Evidência: no celular, "Amanhã" e apagar tarefa só existem no menu de toque longo (`src/screens/Agenda.tsx:97-98`, `!mobile &&`); cor, fixar, arquivar e lixeira das listas também (`src/screens/Menu.tsx`). Nada na tela avisa que o toque longo existe: `celular-agenda-com-tarefas`, `celular-principal-muitos-dados`, `celular-cadernos-com-dados` (o menu só aparece em `celular-menu-contexto-anotacao`).
- Como reproduzir: dar o celular a quem nunca usou o app e pedir para apagar uma tarefa ou passar para amanhã.
- O que mudar (sem mexer no visual das listas): uma dica única, guardada em `prefs`, na primeira vez que houver itens: toast "Segure um item para ver mais opções" na lista e na Agenda. Na tarefa em edição, apagar o texto todo já apaga a tarefa (`Agenda.tsx:96`); vale dizer isso na dica da Agenda. Um botão "mais" visível em cada linha está nas sugestões para o Vinicius.
- Critério de pronto: num perfil novo, a dica aparece uma vez em cada lugar e não volta; o teste de primeiro uso encontra o texto; nenhuma tela ganha elemento fixo novo.

### A2. Calendário, pontos do PIN e passos do início pouco claros no leitor de tela
- Gravidade: média.
- Evidência: `src/ui.tsx:101` usa as letras D S T Q Q S S como cabeçalho, sem nome completo; os dias (`ui.tsx:123-124`) só têm `aria-label` quando "tudo feito", então o leitor diz apenas "16, botão", sem mês e sem avisar que o dia tem anotação ou tarefa (a marca é o ponto de `src/styles.css:196`). Os pontos do PIN (`src/screens/Pin.tsx:49`) não têm texto: quem não vê não sabe quantos dígitos já entraram. As barras de progresso do início (`src/screens/Onboard.tsx:39`) são `div` sem texto. Prints: `celular-agenda-calendario`, `celular-tela-pin`, `celular-onboard-passo-2`.
- Como reproduzir: com TalkBack ou Narrador, percorrer o calendário, digitar dois dígitos do PIN e avançar no início.
- O que mudar: `aria-label` completo em cada dia ("16 de novembro, com anotações", "tudo feito", "hoje"); `abbr` ou `aria-label` com o nome do dia da semana nas letras; nos pontos, `role="img"` com `aria-label="2 de 4 dígitos"` (sem anunciar os números); nas barras, `role="progressbar"` com `aria-valuenow`, `aria-valuemax` e `aria-label="Passo 2 de 4"`.
- Critério de pronto: a árvore de acessibilidade (por exemplo `page.accessibility.snapshot()` do Playwright) mostra esses nomes; nenhum dígito do PIN aparece em texto.

### U7. "Sair da conta" age na hora, sem confirmação
- Gravidade: baixa.
- Evidência: `src/screens/Shell.tsx:458`: o clique chama `logout()` e só mostra um toast, sem Desfazer. Para voltar é preciso digitar email e senha de novo. O botão fica perto de outras ações da seção Conta em `celular-ajustes-pagina-inteira` e `desktop-ajustes-pagina-inteira`.
- Como reproduzir: Ajustes, seção Conta, tocar em "Sair da conta" por engano.
- O que mudar: usar o diálogo de confirmação que já existe (`s.confirm`), com o texto "Sair da conta neste aparelho? As anotações continuam aqui, mas param de sincronizar até você entrar de novo." e botões Cancelar e Sair. Com o app travado pelo PIN nada muda (a regra de `WHILE_LOCKED` e `lockedGuard` continua valendo).
- Critério de pronto: um toque em "Sair da conta" abre a pergunta com foco em Cancelar; só o segundo toque encerra a sessão; Esc cancela.

### T1. A mesma tela se chama "Ajustes" e "Configurações"
- Gravidade: baixa.
- Evidência: abas e navegação dizem "Ajustes" (`src/screens/Shell.tsx:28`, `:185`, `:513`), o título da tela diz "Configurações" (`Shell.tsx:392`, `:397`) e o início diz "nas configurações" (`src/screens/Onboard.tsx`). Em `celular-ajustes` a aba "Ajustes" fica acesa sob o título "Configurações"; idem `desktop-ajustes`.
- Como reproduzir: abrir a aba Ajustes no celular.
- O que mudar: escolher um nome só. A troca menor é manter "Ajustes" (cabe na aba) e mudar o título da tela e a frase do início ("Dá para mudar depois nos Ajustes"). Conferir com `design_handoff_memoras/` qual dos dois é o texto final antes de trocar.
- Critério de pronto: `grep -ri "configura" src` não encontra texto de tela, ou o contrário, se o nome escolhido for "Configurações".

### L3. Cabeçalhos apertados: data cortada no editor do celular e pílula "Hoje" espremida
- Gravidade: baixa.
- Evidência: (a) em `celular-editor-anotacao` a data aparece como "Hoje, 16 de nov…": o texto de `src/screens/Shell.tsx:215` divide a linha com Voltar e três botões de 44 px (`Shell.tsx:222-229`). (b) `src/styles.css:409-412`: quando o painel tem menos de 600 px, toda `.ibar .pill:not(.go)` vira um círculo de 44 px sem padding, mas a pílula "Hoje" da Agenda é texto puro, sem `.plbl` (`src/screens/Agenda.tsx:178`). A parte (b) vem do código: nos prints da Agenda o dia aberto é hoje e a pílula não aparece.
- Como reproduzir: (a) abrir qualquer anotação de hoje no celular. (b) no Windows, estreitar a janela até o painel ficar com menos de 600 px, abrir a Agenda e ir para outro dia.
- O que mudar: (a) em `.wrap.m`, usar a forma curta da data quando a linha não couber ("Hoje, 16 nov") ou deixar o título quebrar em duas linhas no lugar do subtítulo. (b) excluir a pílula de texto da regra (uma classe `txt` e `:not(.txt)`), mantendo a altura de 44 px.
- Critério de pronto: em 390x844 a data do editor aparece inteira em `celular-editor-anotacao`; com o painel em 520 px a palavra "Hoje" aparece inteira, com pelo menos 12 px de respiro de cada lado.

### L4. Barra de rolagem de desktop aplicada também no Android e no PWA
- Gravidade: baixa.
- Evidência: `src/styles.css:190-194` define `::-webkit-scrollbar` (8 px, com trilho e cor fixa `rgba(12,60,90,...)`) sem restringir ao Windows. No WebView do Android isso troca a barra sobreposta do sistema por uma barra que ocupa espaço. A cor fixa também não acompanha os temas escuros (`celular-tema-noite`, `desktop-tema-noite`). Os prints de celular foram feitos no Chromium de mesa, então não provam o efeito no aparelho; telas com lista longa: `celular-principal-muitos-dados`, `celular-ajustes-pagina-inteira`.
- Como reproduzir: no APK, rolar o Diário com muitas anotações e observar a faixa de 8 px à direita.
- O que mudar: envolver as cinco regras em `@media (hover:hover) and (pointer:fine)` e trocar a cor fixa por uma variável do tema (por exemplo derivada de `--ink2`).
- Critério de pronto: no Android e no PWA a rolagem volta a usar a barra do sistema; no Windows nada muda no tema Turquesa e a barra fica visível no tema Noite.

### A3. Alto contraste do Windows apaga marcas feitas só com fundo e sombra
- Gravidade: baixa (leitura de código; não há print em alto contraste).
- Evidência: o bloco `@media (forced-colors: active)` em `src/styles.css:428-439` cobre o interruptor, os pontos do PIN e os estados escolhidos, mas não: o ponto de "dia com conteúdo" (`.day.has::after`, `styles.css:196`), o ponto de estado da sincronização (`.sdot`, `styles.css:145`), o destaque do item com menu aberto e o foco da tarefa, ambos por `box-shadow` (`styles.css:154`, `:423`), as barras de progresso do início (fundo inline em `src/screens/Onboard.tsx:39`) e os botões principais `.gel`, que ficam sem contorno quando o gradiente some. Telas: `desktop-agenda-com-tarefas`, `desktop-onboard-passo-2`, `desktop-ajustes`.
- Como reproduzir: ligar um tema de contraste do Windows (ou `forcedColors: 'active'` no Playwright) e abrir Agenda, Ajustes e o início.
- O que mudar: dentro do bloco, dar `border:1px solid ButtonText` a `.gel`, `.soft` e `.pill`; `background:CanvasText` (com `forced-color-adjust:none`) a `.day.has::after`, `.sdot` e às barras do início (trocar o estilo inline por classe); `outline:2px solid Highlight` para `.item.ctxon`, `.task.ctxon` e `.task:focus-within`.
- Critério de pronto: prints com `forcedColors: 'active'` mostram contorno em todos os botões, a marca dos dias com conteúdo, o passo atual do início e o foco da tarefa.

## Dicas da revisão anterior: o que se confirmou

| Dica | Situação | Onde ficou |
|------|----------|-----------|
| Diálogo não devolve o foco | Confirmada | A1 |
| Wrapper `inert` congela a barra de título | Confirmada | U1 |
| `::-webkit-scrollbar` global afeta Android e PWA | Confirmada no código | L4 |
| Regra de janela curta do PIN perde a área segura | Confirmada (vale para todas as telas `.flow`) | L1 |
| Atalhos trocam de tela sem gravar o campo focado | Confirmada | U2 |
| Editar e Pronto perdem o foco | Confirmada | A1 |
| Cabeçalho só com ícones aperta a pílula "Hoje" | Confirmada no código | L3 |
| Defeitos em forced-colors | Parcial (o básico já está coberto) | A3 |
| `focusLast` ainda dá pulo de rolagem | Plausível: `src/screens/Shell.tsx:208` chama `el.focus()` sem `preventScroll`. Não deu para ver nos prints; fica fora dos 15. Correção de uma linha: `el.focus({ preventScroll: true })` e rolar só se o cursor estiver fora da vista |
| Piscar de tema na abertura | Plausível fora do Windows: o tema só é aplicado depois de ler o IndexedDB (`init()` em `src/store.ts`), e o `index.html` começa em turquesa. No Windows o `electron/main.cjs` já abre a janela com a cor salva. Fica fora dos 15; solução possível: guardar a chave do tema também em `localStorage` e aplicar num script no `index.html` |
| Placeholder `#56707f` sem contraste | Não confirmada: sobre os campos claros o contraste passa de 4,5:1. O que existe é a cor fixa, que não acompanha os temas (`src/styles.css:27`); conferir junto com L4 |
| Barra de título cortada entre 360 e 400 px | Não confirmada: largura mínima de 360 px, título some abaixo de 480 px e a pílula de atualização tem reticências (`src/styles.css:415-417`). Sem print da barra, vale um teste manual |
| Auto-reload após crash pula o PIN | Não é assunto de UI. Pelo código, o reload (`electron/main.cjs:221-230`) segue a mesma tolerância de `awayAt` da volta ao app; o comentário diz que o PIN é pedido de novo, o que só vale fora da tolerância. Repassar ao auditor de segurança |
| Página `site/confirmado.html` | Sem defeito relevante: texto em pt-BR, estado de erro, botão de fechar com aviso quando o navegador não deixa |

## Pontos que estão bons (para não mexer)

- Telas vazias orientam: `celular-principal-vazia`, `celular-agenda-vazia`, `celular-cadernos-vazio`, `celular-busca-sem-resultado`.
- Apagar tarefa tem Desfazer no toast; apagar anotação ou caderno passa pela lixeira com confirmação e foco em Cancelar.
- Botões principais (`.round`, `.pill`, teclas do PIN) têm 44 px ou mais; `:focus-visible` existe para botões e links; há blocos para movimento reduzido e transparência reduzida.

## Sugestões que precisam do Vinicius

Mexem na cara ou na proposta do app, então não entram como correção.

1. Placeholder do título ("Título (opcional)", "Título do caderno") em 30 px e negrito parece conteúdo de verdade e pesa mais que o texto da anotação em `celular-editor-nova-anotacao-vazia` e `celular-caderno-editor-novo`. Ideia: placeholder mais leve (peso 500, mais transparente), mantendo o título digitado como está.
2. Botão "mais" (três pontos) visível em cada linha de lista e de tarefa no celular, como alternativa ao toque longo (complementa U6, mas muda o desenho das listas).
3. Rótulos nos ícones do topo do Diário no celular (Busca, Arquivo, Calendário em `celular-principal-muitos-dados`) e na navegação de baixo da barra lateral do desktop, onde só o item ativo mostra o nome (`desktop-principal-muitos-dados`).
4. Nome único para a tela de preferências: "Ajustes" ou "Configurações" (T1 propõe "Ajustes", mas a escolha é de identidade).
5. Segundo campo "Repita a senha" no cadastro, em vez de só o botão de mostrar a senha (U3): mais seguro contra erro de digitação, um passo a mais no fluxo.
6. Aviso visível de "sem conexão" nos Ajustes: `celular-ajustes-sem-conexao` é igual ao print normal na parte visível; se a ideia for o app parecer calmo mesmo offline, fica como está.

## Confirmação

Conferido em 16/11/2026 contra o código atual (e testes em `.auditoria/testes/`, rodando o app no Vite com o Supabase bloqueado). Todos os 15 itens confirmados; nenhum descartado.

| Id | Status | Como foi confirmado |
|----|--------|---------------------|
| L1 | CONFIRMADO | Teste `.auditoria/testes/ui-ux-L1.mjs` (sai 1): em 360x640 com `--sat` 32px e `--sab` 24px o `.flow` fica com 12px de padding em cima e embaixo. |
| U1 | CONFIRMADO | Teste `.auditoria/testes/ui-ux-U1.mjs` (sai 1): com a confirmação aberta, o botão "Fechar" da barra de título está dentro de `[inert]`. |
| U2 | CONFIRMADO | Teste `.auditoria/testes/ui-ux-U2.mjs` (sai 1): texto em "Adicionar tarefa" + Ctrl+1 + Ctrl+3 e a tarefa não existe. |
| A1 | CONFIRMADO | Leitura de código: `Menu.tsx:87` fecha o menu antes de `askTrash`; `Docs.tsx:221-222` usa `key` diferentes nos botões Editar e Pronto (o React remonta o botão e o foco cai no body). Sem teste automatizado. |
| L2 | CONFIRMADO | Tamanhos conferidos em `styles.css` (274, 283, 187-188, 298, 72, 311); não há `::after` de 44 px nesses controles. |
| U3 | CONFIRMADO | `Auth.tsx:55-67`: mensagem única depois dos campos, sem `aria-invalid`/`aria-describedby`; regra de 8 caracteres só no placeholder; "Esqueci minha senha" fica em Criar conta. |
| U4 | CONFIRMADO | `Auth.tsx:63` só troca a classe `off`; `Keys.tsx:66` usa `aria-disabled` e o clique retorna sem aviso. |
| U5 | CONFIRMADO | `Shell.tsx:282` e `:319` mostram Voltar só com `s.mini`; `TAB_OF` (`Shell.tsx:515`) não tem `search`; os botões da barra (`Shell.tsx:593`) não têm `aria-current`. |
| U6 | CONFIRMADO | `Agenda.tsx:97-98` com `!mobile &&`; nenhuma dica de toque longo no código. |
| A2 | CONFIRMADO | `ui.tsx:101` (letras soltas), `ui.tsx:123-124` (`aria-label` só em "tudo feito"), `Pin.tsx:49` e `Onboard.tsx:39` (sem texto ou `role`). |
| U7 | CONFIRMADO | `Shell.tsx:458`: `logout()` direto, sem `s.confirm`. |
| T1 | CONFIRMADO | `grep configura` em `src`: "Configurações" em `Shell.tsx:392/397` e `Onboard.tsx:46/56`, "Ajustes" nas abas. |
| L3 | CONFIRMADO | (b) Teste `.auditoria/testes/ui-ux-L3.mjs` (sai 1): painel de 366 px, pílula "Hoje" com 44 px e padding 0, texto de 42 px dentro de 42 px, sem respiro. (a) por leitura de código e print. |
| L4 | CONFIRMADO | `styles.css:190-194` sem `@media` e com cor fixa. Efeito no WebView do Android não testável aqui. |
| A3 | CONFIRMADO | O bloco `forced-colors` de `styles.css:428-439` não cobre os itens citados (leitura de código). |

Nota: os testes `ui-ux-*.mjs` usam `.auditoria/testes/_util-uiux.mjs` (Vite na porta 5192) e saem com código 1 quando o defeito existe.
