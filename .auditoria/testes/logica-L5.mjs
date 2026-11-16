// L5: dois aparelhos editam o mesmo caderno e enviam em sequência com upsert cego; a edição do primeiro some sem cópia.
// Simulação fiel a sync.ts: pull -> mergeItem -> envio por upsert (sobrescreve a linha) -> base = texto enviado.
import { blankDoc, mergeItem, itemContent } from '../../src/lib/items.ts';
const X0 = 'linha comum';
const mk = (body, ts) => ({ ...blankDoc('d'), title: 't', titleTs: 1, body, bodyTs: ts, base: X0, pushed: true, rev: 1, syncedRev: 0 });
let A = mk('linha comum\nedição de A', 200), B = mk('linha comum\nedição de B', 100);
let server = itemContent({ ...blankDoc('d'), title: 't', titleTs: 1, body: X0, bodyTs: 50 });
// A e B fazem o pull quando o servidor ainda tem X0 (nada a juntar). Depois:
server = itemContent(B); B = { ...B, base: B.body };      // B envia primeiro
server = itemContent(A); A = { ...A, base: A.body };      // A envia depois, por cima (upsert cego)
const copies = [];
const { merged, copy } = mergeItem(B, server);             // B recebe o que está no servidor
if (copy) copies.push(copy);
const todas = [merged.body, ...copies.map(c => c.body)].join('\n---\n');
console.log('B termina com:\n' + todas);
const preservou = todas.includes('edição de B');
if (!preservou) { console.log('BUG L5: a edição de B se perdeu nos dois aparelhos, sem cópia "(outra versão)"'); process.exit(1); }
console.log('ok');
