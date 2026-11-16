import { describe, expect, it } from 'vitest';
import { blankDayNote, blankDoc, blankTask, itemContent, mergeItem, parseItem, sameItem, type Doc, type DocContent } from '../src/lib/items';

const doc = (o: Partial<Doc> = {}): Doc => ({ ...blankDoc('d1'), created: 1000, title: 'Caderno', titleTs: 5, body: 'texto', bodyTs: 5, ...o });

// Formas gravadas por versões antigas: sem os campos que ainda não existiam.
const semCampos = (d: Doc, ...campos: string[]) => { const o = { ...d } as Record<string, unknown>; for (const c of campos) delete o[c]; return o as unknown as Doc; };

describe('items: compatibilidade com versões antigas', () => {
  it('itemContent() de caderno sem color, colorTs, pinned e pinnedTs devolve os padrões', () => {
    const a = itemContent(semCampos(doc(), 'color', 'colorTs', 'pinned', 'pinnedTs')) as DocContent;   // 1.1.0
    const b = itemContent(semCampos(doc({ color: 'azul', colorTs: 3 }), 'pinned', 'pinnedTs')) as DocContent;   // 1.1.1 e 1.1.2
    const c = itemContent(doc({ color: 'azul', colorTs: 3, pinned: true, pinnedTs: 4 })) as DocContent;   // 1.1.3 em diante
    expect([a.color, a.colorTs, a.pinned, a.pinnedTs]).toEqual(['', 0, false, 0]);
    expect([b.color, b.colorTs, b.pinned, b.pinnedTs]).toEqual(['azul', 3, false, 0]);
    expect([c.color, c.pinned, c.pinnedTs]).toEqual(['azul', true, 4]);
  });

  it('nenhum conteúdo de caderno, tarefa ou observação tem a chave segs', () => {
    const itens = [doc(), blankTask('t1', '2026-01-01', 'x'), blankDayNote('n1', '2026-01-01')];
    for (const i of itens) expect('segs' in itemContent(i)).toBe(false);
  });

  it("status 'archived' atravessa itemContent, parseItem e mergeItem com o mesmo nome", () => {
    const arq = doc({ status: 'archived', statusTs: 9 });
    expect((itemContent(arq) as DocContent).status).toBe('archived');
    expect((parseItem(JSON.parse(JSON.stringify(itemContent(arq)))) as DocContent).status).toBe('archived');
    expect((mergeItem(doc(), itemContent(arq)).merged as DocContent).status).toBe('archived');
    expect((mergeItem(arq, itemContent(doc())).merged as DocContent).status).toBe('archived');
  });

  it('mergeItem devolve "fixado" pelo pinnedTs e a cor pelo colorTs', () => {
    const nova = doc({ pinned: true, pinnedTs: 50, color: 'roxo', colorTs: 60 });
    const velha = itemContent(semCampos(doc(), 'color', 'colorTs', 'pinned', 'pinnedTs'));
    const m = mergeItem(nova, velha).merged as DocContent;
    expect(m.pinned).toBe(true);
    expect(m.color).toBe('roxo');
    // A versão antiga grava por cima e o aparelho novo recebe de volta: o "fixado" e a cor voltam.
    const volta = mergeItem(doc(), itemContent(nova)).merged as DocContent;
    expect(volta.pinned).toBe(true);
    expect(volta.color).toBe('roxo');
  });

  it('edição nos dois lados gera cópia "(outra versão)"', () => {
    const local = doc({ body: 'meu texto', bodyTs: 20, base: 'texto' });
    const remoto = itemContent(doc({ body: 'texto do outro', bodyTs: 30 })) as DocContent;
    const { merged, copy } = mergeItem(local, remoto);
    expect((merged as DocContent).body).toBe('meu texto');
    expect(copy).toBeDefined();
    expect((copy as DocContent).title).toContain('(outra versão)');
    expect((copy as DocContent).body).toBe('texto do outro');
  });

  it('parseItem devolve null para kind desconhecido', () => {
    expect(parseItem({ kind: 'futuro', created: 1, deleted: false })).toBeNull();
    expect(parseItem(null)).toBeNull();
    expect(parseItem('x')).toBeNull();
  });

  it('lápide estável: juntar duas lápides nas duas ordens dá o mesmo conteúdo', () => {
    const a = doc({ id: 'd1', deleted: true, title: '', titleTs: 7, body: '', bodyTs: 6, status: 'trashed', statusTs: 9, color: 'azul', colorTs: 3 });
    const b = doc({ id: 'd1', deleted: true, title: '', titleTs: 8, body: '', bodyTs: 4, status: 'trashed', statusTs: 5, color: 'verde', colorTs: 3, pinned: true, pinnedTs: 2 });
    const ab = mergeItem(a, itemContent(b)).merged, ba = mergeItem(b, itemContent(a)).merged;
    expect(sameItem(ab, ba)).toBe(true);
    expect(sameItem(mergeItem({ ...a, ...ab } as Doc, itemContent(b)).merged, ab)).toBe(true);
  });
});
