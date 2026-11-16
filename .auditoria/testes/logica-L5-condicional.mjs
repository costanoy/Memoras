// L5 (condicional): quando o envio condicional falha porque outro aparelho gravou no meio,
// a junção com o base antigo mantém o texto daqui e guarda o de lá como "(outra versão)".
// Saída 1 se o texto de B se perder. Roda em Node, só com src/lib/items.ts.
import { blankDoc, itemContent, mergeItem } from '../../src/lib/items.ts';

// "Servidor": uma linha com o conteúdo e o updated_at.
const server = { c: null, updated_at: '2026-01-01T00:00:00.000000+00:00' };

// Caderno que A e B já sincronizaram: mesmo texto, base igual ao texto, srv igual ao updated_at.
const comum = { ...blankDoc('d1'), title: 'Receita', titleTs: 10, body: 'texto original', bodyTs: 10, rev: 1, syncedRev: 1, pushed: true, base: 'texto original', srv: server.updated_at };
server.c = itemContent(comum);
let A = { ...comum, body: 'texto do A', bodyTs: 20, rev: 2 };   // A editou e vai enviar
const B = { ...comum, body: 'texto do B', bodyTs: 30, rev: 2 };  // B editou e enviou antes

// B grava no servidor: updated_at muda.
server.c = itemContent(B);
server.updated_at = '2026-01-01T00:00:05.000000+00:00';

// Envio condicional de A: .eq('updated_at', A.srv) não casa com o servidor, então não grava.
const casou = A.srv === server.updated_at;
let falhou = false;
if (casou) { console.log('o envio condicional deveria falhar'); falhou = true; }

// A junta a linha de B com o próprio base antigo (como o recebimento faz).
const { merged, copy } = mergeItem(A, server.c);
console.log('texto de A depois da junção:', merged.body);
console.log('cópia:', copy ? copy.title + ' / ' + copy.body : 'nenhuma');
if (merged.body !== 'texto do A') { console.log('o texto de A deveria ficar'); falhou = true; }
if (!copy || copy.body !== 'texto do B' || !copy.title.endsWith('(outra versão)')) { console.log('o texto de B deveria virar cópia "(outra versão)"'); falhou = true; }

// Sem conflito: se só B mudou (A não editou), o texto de B vale e não há cópia.
const A2 = { ...comum };
const r2 = mergeItem(A2, server.c);
if (r2.merged.body !== 'texto do B' || r2.copy) { console.log('sem edição em A, B deveria valer sem cópia'); falhou = true; }

if (falhou) { console.log('BUG L5 presente'); process.exit(1); }
console.log('ok');
