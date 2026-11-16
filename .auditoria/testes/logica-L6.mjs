// L6: paginação por deslocamento (range) com outra gravação no meio pula uma linha, e lastPull passa adiante dela.
// Simulação do laço de src/sync.ts:285-306 contra uma tabela em memória ordenada por (updated_at, id).
const T0 = Date.parse('2026-01-01T00:00:00Z');
let table = Array.from({ length: 1200 }, (_, i) => ({ id: 'r' + String(i).padStart(4, '0'), updated_at: new Date(T0 + i * 1000).toISOString() }));
const query = (since, from, to) => table.filter(r => !since || r.updated_at >= since)
  .sort((a, b) => a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : a.id < b.id ? -1 : 1).slice(from, to + 1);
const got = new Set(); let lastPull = null, page = 0;
for (let from = 0; ; from += 500) {
  const data = query(null, from, from + 499);
  for (const r of data) { got.add(r.id); if (!lastPull || r.updated_at > lastPull) lastPull = r.updated_at; }
  if (page++ === 0) { // outro aparelho edita uma anotação antiga enquanto esta pagina: o servidor carimba updated_at novo
    const row = table.find(r => r.id === 'r0010'); row.updated_at = new Date(T0 + 5000000).toISOString();
  }
  if (data.length < 500) break;
}
// próximo ciclo: só pede o que for >= lastPull - 60 s
const since = new Date(Date.parse(lastPull) - 60000).toISOString();
for (const r of query(since, 0, 9999)) got.add(r.id);
const faltam = table.filter(r => !got.has(r.id)).map(r => r.id);
console.log('recebidas:', got.size, 'de', table.length, 'faltam:', faltam.join(','));
if (faltam.length) { console.log('BUG L6: linha(s) nunca recebida(s)'); process.exit(1); }
console.log('ok');
