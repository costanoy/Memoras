// L14: caderno vazio já enviado vira lápide ao trocar de tela; se outro aparelho escreveu nele, a junção descarta o texto.
import { blankDoc, tombstoneItem, mergeItem, isBlankItem } from '../../src/lib/items.ts';
const A = { ...blankDoc('d'), pushed: true, syncedRev: 1, rev: 1 };      // vazio, já enviado
if (!isBlankItem(A)) { console.log('premissa falsa: não é branco'); process.exit(2); }
const lapideA = tombstoneItem(A);                                          // cleanItems (store.ts:272-280)
const doB = { ...blankDoc('d'), kind: 'doc', title: 'Ideias', titleTs: 5, body: 'texto escrito em B', bodyTs: 6 };
const { merged, copy } = mergeItem(lapideA, doB);
console.log('resultado:', JSON.stringify({ deleted: merged.deleted, body: merged.body, copy: !!copy }));
if (merged.deleted && !merged.body && !copy) { console.log('BUG L14: o texto de B foi descartado'); process.exit(1); }
console.log('ok');
