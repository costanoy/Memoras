# Handoff: Memoras — diário pessoal (computador + celular)

## Overview
Memoras é um diário pessoal digital: escrever rápido, reler depois, tudo privado. Funciona 100% offline; conta (email + senha) é opcional e só serve para sincronizar entre aparelhos. Criptografia de ponta a ponta, chave de recuperação, PIN local opcional. Este pacote descreve o app completo (todas as telas, estados e regras) no visual **Frutiger Aero + Liquid Glass colorido**, com 10 temas de cor escolhidos pelo usuário.

`briefing-original.md` é o briefing de produto que originou o design. Este README o complementa com todas as decisões tomadas durante o design.

## About the Design Files
`Memoras.dc.html` é uma **referência de design feita em HTML**: um protótipo interativo mostrando aparência e comportamento, **não código de produção**. A tarefa é **recriar este design no ambiente do app** (ex.: React/React Native, Tauri, Expo, SwiftUI…), usando os padrões e bibliotecas do projeto. Se ainda não houver projeto, escolha o framework mais adequado (sugestão: uma base compartilhada web + mobile, pois o layout é o mesmo com duas disposições).

Para abrir o protótipo: sirva a pasta num servidor local (ex.: `npx serve .`) e abra `Memoras.dc.html`. O painel "Controles do protótipo" (canto inferior direito) **não faz parte do app**: serve só para alternar Computador/Celular, pular entre telas, trocar cor e simular estados (sincronização, com/sem conta, vazio, "2 h sem escrever"). PIN de teste: `2580`. Chave do PIN de teste: `PIN-4F7K-92QD-LM3X`.

Fora do escopo do design (implementar de verdade no código): criptografia, sincronização/merge (Supabase), envio de email, impressão, validação real das chaves.

## Fidelity
**High-fidelity.** Cores, tipografia, raios, sombras, textos e interações são finais. Recrie fielmente.

---

## Layout geral

### Fundo (todas as telas)
Gradiente vivo em camadas (varia por tema, ver Design Tokens → Temas) + bolhas decorativas Frutiger Aero (círculos com `radial-gradient` branco translúcido, reflexo no canto superior esquerdo), `pointer-events:none`. Usar com moderação: 3–4 bolhas no computador.

### Computador (≥ 720 px)
- Área total 100vh (mín. 460 px), padding 18 px, gap 18 px, flex row.
- **Barra lateral** 340 px fixa; **painel principal** flex:1. Ambos são painéis de vidro (raio 28 px).
- Barra lateral (de cima para baixo): cabeçalho (nome do diário editável + pílula de sincronização) → convite "sem conta" (se aplicável) → botão gel "Nova anotação" (altura 50) → indicador de filtro por dia (se ativo) → lista de anotações (rola) → calendário (quando aberto) → **barra de ícones** inferior.
- Barra de ícones inferior: pílula de vidro (raio 24, padding 6) com 5 botões-ícone de 44×44: Busca, Arquivo, Lixeira, Ajustes (engrenagem), Calendário. O botão ativo **expande** mostrando o rótulo (padding 0 14/0 12, fundo branco .95, borda `acc-a`, anel `ring`). Só um rótulo expandido por vez (se o calendário estiver aberto junto de outra seção, o calendário fica só com destaque, sem rótulo).
- Painel principal mostra: editor (se há anotação selecionada) / estado vazio / Busca / Arquivo‑Lixeira / Configurações.

### Celular (< 720 px) — referência 390×844
- Conteúdo com padding 52 px topo (status bar), 10 px laterais, 98 px embaixo (tab bar).
- Uma tela por vez: Histórico (lista) ou painel principal (editor, busca, etc.).
- **Tab bar** flutuante: left/right 12, bottom 14, altura 72, raio 30, vidro. 5 itens: Diário, Busca, **+** (botão gel circular 52 px, nova anotação), Arquivo, Ajustes. Ícones 24 px stroke 2.2, rótulo 12 px/700. Ativo: cor `acc-d`; inativo: `ink2`.
- Calendário abre por botão de 44 px no cabeçalho do histórico.
- Arquivo/Lixeira no celular: mesma tela com controle segmentado "Arquivadas | Lixeira".
- Toasts sobem para bottom 100 px quando há tab bar.

---

## Screens / Views

Textos abaixo são a cópia final (pt-BR). **Não use travessões (—) em nenhum texto do app.**

### 1. Desbloqueio por PIN
- Cartão de vidro forte (`glass2`), max-width 360, raio 36, padding 34/24/28, centralizado (`align-items: safe center`, rolável em telas baixas).
- Topo: nome do diário (14/600, `ink4`, letter-spacing .04em) + título 24/700: "Digite seu PIN" | "Crie um PIN de 4 dígitos" | "Digite o PIN de novo".
- 4 pontos 16 px (borda 2 px `acc`; preenchido = `gel`; erro = borda #c0365a, preenchido #e0567a).
- Linha de mensagem (min-height 22, 15/600, #b0284a).
- Teclado 3×4, teclas circulares 76 px, gap 14/20. Tecla gel-vidro: `linear-gradient(180deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.62) 49%, rgba(214,242,255,.62) 51%, rgba(255,255,255,.85) 100%)`, borda branca .95, sombra `inset 0 1px 0 #fff, inset 0 -4px 10px rgba(0,100,160,.12), 0 8px 18px -8px rgba(0,60,110,.5)`. Dígitos 28 px/500; ⌫ 22 px. Célula vazia à esquerda do 0.
- Links: "Esqueci o PIN" (modo desbloquear) / "Cancelar" (modos criar/confirmar).
- **Teclado físico:** 0–9 digitam, Backspace/Delete apagam; a tecla correspondente na tela reage como clique (scale .9 + brilho `ring` por 130 ms).
- **Erro:** pontos tremem (keyframes shake 380 ms: 0, -9, 7, -4, 2, 0 px), pontos ficam vermelhos, limpam após 420 ms. Mensagem "PIN incorreto. Tente de novo." A partir do 3º erro: "PIN incorreto. N tentativas antes de uma pausa." No 5º erro: bloqueio de 30 s, teclas com opacity .45, mensagem "Muitas tentativas. Tente de novo em N s." (contagem ao vivo). **Nunca apagar dados por tentativas.**
- Criar PIN: digita 4 → "Digite o PIN de novo" → se diferente: "Os PINs não coincidem. Crie de novo." e volta ao passo criar.
- Acerto → animação de desbloqueio (ver Interações) → Histórico.

### 2. Esqueci o PIN
- Com conta: título "Esqueci o PIN"; texto "Entre com o email e a senha da sua conta para criar um PIN novo. Suas anotações continuam aqui."; campos Email, Senha; botão "Confirmar"; links "Voltar" e "Esqueci minha senha" (→ fluxo 6).
- Sem conta: texto "Digite a chave do PIN que você guardou quando ativou o PIN neste aparelho."; campo monoespaçado (placeholder `PIN-XXXX-XXXX-XXXX`); "Confirmar"; link "Não tenho a chave" → caixa de aviso âmbar: "Sem conta e sem a chave, não há como abrir este diário. A única saída é apagar tudo neste aparelho e começar de novo." + botão vermelho "Apagar diário e recomeçar" → modal de confirmação "Apagar todo o diário deste aparelho?" → volta ao Primeiro uso.
- Sucesso: "Tudo certo, é você" / "Crie um PIN novo agora ou desative o PIN neste aparelho." Botões "Criar novo PIN" (gel) e "Desativar PIN" (vidro). Zera contador de tentativas.
- Erros: "Digite o email e a senha da conta." / "Chave não confere. Confira e tente de novo."

### 3. Chave do PIN (só para quem ativa PIN **sem conta**)
- Aparece após criar/trocar PIN quando não há conta. Mostrada uma única vez.
- Título "Chave do PIN"; texto "Sem conta, esta chave é a única forma de abrir o diário se você esquecer o PIN. **Ela aparece só agora.**"
- Caixa da chave: vidro leitoso, Source Code Pro 21/600, letter-spacing .05em, centralizada. Formato `PIN-XXXX-XXXX-XXXX`.
- Ações (pílulas de vidro, altura 46, flex-wrap, cada uma se ajusta ao texto): Copiar→"Copiada", Salvar arquivo→"Arquivo salvo" (baixa `memoras-chave-do-pin.txt`), Imprimir→"Impressa". Estado concluído: texto #2d7a12.
- "Guarde fora deste aparelho: num gerenciador de senhas, impressa ou anotada em papel."
- Checkbox "Guardei minha chave" (26 px, raio 8; marcado = `gel` com ✓). "Continuar" desabilitado (opacity .45) até marcar.

### 4. Primeiro uso (4 passos)
Cartão max-width 440, raio 36, padding 34/30/30. Barra de progresso: 4 segmentos de 6 px (ativo = `gel`, inativo rgba(12,60,90,.12)).
1. "Boas-vindas ao Memoras" (15/600) / "Como vai se chamar seu diário?" (28/700) / "Aparece no topo do app. Dá para mudar depois nas configurações." Campo (altura 54, raio 18, 18 px). Padrão sugerido: **"Diário de {nome}"** (sempre "de", nunca "da/do"). Botão "Continuar".
2. "Escolha sua cor" / "Muda o fundo, os botões e os destaques. Dá para trocar depois nas configurações." Grade 5 colunas de bolhas de 48 px (borda 2 px branca, reflexo branco no topo, rótulo 13 px). Selecionada: anel `0 0 0 3px var(--acc)`. **O app inteiro muda de cor na hora** ao tocar. Botões "Voltar" / "Continuar".
3. "Onde guardar suas anotações?" / "O Memoras funciona sem internet nos dois casos." Dois cartões-rádio: "Só neste aparelho" (Sem conta e sem internet. Você pode criar uma conta depois.) e "Criar conta" (Sincroniza entre seus aparelhos, com criptografia de ponta a ponta.). Criar conta → tela Cadastro → Chave de recuperação → volta ao passo 4.
4. "Proteger com um PIN?" / "O PIN pede um código de 4 dígitos ao abrir o app neste aparelho. É independente da senha da conta. Opcional." + nota: com conta "Se esquecer, é só entrar com sua conta para criar outro." | sem conta "Sem conta, você vai receber uma chave para usar caso esqueça o PIN." Toggle "Ativar PIN" (52×30). Botão: "Criar PIN" ou "Começar a escrever".

### 5. Cadastro e login
- Cartão max-width 420. Controle segmentado "Criar conta | Entrar" (altura 40, trilho rgba(12,60,90,.08); ativo = branco com sombra).
- **O cartão mantém a mesma altura nos dois modos** (os dois subtítulos ocupam a mesma célula de grid; o inativo fica `visibility:hidden`).
- Criar conta: "Para sincronizar entre aparelhos. Suas anotações são criptografadas antes de sair do aparelho." Entrar: "Entre para sincronizar este aparelho com os outros."
- Campos Email (placeholder voce@email.com) e Senha (placeholder "Mínimo 8 caracteres" / "Sua senha"). Rótulo 14/600 `ink4`; campo altura 52, raio 16, 17 px, foco = borda `acc` + anel 4 px `ring`.
- Validação: "Digite um email válido." / "A senha precisa ter pelo menos 8 caracteres." / "Digite sua senha." (15/600 #b0284a).
- Rodapé: "Voltar" e "Esqueci minha senha".

### 6. Chave de recuperação (conta)
- Mostrada uma única vez, após criar conta ou "Gerar nova chave". Formato `MEMO-XXXX-XXXX-XXXX-XXXX-XXXX`.
- "Sua chave de recuperação" / "Ela reabre suas anotações se você esquecer a senha. **Esta chave aparece só agora.** Guarde antes de continuar."
- Caixa da chave (Source Code Pro 19/600).
- Botão principal verde-lima gel "Enviar para meu email" + selo "RECOMENDADO" → abre `mailto:` com assunto "Chave de recuperação do Memoras" e a chave no corpo. Depois: "Email aberto". Gel lima: `linear-gradient(180deg,#e2ffab 0%,#a6e756 48%,#86d535 52%,#99de47 100%)`, texto `ink`.
- Ações secundárias: Copiar / Salvar arquivo (`memoras-chave-de-recuperacao.txt`) / Imprimir (mesmo estilo da Chave do PIN).
- Aviso âmbar (fundo rgba(255,236,190,.8), texto #4a3300): "**Quem acessar seu email poderá abrir seu diário.** Se enviar a chave por email, ative a verificação em duas etapas na sua conta de email."
- Checkbox "Guardei minha chave" + "Continuar" (desabilitado até marcar).

### 7. Esqueci minha senha (3 passos + conclusão)
Rótulo "Passo N de 3".
1. "Esqueci minha senha" / "São duas etapas:" / "**1. Nova senha:** para voltar a entrar na conta." / "**2. Chave de recuperação:** para reabrir suas anotações. A senha nova sozinha não abre o diário." Campo email. Botão "Enviar link de redefinição".
2. "Crie uma nova senha" / "Abrimos o link enviado para {email}." Campo senha (mín. 8). "Salvar nova senha".
3. "Agora, reabra suas anotações" + caixa azul-clara: "Sua senha foi trocada. As anotações são criptografadas e só abrem com a **chave de recuperação** que você guardou no cadastro." Campo monoespaçado (textarea 2 linhas). "Reabrir anotações". Link "Não tenho a chave" → "Sem a chave, as anotações antigas não podem ser reabertas, nem por nós. Você pode continuar usando a conta com um diário novo." e botão vira "Começar diário novo".
4. "Tudo certo" / "Sua senha nova já funciona e suas anotações foram reabertas neste aparelho." "Ir para o diário".
- Link "Voltar para o login" em todos os passos.

### 8. Histórico
- Cabeçalho: **nome do diário editável no lugar** (input sem borda 24/700; hover = fundo branco .5; foco = fundo branco .92 + borda `acc` + anel `ring`). Enter ou Esc confirmam (blur). Vazio ao sair → volta para "Meu diário".
- Pílula de sincronização (altura 28, 13/600, fundo branco .65) com indicador: ponto 9 px + halo 3 px. Estados:
  - Sincronizado — ponto #2fae4f
  - Sincronizando… — spinner 12 px (borda `acc`), girando 0.8 s linear
  - Offline · salvo no aparelho — ponto #6b8595
  - Não sincronizou · tentar de novo — ponto #d08a00 (clicável, tenta de novo). Discreto, nunca vermelho/alarmante.
  - Sem conta: "Só neste aparelho" (ponto cinza; clicar leva a Configurações).
- Convite sem conta (cartão branco .72, raio 18, dispensável com ×): "Suas anotações estão só neste aparelho." + link "Criar conta para sincronizar".
- Lista agrupada por dia: cabeçalho 13/700 caixa-alta letter-spacing .05em (`ink4`): "Hoje", "Ontem", depois "Segunda, 22 de setembro" (dia da semana sem "-feira"; ano só se diferente do atual). Ordenação pela data de criação (primeiro trecho), mais recente primeiro.
- Item: raio 18, padding 12/14, fundo branco .5, borda branca .8. Título 16/700 (1 linha, reticências) + horário 13 px à direita; prévia 14 px, 2 linhas. Selecionado (computador): fundo .95, borda `acc-a`, anel 3 px `ring`. Sem título → primeiras 6 palavras + "…"; sem texto → "Nova anotação" / "Sem texto ainda".
- **Calendário**: cartão branco .62, raio 20. Cabeçalho ‹ Mês Ano › (botões 32 px). Semana D S T Q Q S S. Células 32 px, raio 10: dias com anotação = 700 + ponto 4 px `acc` embaixo, clicáveis; hoje = fundo branco + contorno 1.5 px `acc`; selecionado = `gel` com texto `gel-fg`. Selecionar filtra a lista → "Mostrando **22 de setembro**" + "Ver todas".
- Vazio: bolha decorativa 64 px, "Nenhuma anotação ainda" / "Escreva o que quiser. Fica tudo guardado aqui, só para você." / botão "Escrever a primeira". Painel principal (computador) vazio: "Seu diário está em branco" / "Comece com uma frase. Você pode voltar e continuar quando quiser." / "Nova anotação".

### 9. Editor
- Barra superior (padding 12/14): [celular: voltar 44 px] data ("Hoje, 29 de setembro" / "Ontem, …" / "Segunda, 22 de setembro") 16/700 + subtítulo 13 px de estado de salvamento: "Salvo" | "Salvo neste aparelho" (sem conta) | "Salvo no aparelho · sincroniza quando voltar a internet" (offline) | "Salvo no aparelho" (erro) | "Arquivada". Botões pílula 44 px: Arquivar/Desarquivar e Lixeira (no celular só ícone).
- Folha de **vidro leitoso** (`milk`): max-width 740, centralizada, raio 24, padding 36/44/56 (celular 24/20/40), borda 1 px branca, sombra `inset 0 1px 0 #fff, 0 10px 30px -18px rgba(0,50,100,.35)`.
- Título opcional: input 30/700, placeholder "Título (opcional)".
- Trechos: cada um = horário (13/600, `ink4`, letter-spacing .04em) + textarea auto-altura (19 px, line-height 1.75, `ink`). Placeholder do novo trecho: "Escreva o que quiser…" (vazio) / "Continue escrevendo…".
- **Regra das 2 horas:** escrever em menos de 2 h desde a última edição continua o mesmo trecho (sem horário novo). Após ≥ 2 h sem escrever, o próximo texto digitado cria um trecho novo com o horário atual. Nenhuma outra quebra. Anotações sempre editáveis (todos os trechos).
- Anotação nova vazia que o usuário abandona é descartada (não vai para a lista nem lixeira).
- **Transição ao abrir/trocar anotação:** a folha entra com opacity 0→1 + translateY(8px) scale(.995)→none, 180 ms, cubic-bezier(.2,.8,.2,1). Não repetir ao digitar. Reduzir movimento: só fade 120 ms.

### 10. Busca
- Título "Busca" 26/700; campo pílula altura 52 com ícone de lupa, placeholder "Buscar nas anotações".
- Busca em título + texto, **ignorando acentos e maiúsculas**, inclui arquivadas (com selo "Arquivada"), exclui lixeira. Local/offline.
- Contador "1 anotação" / "N anotações". Resultado: cartão de vidro raio 20; título + data; trecho com ~60 caracteres antes e ~90 depois (reticências), termo destacado com `<mark>` fundo rgba(166,231,86,.75), raio 4.
- Ocioso: "Busque por qualquer palavra. A busca acontece no aparelho, mesmo offline." Sem resultado: "Nada encontrado" / "Nenhuma anotação tem “{termo}”. Tente outra palavra."

### 11. Arquivo
- "Arquivo" / "Anotações guardadas fora do histórico. Continuam aparecendo na busca." Cartões com título, data, prévia e botão "Desarquivar". Vazio: "Nada arquivado" / "Arquive anotações para tirá-las do histórico sem apagar."

### 12. Lixeira
- "Lixeira" / "Restaure uma anotação ou apague para sempre." Botão no cabeçalho "Esvaziar lixeira" (texto #a3203f). Por item: "Restaurar" e "Apagar para sempre" (borda rgba(163,32,63,.25), texto #a3203f).
- Modal de confirmação (fundo rgba(8,40,70,.28); cartão raio 30 max 380): "Apagar para sempre?" / "Esvaziar a lixeira?" + "Isso não pode ser desfeito, nem em outros aparelhos." Botões "Cancelar" e "Apagar" (gel vermelho `linear-gradient(180deg,#f58aa3 0%,#d9446a 48%,#bf2d55 52%,#c9365d 100%)`).
- Vazio: "Lixeira vazia" / "Anotações que você mandar para a lixeira aparecem aqui."

### 13. Configurações ("Ajustes" no ícone/aba)
Coluna max-width 620; cartões de vidro raio 22, padding 18, cabeçalho de seção 13/700 caixa-alta.
- **Diário:** Nome do diário (campo) + **Cor** (mesma grade de 10 bolhas do primeiro uso).
- **PIN deste aparelho:** toggle "Pedir PIN ao abrir" / "Independente da senha da conta." + "Trocar PIN". Ativar/trocar → tela PIN em modo criar (e, sem conta, Chave do PIN depois). Desativar → toast "PIN desativado".
- **Conta e sincronização:** com conta: email, "Criptografia de ponta a ponta. Edições em dois aparelhos se juntam sozinhas.", indicador de sync, botões "Sincronizar agora" e "Sair da conta" (toast "Você saiu. As anotações continuam neste aparelho."). Sem conta: "Sem conta, suas anotações ficam só neste aparelho. Crie uma para sincronizar com seus outros aparelhos." + "Criar conta" (gel) / "Entrar".
- **Chave de recuperação** (só com conta): "Criada no cadastro e mostrada uma única vez. Se você perdeu a sua, gere uma nova. A anterior deixa de funcionar." + "Gerar nova chave" → tela 6.

---

## Interactions & Behavior

### Animação de desbloqueio (só com PIN correto; ~720 ms total)
Overlay com o fundo do tema, fechadura de vidro centralizada (corpo 140×110 raio 32 com gradiente `--lock`, arco 84×88 com borda 14 px branca .92; buraco 38 px; chave = barra 68×12 branca brilhante).
1. 0–240 ms: chave gira 0→90° (cubic-bezier(.3,.7,.3,1)); reflexo de luz (faixa branca inclinada -20°) atravessa o corpo 60–360 ms.
2. 240–400 ms: arco sobe 18 px (cubic-bezier(.2,.9,.3,1.3)).
3. 380–680 ms: fechadura escala 1→1.35 e some; 440–700 ms overlay some revelando o Histórico (já renderizado por baixo). Sem pausa.
- Reduzir movimento: só fade do overlay, 220 ms.

### Estados de botão (todos os clicáveis)
- Gel: hover `filter: brightness(1.08) saturate(1.1); translateY(-1px)`; active `brightness(.92); translateY(1px) scale(.98)`.
- Vidro/itens/abas/teclas/dias: hover `drop-shadow(0 6px 12px rgba(0,40,90,.18)) brightness(1.03); translateY(-1px)`; active `brightness(.95); scale(.97)`.
- Links: hover cor `acc-dd` + sublinhado (offset 3 px); active opacity .6 scale(.97).
- Transição `transform/filter/opacity/color .12s ease`.
- Campos: foco = borda `acc` + anel 4 px `ring`.

### Toasts
Pílula escura rgba(12,43,64,.88) com blur, texto branco 15/600, centralizada embaixo (28 px; 100 px no celular com tab bar), some em 5 s. Com "Desfazer" (gel lima) após: "Anotação arquivada", "Movida para a lixeira". Outros: "Anotação desarquivada", "Anotação restaurada", "Apagada para sempre", "Lixeira esvaziada", "PIN ativado", "PIN alterado", "PIN desativado", "Conta conectada. Sincronizando…".
- Arquivar/lixeira no editor seleciona a próxima anotação ativa mais recente e volta ao histórico (celular).

### Acessibilidade
- Respeitar `prefers-reduced-motion` (animações viram fades curtos; spinner para) e `prefers-reduced-transparency` (vidros viram sólidos: glass #e2f1f8, glass2 #f1f8fb, milk #fcfeff, sem blur).
- Texto sempre em tinta escura do tema (`ink*`) sobre vidro claro; contraste ≥ 4.5:1.
- Alvos de toque ≥ 44 px no celular. Botões só-ícone têm `aria-label`; toggles/abas usam `aria-pressed`.
- Painéis centralizados usam `align-items: safe center` para não cortar o topo em telas baixas.

## State Management
- `device` (layout), `screen` (pin | forgotPin | pinkey | onboard | auth | recovery | forgot | history | editor | search | archive | settings)
- Preferências locais: `diaryName`, `theme` (sincroniza com a conta), `pinOn`, `pinHash`, tentativas/bloqueio (`pinFails`, `lockUntil`)
- Conta: `hasAccount`, `accountEmail`, `sync` (synced | syncing | offline | error)
- Notas: `{ id, title, status: active|archived|trashed, last (timestamp última edição), segs: [{ t (timestamp início), text }] }`
- UI: `sel`, `query`, `shelf` (archive|trash), `calOpen`, `calY/calM`, `day` (filtro), `toast {text, undo}`, `confirm`
- Fluxos: `onStep` (1–4), `storeMode`, `authMode`, `rec`/`pk` (copiada/salva/impressa/confirmada), `fStep`, `fpStep`
- Merge de edições entre aparelhos: automático (sugestão: CRDT por trecho). Sem UI de conflito.

## Design Tokens

### Tipografia
- **Source Sans 3** (400/500/600/700, itálico 400) para tudo. **Source Code Pro** 500/600 só para chaves.
- Escala: 12 (rótulo tab) · 13 (meta, cabeçalhos de grupo, horários) · 14 · 15 (corpo secundário, botões pequenos) · 16 · 17 (botões/campos) · 18 · 19 (texto do editor, lh 1.75) · 22 (modal) · 24 (nome do diário, título PIN) · 26 (títulos de tela) · 28 (títulos onboarding, dígitos PIN) · 30 (título da anotação).

### Raios
10 (dias/ícones pequenos) · 12–14 · 16 (campos) · 18 (itens de lista, avisos) · 20–22 (cartões) · 24 (folha do editor, barra de ícones) · 28 (painéis principais) · 30 (tab bar, modal) · 36 (cartões de fluxo) · 999 (pílulas/botões).

### Superfícies
- `--glass`: `linear-gradient(180deg, rgba(255,255,255,.58), rgba(255,255,255,.30))` (painéis grandes)
- `--glass2`: `linear-gradient(180deg, rgba(255,255,255,.84), rgba(255,255,255,.60))` (cartões/botões)
- `--milk`: `linear-gradient(180deg, rgba(251,254,255,.97), rgba(242,250,253,.94))` (área de escrita)
- `--blur`: `blur(22px) saturate(170%)`
- Borda vidro: 1 px rgba(255,255,255,.75–.95); reflexo `inset 0 1px 0 #fff`.
- Sombra painel: `0 24px 60px -28px rgba(0,50,100,.5)`; cartão de fluxo: `0 30px 60px -26px rgba(0,50,100,.5)`; botão vidro: `0 6px 14px -8px rgba(0,60,110,.45)`.
- Botão gel: fundo `--gel`, borda 1 px `--gel-bd`, sombra `inset 0 1px 0 rgba(255,255,255,.75), inset 0 -3px 8px rgba(0,50,110,.25), 0 10px 20px -8px var(--gel-sh)`, texto `--gel-fg` com `text-shadow 0 1px 1px var(--gel-ts)`.

### Cores fixas
Erro #b0284a · perigo #a3203f · sucesso de ação #2d7a12 · sync ok #2fae4f · sync alerta #d08a00 · neutro #6b8595 · aviso âmbar fundo rgba(255,236,190,.8) texto #4a3300 · destaque de busca rgba(166,231,86,.75).

### Temas (variáveis CSS trocadas no `:root`)
Cada tema define: `--bg` (fundo), `--gel`, `--gel-fg` (padrão #fff), `--gel-bd`, `--gel-sh`, `--gel-ts`, `--acc`, `--acc-d`, `--acc-dd`, `--ring`, `--acc-a`, `--ink`, `--ink2`, `--ink3`, `--ink4`, `--lock`, `--sb` (texto da status bar). **Padrão: Turquesa.** Ordem na escolha: Turquesa, Azul, Verde, Amarelo, Laranja, Vermelho, Rosa, Roxo, Pôr do sol, Noite.

O fundo de cada tema = camadas `radial-gradient(55% 45% at 10% 6%, rgba(255,255,255,.6), transparent 62%)`, `radial-gradient(50% 60% at 90% 16%, A, transparent 60%)`, `radial-gradient(55% 55% at 78% 94%, B, transparent 62%)`, `radial-gradient(32% 34% at 16% 90%, C, transparent 70%)` sobre um gradiente linear D:

| Tema | A · B · C | D (linear) | gel (180deg: 0 / 48 / 52 / 100%) | acc / acc-d / acc-dd | ink / ink2 / ink3 / ink4 |
|---|---|---|---|---|---|
| Turquesa | #b8ff8a · #4fb8ff · rgba(255,240,140,.5) | 160deg #00b8c8, #1fd0c8 45%, #4fe0b0 80%, #9af0b8 | #8aeef0 / #0aa0b0 / #008494 / #0092a2 | #0a9aaa / #00707c / #008494 | #08302f / #335a58 / #244a48 / #135a5a |
| Azul | #c6f66c · #33e1c1 · rgba(255,138,204,.55) | 160deg #1d9cf0, #29c3e6 45%, #5ad98a 80%, #a8e24d | #5cc8f7 / #1a8fd6 / #0876c0 / #0c84cb | #1a8fd6 / #0a6fae / #0876c0 | #0c2b40 / #35566b / #24485e / #1f4a63 |
| Verde | #e8ff6a · #2fd8c8 · rgba(255,220,90,.55) | 160deg #1fb35a, #3fcf6a 45%, #7fe04a 80%, #c4ec4d | #8ee27a / #2a9a3e / #1c8030 / #248c37 | #27973d / #136a27 / #1c8030 | #0d2e16 / #36573d / #274a2f / #1f5530 |
| Amarelo | #fff7a0 · #ffb04a · rgba(140,230,120,.5) | 160deg #ffc814, #ffd83a 45%, #ffe866 80%, #f4f58a | #fff3a8 / #ffd12e / #f5b800 / #ffc414 · **gel-fg #3a2a00** | #d99a00 / #7a5000 / #a86e00 | #2e2300 / #5c4a1a / #4a3a10 / #6a4a00 |
| Laranja | #ffe066 · #ff6f91 · rgba(90,220,230,.55) | 160deg #ff8a1f, #ffa53a 45%, #ffc94a 80%, #ffe27a | #ffb366 / #e56a0a / #c9520a / #d85f0c | #e0680c / #a84600 / #c9520a | #3a1f0a / #664226 / #553618 / #6e3a12 |
| Vermelho | #ffb14a · #ff4f9a · rgba(255,210,120,.55) | 160deg #e8243a, #f2474a 45%, #ff6a5c 80%, #ff9a6a | #ff9a9a / #d8283e / #b81c30 / #c8243a | #d42a40 / #9e1428 / #b81c30 | #3a0d14 / #663840 / #552a31 / #7a1e2c |
| Rosa | #ffc27a · #c79bff · rgba(120,220,255,.5) | 160deg #ff4fa0, #ff6fb4 45%, #ff94c2 80%, #ffb8a8 | #ffa3cf / #e0357f / #c42068 / #d22a74 | #d62c78 / #a3155a / #c42068 | #3a0c24 / #6a3a52 / #582a42 / #8a1e52 |
| Roxo | #ff8ad8 · #6fb8ff · rgba(255,200,120,.5) | 160deg #6a3cf0, #8a52f2 45%, #b36af0 80%, #e08af2 | #c2a0ff / #7a3fe0 / #6128c8 / #6e33d4 | #7a3fe0 / #5a22b8 / #6128c8 | #221040 / #4c3a6a / #3c2a5a / #4a2a80 |
| Pôr do sol | #ffd36a · #7a4fe0 · rgba(255,120,160,.55) | 170deg #ff9a3c, #ff6a6a 40%, #e0508f 70%, #8a4fd0 | #ffb89a / #e8505a / #c93a52 / #d84458 | #e04a5a / #a8283c / #c93a52 | #351020 / #643a4a / #522a3a / #7a2a40 |
| Noite | aurora: rgba(80,255,180,.45) 20% 0 · rgba(160,90,240,.55) 90% 20% · rgba(40,160,255,.4) 70% 100% | 165deg #081634, #0e2456 50%, #1c1f5a | #7ab8ff / #2f6ae0 / #1f52c4 / #285ed2 | #2f6ae0 / #1a45a8 / #1f52c4 | #0c1a3a / #3a4a6a / #2a3a5a / #23407a |

Noite também usa vidros mais opacos (`--glass` rgba(235,245,255,.8→.66), `--glass2` rgba(245,250,255,.94→.85)) e `--sb:#fff`. `--ring` ≈ versão clara do acento a .42–.5; `--acc-a` = acento a .5. Valores exatos de `--ring`, `--gel-bd`, `--gel-sh`, `--gel-ts` e `--lock` por tema estão em `THEMES` no protótipo.

## Assets
- `assets/memoras-icon.png` — ícone do app (cadeado de vidro sobre quadrado em gradiente), 512 px, recortado da proposta do Canva. Usado **só** como favicon/ícone do app; a logo **não aparece dentro das telas**. Pedir ao dono do produto os arquivos finais (PNG transparente / SVG) para gerar ícones iOS/Android/desktop.
- Ícones de interface: traço 2.2–2.3 px, pontas arredondadas, 20–24 px (lupa, arquivo-caixa, lixeira, engrenagem estilo Lucide "settings", calendário, página com linhas para "Diário", voltar ‹). Recomenda-se usar Lucide ou equivalente.
- Fontes: Google Fonts (Source Sans 3, Source Code Pro).

## Files
- `Memoras.dc.html` — protótipo completo (template + lógica na classe `Component`: temas em `THEMES`/`THEME_META`, regras de PIN em `pressKey/submitPin`, regra das 2 h em `renderVals` → `segs`, busca com normalização de acentos em `normMap`).
- `support.js` — runtime necessário só para abrir o protótipo.
- `assets/memoras-icon.png` — ícone.
- `briefing-original.md` — briefing de produto original.
