// L6 (cursor): o recebimento por cursor de updated_at traz todas as linhas, mesmo com gravação no meio.
// Saída 1 se faltar linha. Roda em Node; importa só src/lib/pull.ts (sem dependências do app).
import { pullAll, PULL_PAGE } from '../../src/lib/pull.ts';

const iso = n => new Date(Date.UTC(2026, 0, 1) + n * 1000).toISOString();
const id = n => 'r' + String(n).padStart(5, '0');

// Tabela em memória com a mesma consulta que o sync.ts monta.
function server(rows, onPage) {
  let calls = 0;
  const page = async q => {
    onPage?.(rows, ++calls);
    let r = [...rows].sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id));
    if (q.exact !== undefined) r = r.filter(x => x.updated_at === q.exact).slice(q.offset ?? 0, (q.offset ?? 0) + PULL_PAGE);
    else {
      if (q.after !== undefined) r = r.filter(x => x.updated_at > q.after);
      else if (q.from) r = r.filter(x => x.updated_at >= q.from);
      r = r.slice(0, PULL_PAGE);
    }
    return r.map(x => ({ ...x }));
  };
  return page;
}

async function run(rows, onPage, since = null) {
  const got = new Map();
  await pullAll(server(rows, onPage), since, r => got.set(r.id, r.updated_at));
  return got;
}

let falhou = false;

// Caso 1: 1.200 linhas; entre a primeira e a segunda página uma linha antiga é regravada (vai para o fim).
{
  const rows = Array.from({ length: 1200 }, (_, i) => ({ id: id(i), updated_at: iso(i) }));
  const got = await run(rows, (t, call) => { if (call === 2) t[0].updated_at = iso(5000); });
  const faltam = rows.filter(r => !got.has(r.id)).length;
  console.log('caso 1 (regravação no meio): faltaram', faltam, 'de', rows.length);
  // A linha regravada já foi vista antes; as outras 1.199 precisam ter chegado.
  if (faltam > 0) falhou = true;
}

// Caso 2: 700 linhas com o mesmo updated_at, mais linhas antes e depois.
{
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: 'a' + i, updated_at: iso(i) })),
    ...Array.from({ length: 700 }, (_, i) => ({ id: id(i), updated_at: iso(100) })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: 'z' + i, updated_at: iso(200 + i) })),
  ];
  const got = await run(rows);
  const faltam = rows.filter(r => !got.has(r.id)).length;
  console.log('caso 2 (700 no mesmo instante): faltaram', faltam, 'de', rows.length);
  if (faltam > 0) falhou = true;
}

// Caso 3: 1.000 linhas todas no mesmo instante, com cursor inicial.
{
  const rows = Array.from({ length: 1000 }, (_, i) => ({ id: id(i), updated_at: iso(7) }));
  const got = await run(rows, undefined, iso(7));
  const faltam = rows.filter(r => !got.has(r.id)).length;
  console.log('caso 3 (1000 no mesmo instante, com since): faltaram', faltam, 'de', rows.length);
  if (faltam > 0) falhou = true;
}

if (falhou) { console.log('BUG L6 presente'); process.exit(1); }
console.log('ok');
