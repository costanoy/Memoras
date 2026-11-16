# Fase 1: prints do app web (antes)

Rodada: `scripts/prints.mjs`, Vite em `localhost:5190`, Microsoft Edge (channel msedge), contexto novo (dados vazios), `*.supabase.co` abortado por `page.route`. Celular 390x844 (isMobile, hasTouch) e desktop 1440x900.
Resultado: 74 prints em `prints/antes/`, 2 falhas de clique (ambas em `desktop-agenda-calendario`), 0 erros ou warnings de console.

## Celular (37 prints)
- celular-primeiro-uso-boas-vindas: onboarding passo 1 (tema)
- celular-onboard-passo-2: armazenamento ("Só neste aparelho" / "Criar conta")
- celular-onboard-passo-3: PIN, com "Ativar PIN" já ligado
- celular-onboard-opcao-pin: opção de PIN
- celular-onboard-passo-4: fim do onboarding
- celular-criar-pin-1-digito-novo: criar PIN, após 1 dígito
- celular-criar-pin-confirmar: confirmar PIN
- celular-chave-do-pin: chave de recuperação ("Guardei minha chave")
- celular-principal-vazia: diário vazio
- celular-principal-muitos-dados: diário com 25 anotações e uma longa
- celular-editor-nova-anotacao-vazia: editor de anotação nova, vazio
- celular-editor-anotacao: editor com anotação
- celular-menu-contexto-anotacao: menu do toque longo na anotação
- celular-dialogo-lixeira-anotacao: confirmação "Mover para a lixeira"
- celular-busca-sem-resultado: busca sem resultado
- celular-busca-com-resultado: busca com resultado
- celular-cadernos-vazio: cadernos vazios
- celular-caderno-editor-novo: novo caderno, campo "Título do caderno"
- celular-cadernos-com-dados: cadernos com dados
- celular-agenda-vazia: agenda vazia
- celular-agenda-com-tarefas: agenda com tarefas
- celular-agenda-calendario: calendário da agenda
- celular-ajustes: ajustes
- celular-ajustes-pagina-inteira: ajustes, página inteira
- celular-ajustes-sem-conexao: ajustes sem conexão
- celular-tema-turquesa: tema Turquesa
- celular-tema-noite: tema Noite
- celular-resumao: Resumão
- celular-login-vazio: login, campos vazios
- celular-login-erro-email-invalido: login, e-mail inválido (validação local)
- celular-login-erro-sem-senha: login, sem senha (validação local)
- celular-cadastro-senha-curta: cadastro, senha curta (validação local)
- celular-esqueci-senha-passo-1: esqueci a senha, passo 1
- celular-esqueci-senha-email-invalido: esqueci a senha, e-mail inválido
- celular-tela-pin: tela de PIN bloqueado
- celular-pin-errado: PIN errado
- celular-esqueci-pin: "Esqueci o PIN"

## Desktop (37 prints)
Mesmas telas do celular, em 1440x900 (`desktop-<tela>.png`). Sem diferenças de tela além do layout. Não há prints adicionais.

## Falhas
- desktop agenda-calendario: clique em "Calendário" deu timeout de 3 s (locator.click). Sem print do calendário no desktop. Não investigado.
- desktop fechar calendário: clique para fechar deu timeout pelo mesmo motivo. Efeito: o print de agenda com calendário aberto e o estado seguinte podem estar afetados.

## Não capturado
- Mini-Memoras: existe só no Electron (Windows), fora do alcance do navegador. Não capturado.
- Erro de rede real no login e cadastro: exigiria enviar formulário ao Supabase, mesmo com a requisição abortada. Não capturado.
- "Esqueci a senha" passo 2 (envio de e-mail): exige rede. Só validação local.
- Console: 0 mensagens de erro ou warning. Como as requisições ao Supabase são abortadas, pode ser que erros de rede não apareçam.
