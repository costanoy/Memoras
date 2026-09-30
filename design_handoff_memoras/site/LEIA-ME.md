# Site do Memoras (memoras.cyberhat.com.br)

Site estático: HTML, CSS, imagens e um script pequeno para a troca de cor. Basta subir o conteúdo desta pasta para a raiz do domínio.

## Arquivos
- `index.html`: página inicial.
- `privacidade.html`: política de privacidade, usada na publicação no Google Play.
- `styles.css`: estilos, com os 10 temas de cor em `[data-theme]`. O padrão é turquesa.
- `site.js`: troca de cor pelo cartão "10 cores", salva em `localStorage` na chave `memoras-site-cor`.
- `img/memoras-icon.png`: ícone do app. Só aparece no site, nunca dentro do app.
- `previa-celular.html`: ferramenta de revisão. **Não publicar.**

## Links de download
- Windows: https://github.com/costanoy/Memoras/releases/latest/download/Memoras-Setup.exe
- Android: https://github.com/costanoy/Memoras/releases/latest/download/Memoras.apk (confirmar o nome do arquivo)

## Regras (decisões do dono do produto)
- **Não incluir link ou seção de "Versões anteriores"** nem nenhum link para a lista de releases do GitHub. Só os links diretos de download acima.
- Rodapé: apenas "Privacidade" e o texto "Memoras · cyberhat.com.br".
- Contato para apagar a conta: cyberhat.tech@gmail.com
- Textos em pt-BR, **sem travessões (—)**.
- O site não é o app: não tem login nem escrita de anotações.
- Funcionar a partir de 360 px de largura; respeitar `prefers-reduced-motion` e `prefers-reduced-transparency`; contraste de texto de pelo menos 4.5:1 sobre o vidro.
- Espaçamento: nas seções use `padding-top` e `padding-bottom` separados, para não zerar as margens laterais de `.wrap`.
