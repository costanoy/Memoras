// L15: o init abre a etapa de senha nova mesmo com o app travado, sem repetir a conferência de conta (lockedGuard).
// O evento PASSWORD_RECOVERY de outra conta chegou antes do init: sync.ts:400 deixa passar (cfg ainda padrão) e marca recoveryPending.
import { start, stop, ctx, seedCfg, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  await seedCfg(p, { onboarded: true, pinOn: true, pinHash: 'x', pinSalt: 'x', account: { email: 'a@a.com', userId: 'user-A', dkId: 'd', pwSalt: 's', pwHash: 'h' } });
  await p.reload(); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const m = await import('/src/store.ts');
    const antes = m.get().screen;
    m.hooks.recoveryPending = true;   // evento de recuperação de outra conta (user-B) já aceito antes do init
    await m.init();
    return { antes, depois: m.get().screen, unlocked: m.get().unlocked, fStep: m.get().fStep };
  });
  console.log(JSON.stringify(r));
  fail = r.depois === 'forgot' && r.unlocked === false;
  console.log(fail ? 'BUG L15: app travado abriu a etapa de senha nova sem conferir a conta' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
