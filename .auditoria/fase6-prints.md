# Fase 6: Agente Prints (depois)

Script: `.auditoria/scripts/prints-depois.mjs` (cópia do `prints.mjs`; só mudaram a pasta de saída, `prints/depois`, e o log, `scripts/prints-log-depois.json`, para não sobrescrever o da Fase 1).
Condições: Edge headless, celular 390x844 e desktop 1440x900, Vite na porta 5190 (subido e encerrado pelo agente), `*.supabase.co` abortado.
Saída: `.auditoria/prints/depois/` (74 arquivos, mesmos nomes da pasta `prints/antes/`).
Log da execução: `.auditoria/scripts/prints-depois-run.txt`.

## Prints gerados
- 74 de 74 telas, 37 por viewport (celular e desktop). Nomes idênticos aos da Fase 1.

## Falhas
- desktop `agenda-calendario`: clique em "Calendário" deu timeout de 3 s. Mesma falha da Fase 1, não resolvida.
- desktop `fechar calendário`: clique para fechar deu timeout pelo mesmo motivo. Mesma falha da Fase 1.
- Consequência: o print `desktop-agenda-calendario.png` sai sem o calendário aberto, como na Fase 1.

## Erros de console
- 0 mensagens de erro, warning ou pageerror nas duas viewports (igual à Fase 1).

## Observações
- Os PNGs de `depois/` diferem em bytes dos de `antes/` em praticamente todos os arquivos. Não fiz comparação visual pixel a pixel, então não dá para afirmar que a tela mudou; a diferença pode ser só de renderização ou de metadados do PNG.
- Nenhuma tela quebrou, então o script não precisou de ajuste além da pasta de saída e do nome do log.
- Nada foi enviado ao Supabase real, nada foi criado em conta real e o app instalado não foi aberto.
