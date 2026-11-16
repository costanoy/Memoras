// L1: a junção de um caderno apagado nunca dá o mesmo resultado (carimba Date.now()), então reenvia sempre.
import { blankDoc, tombstoneItem, mergeItem, sameItem, itemContent } from '../../src/lib/items.ts';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let doc = tombstoneItem({ ...blankDoc('a'), title: 'x', body: 'y', pushed: true });
let server = itemContent(doc); // o servidor já tem exatamente o que este aparelho enviou
let resends = 0;
for (let ciclo = 0; ciclo < 5; ciclo++) {
  await sleep(5);
  const { merged } = mergeItem(doc, server);          // espelha sync.ts:333-335
  if (!sameItem(merged, server)) resends++;            // syncedRev = -1 => vai reenviar
  server = merged; doc = { ...doc, ...merged };
}
console.log('reenvios em 5 ciclos sem mudança:', resends);
if (resends > 0) { console.log('BUG L1 presente'); process.exit(1); }
console.log('ok'); 
