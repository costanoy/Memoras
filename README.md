# Memoras

Diário pessoal privado para computador e celular. Feito a partir de `design_handoff_memoras/`.

É um app web instalável (PWA): React + Vite + TypeScript. A mesma base serve os dois formatos; abaixo de 720 px de largura entra o layout de celular.

## Rodar

```
npm install
npm run dev       # desenvolvimento
npm run build     # gera dist/
npm run preview   # serve dist/ (com uso offline)
```

Precisa de `https` ou `localhost`, porque a criptografia usa a Web Crypto do navegador.

## App de Windows (.exe)

```
npm run desktop   # abre o app de desktop sem instalar
npm run dist      # gera release/Memoras-Setup-<versão>.exe
npm run release   # publica .exe e .apk no GitHub Releases
```

O app instalado procura versão nova em `github.com/costanoy/Memoras` (Releases) ao abrir e a cada 4 horas, baixa em segundo plano e instala ao fechar. Para lançar uma versão: suba o `version` no `package.json`, defina `GH_TOKEN` e rode `npm run release`; depois publique o rascunho de release que aparece no GitHub. O arquivo `latest.yml` precisa ir junto com o `.exe`, é ele que o app consulta.

O instalador não tem assinatura digital, então o Windows mostra o aviso do SmartScreen na primeira instalação.

## App de Android (.apk)

```
npm run apk       # gera release/Memoras.apk assinado
npm run release   # publica .exe e .apk juntos no release v<versão>
```

O APK é assinado com a chave em `~/.memoras/` (`memoras-release.jks` e `keystore.properties`), fora do repositório. **Faça backup dessa pasta:** sem ela, nenhuma versão nova instala por cima da atual, e quem já tem o app precisaria desinstalar e perder os dados do aparelho.

A versão do app (Windows e Android) vem do `version` do `package.json`. Suba esse número antes de cada `npm run release`.

## Contas e sincronização (opcional)

Sem configuração o app funciona inteiro, só no aparelho. Para ligar contas:

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Copie `.env.example` para `.env` e preencha a URL e a chave anônima.
3. Em Authentication, URL Configuration, coloque o endereço do app em Site URL e Redirect URLs (o link de "Esqueci minha senha" volta para ele).

## Como os dados ficam

- **No aparelho:** IndexedDB (`memoras`). Anotações e preferências.
- **No servidor:** só texto cifrado (AES-GCM). Uma chave do diário é criada no aparelho e guardada no servidor cifrada duas vezes: com a senha e com a chave de recuperação. A senha digitada não é enviada; o login usa um valor derivado dela.
- **PIN:** é uma tranca da tela neste aparelho, guardada como hash. Não cifra os dados no disco.
- **Junção entre aparelhos:** cada trecho, o título e o estado da anotação carregam o horário da última mudança; vale o mais recente de cada um (`merge` em `src/lib/notes.ts`).

## Onde está cada coisa

- `src/store.ts`: estado, navegação, anotações, regras do PIN.
- `src/sync.ts`: conta, chaves e sincronização com o Supabase.
- `src/lib/`: criptografia, IndexedDB, modelo das anotações e datas.
- `src/screens/`: as telas. `src/styles.css` e `src/themes.ts`: visual e os 10 temas.
