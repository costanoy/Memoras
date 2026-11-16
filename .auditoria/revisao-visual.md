# Revisão visual (antes x depois)

Revisor Visual, 16/11/2026. Comparação dos 74 pares de `.auditoria/prints/antes/` e `.auditoria/prints/depois/` (celular 390x844 e desktop 1440x900).

Método: diferença de pixels par a par (limiar 24 por canal) para separar o que mudou de verdade, depois leitura das imagens das telas que mudaram. Nada do app foi alterado; este arquivo é a única escrita.

## Resumo

- Melhorou: erros de login e cadastro junto do campo, "Mostrar senha", Voltar e aba marcada na Busca do celular, data inteira no editor do celular, calendário do celular com alvos de 44 px.
- Piorou: o convite "Suas anotações estão só neste aparelho" cresceu 24 px e ficou desalinhado no celular e no desktop (efeito colateral do `.link{min-height:44px}`). Aparece em quase todo print com a barra lateral.
- Ainda ruim: no cadastro com senha curta, três linhas empilhadas abaixo do campo (Mostrar senha, "Mínimo 8 caracteres", erro), com a dica e o erro dizendo a mesma coisa; o erro de senha fica separado do campo pelo "Mostrar senha".
- Sem mudança visual (0 pixel): onboarding (5 telas), Agenda do desktop (3), Agenda vazia, Ajustes e temas do celular, Resumão do celular, Cadernos vazio, editor de caderno do celular.
- Só a hora mudou (11:5x para 13:4x): Cadernos com dados, Resumão do desktop, editor de caderno do desktop, chave do PIN (a chave sorteada é outra).
- Artefatos do script, não do app: aviso "PIN ativado" aparece em `desktop-ajustes.png` do depois e não no antes (tempo de captura); `desktop-agenda-calendario.png` continua sem o calendário aberto (mesma falha de clique da Fase 1).

## Login e cadastro (`login-vazio`, `login-erro-email-invalido`, `login-erro-sem-senha`, `cadastro-senha-curta`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| login-vazio (celular e desktop) | Email, Senha, Entrar, rodapé. | Ganhou "Mostrar senha" abaixo da senha. Cartão 32 px mais alto. | Melhorou. O espaço em volta do "Mostrar senha" ficou folgado (18 + 44 + 18 px), mas não quebra. |
| login-erro-email-invalido | Erro em vermelho depois dos dois campos, longe do Email. Campo sem marca. | Erro logo abaixo do Email, campo com borda vermelha e foco. | Melhorou. |
| login-erro-sem-senha | Erro abaixo da Senha, campo sem marca. | Campo com borda vermelha, mas o erro vem depois do "Mostrar senha", a uns 80 px do campo. | Melhorou na marca do campo; a mensagem ficou mais longe do campo do que antes. Ainda ruim. |
| cadastro-senha-curta | Erro abaixo da Senha; "Esqueci minha senha" aparecia no cadastro. | Borda vermelha, "Mostrar senha", "Mínimo 8 caracteres", erro "A senha precisa ter pelo menos 8 caracteres." e "Esqueci minha senha" sumiu. Cartão 105 px mais alto no celular (585 para 690 de 844). | Melhorou em função; ainda ruim no visual: dica e erro repetidos em linhas seguidas e o campo longe do erro. |

## Esqueci minha senha (`esqueci-senha-passo-1`, `esqueci-senha-email-invalido`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| passo-1 | Cartão com campo, botão e "Voltar para o login". | Igual, com "Voltar para o login" um pouco mais baixo (link de 44 px). | Igual na prática. |
| email-invalido | Erro abaixo do campo, campo sem marca. | Mesmo lugar, campo com borda vermelha. | Melhorou. |

## PIN (`tela-pin`, `pin-errado`, `criar-pin-*`, `esqueci-pin`, `chave-do-pin`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| tela-pin, pin-errado, criar-pin (celular e desktop) | Teclado e link no rodapé. | Cartão 6 px mais alto, teclado 3 px acima. Link "Esqueci o PIN" e "Cancelar" no mesmo lugar. | Igual na prática. O critério de caber em 1366x768 não dá para conferir nestes prints (900 px de altura). |
| esqueci-pin | "Não tenho a chave" e "Voltar" próximos do botão. | Os dois links com mais ar (cartão uns 30 px mais alto). | Igual na prática, um pouco mais solto. |
| chave-do-pin | Sem aviso (caixinha desmarcada, sem clique). | Igual; só a chave sorteada mudou. | Igual. O aviso novo de "Marque que guardou a chave" não aparece porque o script não clica em Continuar. |

## Busca no celular (`busca-com-resultado`, `busca-sem-resultado`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| busca-com-resultado | Título "Busca" sem Voltar; nenhuma aba marcada. | Botão Voltar redondo ao lado do título; aba Diário marcada. | Melhorou. |
| busca-sem-resultado | Idem. | Idem, com o aviso "PIN ativado" ainda na tela (já estava no antes). | Melhorou. |

## Editor no celular (`editor-anotacao`, `editor-nova-anotacao-vazia`, `dialogo-lixeira-anotacao`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| editor-anotacao | Data cortada: "Hoje, 16 nov…". | "Hoje, 16 nov" inteira. | Melhorou. |
| dialogo-lixeira | Mesmo corte de data atrás do diálogo. | Data inteira; diálogo igual. | Melhorou. |

## Agenda no celular (`agenda-com-tarefas`, `agenda-calendario`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| agenda-com-tarefas | Lista de tarefas e observações. | Igual, mais o aviso "Segure uma tarefa para ver mais opções" (dica única, 5 s). | Igual; a dica é esperada (UI-U6). |
| agenda-calendario | Calendário com linhas de 40 px; 6 tarefas visíveis abaixo. | Linhas e setas de 44 px; calendário 34 px mais alto; 4 tarefas e meia visíveis; a dica cobre a última. | Melhorou no toque, com perda pequena de espaço. Aceitável. |
| ajustes-sem-conexao | Ajustes sem aviso. | A dica da Agenda ainda está na tela ao trocar para Ajustes (o aviso dura 5 s e é global). | Igual; efeito do tempo do script. |

## Diário: lista e convite (`principal-vazia`, `principal-muitos-dados`, `menu-contexto-anotacao` e todo print de desktop com a barra lateral)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| celular-principal-* | Convite com 68 px: frase e "Criar conta para sincronizar" juntos. | Convite com 92 px: vão maior entre a frase e o link, sobra embaixo; a lista desce 24 px (uma anotação a menos visível). | Piorou. |
| desktop-principal-*, desktop-ajustes, desktop-busca-*, desktop-tema-*, desktop-editor-*, desktop-menu-contexto, desktop-dialogo-lixeira | Convite com 68 px, link colado na frase. | Convite com 92 px, link solto no meio, 12 px de sobra embaixo; "Nova anotação" e a lista descem 24 px. | Piorou. No desktop não há ganho de toque que justifique. |
| menu-contexto-anotacao (celular e desktop) | Menu com 9 cores e 2 ações. | Mesmo desenho; só desceu junto com a lista. | Igual (as cores mantêm o círculo de 36 px). |

## Ajustes e temas (`ajustes`, `ajustes-pagina-inteira`, `tema-noite`, `tema-turquesa`)

| Print | Antes | Depois | Veredito |
|---|---|---|---|
| celular (todos) | Sem diferença de pixel. | Sem diferença de pixel. | Igual. |
| desktop (todos) | Convite de 68 px na barra lateral. | Só o convite de 92 px muda; o painel de Ajustes é igual. A barra de rolagem não aparece em nenhum dos dois prints, então UI-L4 não dá para julgar aqui. | Igual no painel; piora herdada do convite. |

## O que merece correção agora

1. Convite "só neste aparelho" (`src/screens/Shell.tsx` linha 95 e `src/styles.css` linha 399): o link passou a ocupar 44 px de altura dentro do cartão. Correção sugerida, só CSS: `.invite .link{margin:-12px 0}` (a área de toque continua com 44 px e o cartão volta aos 68 px). Conferir também "Ver todas" (`Shell.tsx` linha 110) e "Ver o Resumão" no Mini (`Agenda.tsx` linha 196), que usam a mesma classe e não estão nos prints.
2. Senha no login e no cadastro (`src/screens/Auth.tsx` linhas 72 a 74): pôr a dica "Mínimo 8 caracteres" e o erro de senha logo abaixo do campo e o "Mostrar senha" depois deles; apertar o "Mostrar senha" com margem vertical negativa (por exemplo `margin: '-8px 0'`) para não abrir 80 px entre o campo e o botão de envio.

## O que não deu para julgar pelos prints

- Área segura em celular baixo (UI-L1), alto contraste (UI-A3), barra de rolagem (UI-L4), pílula "Hoje" (UI-L3b e L3c), confirmação de "Sair da conta" (UI-U7), "Gerando…" (UI-U4b) e rótulos de espera: nenhum desses estados aparece nos 74 prints.
- `desktop-agenda-calendario.png`: o script não abre o calendário no desktop (falha antiga do script).
