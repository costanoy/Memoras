# Memoras — Briefing para Claude Design

Sep 28, 2026 · @Vini

## Contexto

Memoras é um diário pessoal digital: escrever rápido, reler depois, tudo privado. O protótipo deve mostrar o app completo em **computador e celular**, com o novo visual Frutiger Aero + Liquid Glass colorido.

Pontos do produto que afetam o design:

- Funciona 100% offline; só a sincronização entre aparelhos usa internet.
- Conta com email e senha é opcional: sem conta, o app funciona só no aparelho.
- Criptografia de ponta a ponta, com chave de recuperação gerada no cadastro.
- PIN local opcional, independente da senha da conta.
- Anotações sempre editáveis, sem trava de tempo.
- Edições feitas em dois aparelhos se juntam automaticamente.

## Estilo visual

Frutiger Aero misturado com Liquid Glass, mas **colorido**: vidro translúcido e fosco sobre fundos vivos, nunca o liquid glass branco ou monocromático. A sensação deve ser limpa, luminosa e otimista, como o início dos anos 2010. O visual antigo de caderno de papel (linhas pautadas, laranja/creme, serifas) não deve aparecer.

**Fundo e cores**

- Gradientes vivos e suaves por trás de tudo: azul-céu, água, verde-lima, com toques de outras cores vivas.
- Elementos típicos do Frutiger Aero usados com moderação: bolhas, reflexos de luz, brilho de lente, formas orgânicas.

**Superfícies de vidro** (barras, menus, cartões, botões, modais)

- Translúcidas, com desfoque do fundo e leve tom da cor que está atrás.
- Borda fina clara e reflexo brilhante no topo, como vidro polido.
- Cantos bem arredondados, sombras suaves e difusas.
- Botões com aspecto de gel brilhante.

**Área de leitura e escrita**

- Fundo suave e quase sólido, como um “vidro leitoso”, com um leve tom da mesma paleta e os mesmos cantos e bordas.
- Precisa combinar com o resto do app, mas nunca competir com o texto: contraste alto e leitura confortável em textos longos.

**Tipografia**

- Sans-serif humanista, limpa e amigável, no espírito da Frutiger.
- Tamanho e entrelinha generosos na área de escrita.

## Telas

Cada tela deve ser pensada para uso real nos dois formatos. No **computador**: barra lateral com histórico e editor ao lado. No **celular**: navegação por abas, com lista e editor em telas separadas.

| Tela | O que precisa ter |
| --- | --- |
| Desbloqueio por PIN | Teclado de PIN em vidro; ao acertar, toca a animação da chave (seção abaixo) |
| Primeiro uso | Dar nome ao diário; escolher entre usar só no aparelho ou criar conta; ativar PIN (opcional) |
| Cadastro e login | Email e senha; link “Esqueci minha senha” |
| Chave de recuperação | Mostrada uma única vez; copiar, salvar como arquivo, imprimir, “Enviar para meu email” (altamente recomendado, abre o app de email do aparelho); aviso de que quem acessar o email acessa o diário e recomendação de verificação em duas etapas; confirmação “Guardei minha chave” |
| Esqueci minha senha | Redefine o login e pede a chave de recuperação para reabrir as anotações, deixando isso claro |
| Histórico (início) | Todas as anotações, agrupadas e navegáveis por data (com calendário); nome do diário no topo; botão de nova anotação em destaque |
| Editor | Título opcional e texto livre; horário de quando cada trecho foi escrito (ver abaixo) |
| Busca | Campo de busca e resultados com o trecho encontrado destacado |
| Arquivo | Anotações arquivadas, com opção de desarquivar |
| Lixeira | Restaurar ou apagar para sempre, com confirmação |
| Configurações | Nome do diário; PIN (ativar, trocar, desativar); conta e sincronização; chave de recuperação |

**Horários no editor:** o horário aparece discreto no início de cada trecho. Quem volta a escrever em menos de 2 horas continua no mesmo trecho, sem horário novo. Depois de 2 horas sem escrever, um novo horário aparece antes do trecho seguinte. Não há nenhuma outra quebra ou regra.

## Animação de desbloqueio

Uma chave abrindo uma fechadura, **extremamente rápida**, tocada só quando o PIN é aceito. Quem não usa PIN nunca a vê.

1. O PIN correto é digitado.
2. A chave de vidro brilhante gira na fechadura, e um reflexo de luz passa por ela.
3. A fechadura se abre e dá lugar ao histórico, sem pausa.

Fechadura e chave no estilo do app: translúcidas, brilhantes, coloridas. Com “reduzir movimento” ligado no aparelho, a animação vira uma transição simples.

## Estados a mostrar

- **Sincronização:** sincronizado, sincronizando, offline (o app segue funcionando normalmente) e erro. Indicador discreto, sem alarmar.
- **Sem conta:** app usado só no aparelho, com convite leve para criar conta.
- **Vazios:** nenhuma anotação ainda, busca sem resultado, arquivo vazio, lixeira vazia.
- **PIN:** PIN errado, com o teclado reagindo de forma suave.
- **Chave de recuperação:** chave mostrada, chave copiada ou salva, confirmação de que foi guardada.
- **Ações:** confirmação de apagar para sempre, aviso após arquivar ou mandar para a lixeira com opção de desfazer.

## Acessibilidade e fora do escopo

**Acessibilidade**

- Texto sobre vidro sempre legível: contraste suficiente mesmo com fundos vivos por trás.
- Respeitar “reduzir movimento” e “reduzir transparência” do aparelho, com versões mais sólidas das superfícies.
- Áreas de toque confortáveis no celular.

**Fora do escopo deste protótipo**

- Implementação de criptografia, sincronização e Supabase: isso fica para o Claude Code. O protótipo só precisa mostrar as telas e os estados ligados a essas partes.
