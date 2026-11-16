// L13: mover uma tarefa de um dia que não é hoje para o dia seguinte avisa "amanhã".
import { start, stop, ctx, seedCfg, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  await seedCfg(p, { onboarded: true }); await p.reload(); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const m = await import('/src/store.ts'), it = await import('/src/lib/items.ts');
    const dia = it.addDays(it.todayKey(), 10);   // um dia que não é hoje
    m.addTask(dia, 'teste'); const t = m.get().items.find(i => i.kind === 'task');
    m.moveTask(t.id, it.addDays(dia, 1));
    return { toast: m.get().toast?.text, destino: it.addDays(dia, 1), amanha: it.addDays(it.todayKey(), 1) };
  });
  console.log(JSON.stringify(r));
  fail = r.destino !== r.amanha && /amanhã/.test(r.toast);
  console.log(fail ? 'BUG L13: o aviso diz amanhã para um destino que não é amanhã' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
