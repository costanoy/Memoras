# Memoras — Diário Pessoal

**Resumo curto (para usar como legenda/descrição rápida):**
Memoras é um diário pessoal com sincronização entre celular e computador, com visual de caderno de verdade — pauta, tipografia serifada, capa laranja — e uma regra central: cada anotação vira somente-leitura 24h depois de escrita, preservando o registro original do dia sem edições posteriores.

---

## O que é

Um diário digital pessoal, pensado para ser usado todo dia como um caderno físico: o usuário escreve sobre uma pauta (linhas de caderno), com data e hora registradas automaticamente. Passadas 24h da criação, a anotação trava e vira leitura — o texto daquele dia fica congelado, do jeito que foi escrito.

O projeto nasceu de um protótipo visual feito no Claude Design e evoluiu para um aplicativo web completo, com contas de usuário, sincronização na nuvem e instalável como app (PWA).

## O que ele faz

- **Escrita com regras de diário real:** parágrafos ganham uma linha tracejada com horário quando passam 2h desde a última edição — como marcar o momento em que voltou a escrever no mesmo dia.
- **Trava automática de 24h:** depois desse prazo, a anotação vira somente-leitura; só o título continua editável depois (para poder organizar/nomear anotações antigas sem alterar o conteúdo).
- **Histórico, busca, arquivo e lixeira:** grade de anotações, busca por qualquer palavra já escrita (com busca sem distinção de acentos), arquivamento e lixeira reversível (com exclusão definitiva só após confirmação).
- **Segurança local:** PIN numérico opcional para travar o app no aparelho, com senha nunca guardada em texto puro.
- **Conta e sincronização:** login por e-mail/senha, com as anotações sincronizando entre celular e computador; funciona também offline, sincronizando depois que a conexão volta.
- **Dois layouts, um só código:** no celular, navegação por telas com botão flutuante; no computador, painel lateral fixo com uma "timeline" que funciona como a própria barra de rolagem — arrasta para percorrer as anotações por data, ao estilo da galeria de fotos do Android.
- **Instalável como app (PWA):** ícone, tela cheia, funciona offline.
- **Suporte ao botão físico de voltar do Android:** dentro de uma anotação, voltar retorna ao histórico em vez de fechar o app.

## Como foi construído

**Linguagens e stack principal**
- **JavaScript (React 19)** — toda a interface, sem TypeScript.
- **Vite** — build e servidor de desenvolvimento.
- **CSS puro** — sem framework (sem Tailwind/Bootstrap); variáveis CSS para o tema, grid e flexbox para o layout responsivo.
- **IndexedDB** (via biblioteca `idb`) — armazenamento local, offline-first.
- **Firebase** (Authentication + Firestore) — contas de usuário e sincronização na nuvem, carregado sob demanda (só baixa esse código para quem realmente faz login, mantendo o app leve para uso 100% local).
- **Web Crypto API** — hash do PIN local (SHA-256 + salt), sem depender de bibliotecas externas de criptografia.

**Decisões técnicas que valem destacar**
- **Camada de repositório:** o app troca automaticamente entre gravar no IndexedDB (deslogado) ou no Firestore (logado) sem o resto do código saber a diferença — e migra anotações locais para a nuvem no primeiro login, sem duplicar.
- **Seleção de texto entre múltiplos campos:** cada parágrafo é uma caixa de texto separada (para permitir os carimbos de horário entre parágrafos), então foi construída uma camada de "selecionar tudo" (Ctrl+A) que funciona como se fosse um único editor de texto contínuo.
- **Barra de rolagem que também é navegação por data:** um componente customizado, sincronizado nos dois sentidos com a rolagem da lista.
- **Design system publicado para iteração visual:** os componentes reais do app foram exportados como um pequeno design system, permitindo redesenhar visualmente e trazer as mudanças de volta ao código.
- Aplicação de fase — projeto evoluiu em etapas (protótipo visual → MVP local → contas e nuvem → PWA), com cerca de 3.800 linhas de código organizadas em ~30 arquivos.

**Publicação**
Build estático gerado pelo Vite, hospedado na Hostinger.
