// Recebimento paginado por cursor de updated_at. Paginar por posição (range) pula linhas quando
// outra gravação acontece entre duas páginas; o cursor não depende da posição.
// Sem imports do app, para rodar também no Node (testes).

// from: updated_at >= from (null: sem filtro). after: updated_at > after.
// exact + offset: só as linhas daquele instante, a partir da posição offset.
export interface PullQuery { from: string | null; after?: string; exact?: string; offset?: number }
export const PULL_PAGE = 500;

export async function pullAll<T extends { id: string; updated_at: string }>(
  page: (q: PullQuery) => Promise<T[]>, since: string | null, onRow: (r: T) => void,
): Promise<void> {
  const seen = new Map<string, string>();
  const take = (rows: T[]) => {
    for (const r of rows) {
      if (seen.get(r.id) === r.updated_at) continue;
      seen.set(r.id, r.updated_at);
      onRow(r);
    }
  };
  let q: PullQuery = { from: since };
  for (;;) {
    const rows = await page(q);
    take(rows);
    if (rows.length < PULL_PAGE) return;
    const last = rows[rows.length - 1].updated_at;
    if (rows[0].updated_at === last) {
      // Página cheia toda no mesmo instante: lê o resto dele por posição e segue para o próximo instante.
      for (let offset = PULL_PAGE; ; offset += PULL_PAGE) {
        const more = await page({ from: null, exact: last, offset });
        take(more);
        if (more.length < PULL_PAGE) break;
      }
      q = { from: null, after: last };
    } else q = { from: last };
  }
}
