# Memoras

Diário pessoal — React + Vite, com armazenamento local (IndexedDB) e sincronização
opcional na nuvem via Firebase.

## Rodando localmente

```bash
npm install
npm run dev
```

## Gerando o site para publicar

```bash
npm run build
```

O resultado fica na pasta `dist/`. Publique **o conteúdo** dessa pasta (o `index.html`
e a pasta `assets/`) na raiz do site/subdomínio. Não envie o código-fonte.

## Sincronização na nuvem (Firebase)

Sem configuração, o app funciona normalmente, só que **local**: cada aparelho tem seu
próprio diário e nada sai do navegador. Para ligar contas e sincronização:

### 1. Criar o projeto

1. Acesse <https://console.firebase.google.com> e crie um projeto (plano Spark, gratuito).
2. Em **Criação › Authentication**, clique em *Começar* e ative o provedor **E-mail/senha**.
3. Em **Criação › Firestore Database**, crie o banco (escolha a região mais próxima, ex.: `southamerica-east1`).
4. Em **Configurações do projeto › Seus aplicativos**, adicione um app **Web** e copie os dados do SDK.

### 2. Preencher as credenciais

Copie `.env.example` para `.env` e preencha com os valores do passo anterior:

```bash
cp .env.example .env
```

Esses valores **não são segredo** — eles ficam visíveis no código de qualquer site que
use Firebase, por design. A segurança vem das regras do banco, no passo seguinte.

Depois de preencher, rode `npm run build` de novo: só a partir daí a tela de conta
passa a funcionar.

### 3. Aplicar as regras de segurança (obrigatório)

No console do Firebase, em **Firestore Database › Regras**, cole o conteúdo do arquivo
[`firestore.rules`](./firestore.rules) e publique.

Sem isso o banco fica aberto para qualquer pessoa. As regras garantem que cada usuário
só consegue ler e escrever as próprias anotações.

### Como os dados ficam organizados

```
users/{uid}/entries/{entryId}
```

- **Deslogado:** tudo em IndexedDB, no próprio aparelho.
- **Logado:** tudo no Firestore, que mantém cache offline — dá para escrever sem internet
  e sincroniza sozinho quando a conexão volta.
- **No primeiro login em cada aparelho**, as anotações que já existiam localmente são
  enviadas para a conta, sem duplicar as que já estavam na nuvem.

O **PIN** da tela de bloqueio é sempre local: ele trava o aplicativo naquele aparelho e
é independente da conta.
