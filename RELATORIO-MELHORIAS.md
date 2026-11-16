# Relatório das melhorias do Memoras (branch melhorias-claude)

Escrito para o Vinicius, em linguagem simples. Versão base: 1.1.4. São 55 commits em `melhorias-claude` a mais que o `origin/main`. Nada foi enviado ao GitHub, ao Supabase real nem ao app instalado, e nenhum release foi feito.

## 1. O que foi melhorado

### Sincronização
- Caderno apagado deixou de ser reenviado a cada sincronização (LOG-L1). Antes, cada ciclo regravava a lápide com a hora atual e ela nunca "fechava".
- O recebimento de dados não pula mais linhas quando outra gravação acontece no meio (LOG-L6). Agora usa um cursor pela data de atualização.
- Edição de caderno não se perde mais quando dois aparelhos sincronizam juntos (LOG-L5). O envio confere se o servidor mudou; se mudou, o texto do outro aparelho vira "(outra versão)" em vez de ser sobrescrito.
- O ciclo para sem gravar se você sair da conta ou apagar o diário no meio (LOG-L9a).
- Link de "nova senha" que chega durante o carregamento espera o app abrir e respeita a trava do PIN (LOG-L15a).
- Cadastro de uma conta cujo cofre já existe segue como login normal, inclusive o passo da chave (R4).
- Linha grande demais (acima de 1 MiB cifrada) é pulada com o aviso "Caderno grande demais para sincronizar", e o resto continua sendo enviado (R2).
- Conflito no envio só repete na hora quando a linha do servidor foi aplicada; senão espera o ciclo normal de 60 s, sem martelar o servidor (R1).

### Trava e dados
- Recarga com a janela escondida deixou de abrir sem PIN (LOG-L3).
- A cópia de segurança de versão nova não falha mais em silêncio; só grava a versão nova depois que a cópia deu certo (LOG-L7). Continuam as 3 últimas cópias.
- O app trava também na tela "Esqueci o PIN" aberta pelos Ajustes, e ao destravar volta à tela de origem (LOG-L4, R5).
- Banco local trata bloqueio e fechamento por outra janela. Se outra janela atualizou o app, aparece aviso; se só está bloqueado, o app avisa e continua esperando (LOG-L10, R6).
- A limpeza automática não apaga mais, em outros aparelhos, item vazio que já foi enviado (LOG-L14).
- Tentativas de PIN ao mesmo tempo agora contam todas (LOG-L11).
- O aviso "Tarefa passada para amanhã" só aparece quando é mesmo amanhã (LOG-L13).
- "Apagar todo o diário" troca a tela na hora e só depois apaga (LOG-L9b). O link de senha não abre a troca de senha com o app travado (LOG-L15b).
- O esquema do Supabase foi endurecido no arquivo, e a criação do cofre não sobrescreve mais um cofre existente (TEC-T11).

### Telas e acessibilidade
- Tarefa digitada não se perde mais ao trocar de tela sem tirar o foco (LOG-L2). Os contadores da Agenda contam só tarefas com texto.
- Confirmações devolvem o foco e a barra de título deixa de ficar travada (LOG-L8). O botão Pronto devolve o foco ao Editar (LOG-L12).
- Login, cadastro e "Esqueci a senha": erro junto do campo com borda vermelha, "Mostrar senha" e rótulos de espera (UI-U3, UI-U4a, VIS-2).
- Chaves: aviso e caixinha em destaque ao continuar sem marcar que guardou (UI-U3).
- "Gerar nova chave" mostra "Gerando..." e ignora cliques repetidos (UI-U4b). "Sair da conta" pede confirmação (UI-U7).
- Calendário, pontos do PIN e passos do início ficam claros para leitor de tela (UI-A2).
- Alto contraste do Windows mantém bordas e marcas (UI-A3). Barra de rolagem fina só para mouse (UI-L4).
- Pílula "Hoje" da Agenda legível no painel estreito (UI-L3b e L3c).
- O convite "só neste aparelho" voltou aos 68 px mantendo o toque de 44 px (VIS-1).

### Celular
- Telas de entrada respeitam a área segura em celulares baixos (UI-L1).
- Alvos de toque de 44 px na caixinha, alça, calendário, cores do menu e links (UI-L2).
- Busca e Arquivo ganham Voltar e a aba Diário fica marcada (UI-U5).
- Dicas de toque longo, uma vez por aparelho (UI-U6). Data do editor sem corte (UI-L3a).

### Windows
- Barra de título e foco da confirmação (LOG-L8), alto contraste (UI-A3) e o release mais seguro (ver abaixo). O processo principal do Electron não foi alterado.

### Android
- O FileProvider deixou de expor a raiz do armazenamento externo (TEC-T10). A barra de rolagem de mouse não vale mais no Android (UI-L4). O CSP não foi ligado no Android (ver Pendências).

### Release e testes
- `npm run release` confere Git limpo, commit igual ao `main` do GitHub e versão ainda não publicada (TEC-T8, NOVO-2).
- Testes automáticos com vitest para cifra, junção e migração, com formatos das versões 1.0.4, 1.1.1, 1.1.2 e 1.1.3 (TEC-T14, NOVO-1). O release só sai com eles verdes.
- Tela de erro com "Abrir de novo" no lugar da tela em branco (NOVO-3).
- CSP em todo build de produção, menos o do Android, e nunca no servidor de desenvolvimento (TEC-T9).
- O tema não pisca mais turquesa ao abrir com outro tema (TEC-T13).

## 2. Bugs encontrados

As três auditorias (lógica, UI/UX e técnica) somaram 45 itens. Todos foram CONFIRMADOS por teste ou leitura de código; nenhum caiu na confirmação.

Confirmados e corrigidos:
- Lógica L1 a L15, UI/UX (U1 a U7, L1 a L4, A2, A3) e técnicos T1 a T4, T7 a T14. Detalhes na seção 1.
- Revisão de código (opus): R1 a R6, todos reais e corrigidos. A observação sobre um comentário enganoso no `init` não é bug.
- Revisão visual: VIS-1 (convite ficou maior) e VIS-2 (erro longe do campo da senha), corrigidos, sem print de conferência depois da correção (o Vite abriu em branco no painel do navegador).

Adiados (e por quê):
- TEC-T5, cada tecla re-renderiza o app e abre uma transação: mexe em vários arquivos e, se errar, perde texto digitado; não há lentidão relatada.
- TEC-T6, pacote único de 590 kB: o app é local e abre do disco; o ganho é pequeno.
- Observações menores da lógica (atualização sem esperar a sincronização, indicador preso, Agenda depois da meia-noite): impacto baixo.

Descartados (e por quê):
- TEC-T15 (exports mortos, ativos duplicados, avisos de dependências): limpeza sem efeito para quem usa. Apagar `memoras-site.zip` e `portfolio-preview/` depende de você.
- Parte opcional de TEC-T1 em `electron/main.cjs`: a correção em `store.ts` resolve e mexer no processo principal traria risco sem ganho.
- Escrita condicional por função SQL (parte do LOG-L5): exige mudar o banco real; a versão no cliente já cobre os aparelhos atualizados.

Resultado dos testes finais: tsc 0, vitest 16 de 16, build de produção e de desktop 0. Dos 36 testes de auditoria, 31 saem 0 e 5 saem 1 por motivo esperado: logica-L5, L6 e L14 antigos simulam o comportamento velho (têm substitutos em 0) e tecnica-T5 e T6 são os itens adiados. O tecnica-T13 saiu 0 em vez de 1: o tema final não pisca, então a expectativa do plano só ficou desatualizada.

## 3. Telas que mudaram (antes e depois)

Os prints ficam só no seu computador, na pasta `.auditoria/prints/`, fora do Git. As imagens abaixo só aparecem num visualizador aberto na pasta do projeto. Sem diferença de pixel: onboarding, Agenda do desktop, Ajustes e temas do celular, Resumão do celular, Cadernos vazio e editor de caderno do celular.

| Tela | Antes | Depois |
|---|---|---|
| Login: ganhou Mostrar senha (celular) | <img src=".auditoria/prints/antes/celular-login-vazio.png" width="220"> | <img src=".auditoria/prints/depois/celular-login-vazio.png" width="220"> |
| Login: ganhou Mostrar senha (desktop) | <img src=".auditoria/prints/antes/desktop-login-vazio.png" width="220"> | <img src=".auditoria/prints/depois/desktop-login-vazio.png" width="220"> |
| Login: erro junto do campo (celular) | <img src=".auditoria/prints/antes/celular-login-erro-email-invalido.png" width="220"> | <img src=".auditoria/prints/depois/celular-login-erro-email-invalido.png" width="220"> |
| Login: erro junto do campo (desktop) | <img src=".auditoria/prints/antes/desktop-login-erro-email-invalido.png" width="220"> | <img src=".auditoria/prints/depois/desktop-login-erro-email-invalido.png" width="220"> |
| Login: campo da senha marcado (celular) | <img src=".auditoria/prints/antes/celular-login-erro-sem-senha.png" width="220"> | <img src=".auditoria/prints/depois/celular-login-erro-sem-senha.png" width="220"> |
| Login: campo da senha marcado (desktop) | <img src=".auditoria/prints/antes/desktop-login-erro-sem-senha.png" width="220"> | <img src=".auditoria/prints/depois/desktop-login-erro-sem-senha.png" width="220"> |
| Cadastro: erro junto do campo e dica (celular) | <img src=".auditoria/prints/antes/celular-cadastro-senha-curta.png" width="220"> | <img src=".auditoria/prints/depois/celular-cadastro-senha-curta.png" width="220"> |
| Cadastro: erro junto do campo e dica (desktop) | <img src=".auditoria/prints/antes/desktop-cadastro-senha-curta.png" width="220"> | <img src=".auditoria/prints/depois/desktop-cadastro-senha-curta.png" width="220"> |
| Esqueci a senha: campo marcado (celular) | <img src=".auditoria/prints/antes/celular-esqueci-senha-email-invalido.png" width="220"> | <img src=".auditoria/prints/depois/celular-esqueci-senha-email-invalido.png" width="220"> |
| Esqueci a senha: campo marcado (desktop) | <img src=".auditoria/prints/antes/desktop-esqueci-senha-email-invalido.png" width="220"> | <img src=".auditoria/prints/depois/desktop-esqueci-senha-email-invalido.png" width="220"> |
| Busca: Voltar e aba Diário marcada (celular) | <img src=".auditoria/prints/antes/celular-busca-com-resultado.png" width="220"> | <img src=".auditoria/prints/depois/celular-busca-com-resultado.png" width="220"> |
| Busca: Voltar e aba Diário marcada (desktop) | <img src=".auditoria/prints/antes/desktop-busca-com-resultado.png" width="220"> | <img src=".auditoria/prints/depois/desktop-busca-com-resultado.png" width="220"> |
| Busca sem resultado: Voltar e aba marcada (celular) | <img src=".auditoria/prints/antes/celular-busca-sem-resultado.png" width="220"> | <img src=".auditoria/prints/depois/celular-busca-sem-resultado.png" width="220"> |
| Busca sem resultado: Voltar e aba marcada (desktop) | <img src=".auditoria/prints/antes/desktop-busca-sem-resultado.png" width="220"> | <img src=".auditoria/prints/depois/desktop-busca-sem-resultado.png" width="220"> |
| Editor: data inteira (celular) | <img src=".auditoria/prints/antes/celular-editor-anotacao.png" width="220"> | <img src=".auditoria/prints/depois/celular-editor-anotacao.png" width="220"> |
| Editor: data inteira (desktop) | <img src=".auditoria/prints/antes/desktop-editor-anotacao.png" width="220"> | <img src=".auditoria/prints/depois/desktop-editor-anotacao.png" width="220"> |
| Diálogo da lixeira: data inteira ao fundo (celular) | <img src=".auditoria/prints/antes/celular-dialogo-lixeira-anotacao.png" width="220"> | <img src=".auditoria/prints/depois/celular-dialogo-lixeira-anotacao.png" width="220"> |
| Diálogo da lixeira: data inteira ao fundo (desktop) | <img src=".auditoria/prints/antes/desktop-dialogo-lixeira-anotacao.png" width="220"> | <img src=".auditoria/prints/depois/desktop-dialogo-lixeira-anotacao.png" width="220"> |
| Agenda: calendário com alvos de 44 px (celular) | <img src=".auditoria/prints/antes/celular-agenda-calendario.png" width="220"> | <img src=".auditoria/prints/depois/celular-agenda-calendario.png" width="220"> |
| Agenda: calendário com alvos de 44 px (desktop) | <img src=".auditoria/prints/antes/desktop-agenda-calendario.png" width="220"> | <img src=".auditoria/prints/depois/desktop-agenda-calendario.png" width="220"> |
| Agenda: dica de toque longo (celular) | <img src=".auditoria/prints/antes/celular-agenda-com-tarefas.png" width="220"> | <img src=".auditoria/prints/depois/celular-agenda-com-tarefas.png" width="220"> |
| Agenda: dica de toque longo (desktop) | <img src=".auditoria/prints/antes/desktop-agenda-com-tarefas.png" width="220"> | <img src=".auditoria/prints/depois/desktop-agenda-com-tarefas.png" width="220"> |
| PIN: ajuste de espaço (celular) | <img src=".auditoria/prints/antes/celular-tela-pin.png" width="220"> | <img src=".auditoria/prints/depois/celular-tela-pin.png" width="220"> |
| PIN: ajuste de espaço (desktop) | <img src=".auditoria/prints/antes/desktop-tela-pin.png" width="220"> | <img src=".auditoria/prints/depois/desktop-tela-pin.png" width="220"> |
| Esqueci o PIN: mais ar entre links (celular) | <img src=".auditoria/prints/antes/celular-esqueci-pin.png" width="220"> | <img src=".auditoria/prints/depois/celular-esqueci-pin.png" width="220"> |
| Esqueci o PIN: mais ar entre links (desktop) | <img src=".auditoria/prints/antes/desktop-esqueci-pin.png" width="220"> | <img src=".auditoria/prints/depois/desktop-esqueci-pin.png" width="220"> |
| Diário vazio: convite na barra (celular) | <img src=".auditoria/prints/antes/celular-principal-vazia.png" width="220"> | <img src=".auditoria/prints/depois/celular-principal-vazia.png" width="220"> |
| Diário vazio: convite na barra (desktop) | <img src=".auditoria/prints/antes/desktop-principal-vazia.png" width="220"> | <img src=".auditoria/prints/depois/desktop-principal-vazia.png" width="220"> |
| Diário com dados: convite na barra (celular) | <img src=".auditoria/prints/antes/celular-principal-muitos-dados.png" width="220"> | <img src=".auditoria/prints/depois/celular-principal-muitos-dados.png" width="220"> |
| Diário com dados: convite na barra (desktop) | <img src=".auditoria/prints/antes/desktop-principal-muitos-dados.png" width="220"> | <img src=".auditoria/prints/depois/desktop-principal-muitos-dados.png" width="220"> |

Observações: os prints "depois" foram tirados antes de VIS-1 e VIS-2, por isso nos de Diário e barra lateral o convite aparece com 92 px e, no cadastro, a senha com três linhas empilhadas; os dois pontos já foram corrigidos no código. `desktop-agenda-calendario.png` não mostra o calendário aberto nos dois lados (falha do script de prints).

## 4. O que ficou pendente

- CSP do Android sem conferência em aparelho: ela não foi ligada no Android; falta gerar o APK e ver se entrar, sincronizar e procurar atualização funcionam.
- App de Windows não aberto numa cópia dos dados: tudo foi testado no navegador (Edge). Falta abrir o desktop com `--user-data-dir` numa cópia e conferir trava, barra de título e alto contraste.
- Alvos de toque não medidos num aparelho real: UI-L2 foi feito por CSS e conferido por teste em 390x844, mas não com o dedo.
- Área segura e barra de rolagem do sistema no Android (UI-L1, UI-L4) também esperam aparelho.
- `supabase/schema.sql` endurecido ainda não foi aplicado no Supabase real. Teste antes num projeto de teste e confira os Advisors. A restrição de tamanho foi criada como `not valid`.
- Trabalho parcial antigo guardado nos branches `consertos/android`, `consertos/local`, `consertos/site`, `consertos/ui-pc` e `consertos/windows`: não foi usado nem apagado, para não misturar com esta rodada. Decida depois se algo deles ainda serve.
- VIS-1 e VIS-2 sem print novo de conferência.
- Estados que os prints não cobrem: área segura, alto contraste, pílula "Hoje", "Sair da conta" e "Gerando...".
- A trava de PIN com o link `memoras://senha` ainda precisa de conferência à mão.
- Release não feito (só com sua confirmação).

## 5. Como testar, passo a passo

1. `npx tsc --noEmit`: deve terminar sem erros.
2. `npx vitest run`: 4 arquivos, 16 testes passando.
3. `npm run build`: gera o `dist`; o aviso de pacote grande é normal.
4. `npm run dev` e abra o endereço mostrado. Para o desktop, use uma cópia dos dados (`--user-data-dir`), nunca o diário real.
5. O que olhar em cada tela:
   - Login e cadastro: o erro aparece logo abaixo do campo, com borda vermelha; "Mostrar senha" por último; sem "Esqueci minha senha" no cadastro.
   - Agenda: digite uma tarefa e aperte Ctrl+1 sem Enter; ela deve estar lá ao voltar. No celular, o calendário tem linhas confortáveis.
   - Barra lateral: o convite "só neste aparelho" com altura normal.
   - Lixeira: mova uma anotação, cancele com Esc; o foco volta ao botão e a barra de título responde.
   - Editor: Ctrl+Enter ou Pronto deixa o foco em Editar.
   - Celular (janela estreita): Busca e Arquivo com Voltar; aba Diário marcada; data inteira no editor.
   - PIN: com PIN ligado, minimize, espere o prazo e volte; deve pedir o PIN. Teste "Esqueci o PIN" pelos Ajustes.
   - Ajustes: "Sair da conta" pede confirmação; "Gerar nova chave" mostra "Gerando...".
   - Temas: troque de tema e recarregue; sem piscar turquesa.
6. Testes da auditoria: `node .auditoria/testes/<nome>.mjs` (saída 0 quer dizer corrigido), exceto os cinco esperados em 1.

## 6. Sugestões que precisam do Vinicius

Da seção 8 do MELHORIAS.md:
1. Tela "Restaurar cópia" (as cópias existem, falta o caminho no app).
2. Excluir a conta pelo app e por uma página, com política de privacidade e termos (as lojas pedem).
3. Um nome só: "Ajustes" ou "Configurações".
4. O que "Sair da conta" faz com o diário do aparelho: manter ou oferecer apagar.
5. Campo "Repita a senha" no cadastro.
6. Botão "mais" visível em cada linha no celular.
7. Rótulos nos ícones do alto e da lateral.
8. Tarefa em branco: manter as linhas vazias da Agenda ou esconder.
9. Trava por inatividade com o app aberto.
10. Virada do dia com a Agenda aberta: trocar sozinha ou avisar.
11. Aviso visível de "sem internet" nos Ajustes.
12. Texto de exemplo do título mais claro no editor.
13. Cifrar o diário local com o PIN.
14. Escrita condicional no servidor (função SQL), que fecha a disputa também com aparelhos antigos.
15. Assinatura de código no Windows (evita o aviso do SmartScreen).
16. Apagar `memoras-site.zip` e `portfolio-preview/`, se não forem mais usados.

Dos revisores: conferir os prints de VIS-1 e VIS-2 depois da correção; atualizar a expectativa de `tecnica-T13` no plano; e ajustar o comentário do `init` em `store.ts` sobre `recoveryPending`, que engana.

Ações externas, só suas: aplicar o schema no Supabase; gerar e testar o APK; conferir o alto contraste no Windows; política de conteúdo no `.htaccess` do site; fazer o release.

## 7. Prompts de assets

O Memoras não é um jogo e esta rodada não precisou de assets novos (sem sons, músicas, vozes nem arte). Não há prompts de assets a entregar.

## 8. Dependências novas

- `playwright-core`: só para a auditoria (prints e testes no Edge). Não entra no app.
- `vitest`: roda os testes automáticos de cifra, junção e migração, e trava o release se algum falhar.

## 9. Modelos usados em cada fase

O Fable esteve disponível em todas as fases.

| Fase | Trabalho | Modelo |
|---|---|---|
| 1 | Mapa, ferramentas, inventário, prints | haiku low |
| 2 | Auditorias de lógica e de UI/UX | claude-fable-5-2 high |
| 2 | Auditoria técnica | opus high |
| 3 | Plano (MELHORIAS.md) | sonnet medium |
| 4 | Execução dos lotes | claude-fable-5-2 high |
| 5 | Junção dos lotes | sonnet medium |
| 6 | Revisão de código | opus high |
| 6 | Prints depois | haiku low |
| 6 | Revisão visual | claude-fable-5-2 high |
| 6 | Correções | sonnet medium |
| 6 | Conferência final | haiku low |
| Final | Este relatório | sonnet medium |

## Resumo

- 55 commits em `melhorias-claude`; tsc, vitest (16 testes), build de produção e de desktop passam.
- Corrigidos os itens confirmados das auditorias (menos T5 e T6, adiados, e T15, descartado), mais 6 da revisão de código e 2 da visual.
- Ganhos principais: sem perda de tarefa digitada, sem abrir sem PIN, sincronização sem reenvio nem linhas puladas.
- 31 de 36 testes de auditoria em 0; os 5 em 1 são esperados.
- Pendências: CSP e toque no Android, desktop numa cópia, schema no Supabase real, branches `consertos/*`.
- Prints de antes e depois ficam só no computador, fora do Git.
- Dependências novas: playwright-core (auditoria) e vitest (testes do release).
- Sem assets novos: o Memoras não é jogo.
- Tudo está commitado no branch melhorias-claude, sem merge no main; o release só sai com sua confirmação.
- Sugestões de produto na seção 6.
