// L11: duas tentativas erradas de PIN que se sobrepõem (verificação lenta, como num celular fraco) contam como uma.
import { start, stop, ctx, seedCfg, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  const h = await p.evaluate(async () => { const m = await import('/src/lib/crypto.ts'); return m.hashSecret('1234'); });
  await seedCfg(p, { onboarded: true, pinOn: true, pinHash: h.hash, pinSalt: h.salt, lockAfter: 5 });
  await p.reload(); await p.waitForTimeout(1500);
  // Aparelho lento: a derivação do PIN (PBKDF2, 120 mil voltas) leva 800 ms.
  await p.evaluate(() => { const d = crypto.subtle.deriveBits.bind(crypto.subtle); crypto.subtle.deriveBits = async (...a) => { const r = await d(...a); await new Promise(x => setTimeout(x, 800)); return r; }; });
  const r = await p.evaluate(async () => {
    const m = await import('/src/store.ts'), w = ms => new Promise(r => setTimeout(r, ms));
    for (const d of '9999') m.pressKey(d);       // 1ª tentativa errada: agenda a verificação em 140 ms
    await w(300);                                  // a verificação já começou e ainda não terminou
    m.pressKey('del'); m.pressKey('8');            // apaga e digita de novo: 2ª tentativa errada
    await w(8000);
    return { pinFails: m.get().cfg.pinFails };
  });
  console.log(JSON.stringify(r));
  fail = r.pinFails < 2;
  console.log(fail ? 'BUG L11: duas tentativas erradas contaram ' + r.pinFails : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
