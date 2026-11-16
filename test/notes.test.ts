import { describe, expect, it } from 'vitest';
import { content, merge, type NoteContent } from '../src/lib/notes';

const base = (o: Partial<NoteContent> = {}): NoteContent => ({
  created: 1000, title: 'Título', titleTs: 5, status: 'active', statusTs: 5, color: '', colorTs: 0, last: 10,
  segs: [{ id: 'a', t: 1, text: 'oi', ts: 5 }], deleted: false, ...o,
});
const semCor = () => { const v = base() as Partial<NoteContent>; delete v.color; delete v.colorTs; return v as NoteContent; };

describe('notes: compatibilidade', () => {
  it('content() aceita anotação da 1.0.4, sem color e colorTs', () => {
    const c = content(semCor());
    expect(c.color).toBe('');
    expect(c.colorTs).toBe(0);
    expect(c.title).toBe('Título');
  });

  it('merge devolve a cor do lado com colorTs maior quando o outro veio sem cor', () => {
    const nova = base({ color: 'roxo', colorTs: 50 });
    // Como em sync.ts: o conteúdo passa por content() antes de juntar.
    const velha = content(semCor());
    for (const m of [merge(velha, nova), merge(nova, velha)]) {
      expect(m.color).toBe('roxo');
      expect(m.colorTs).toBe(50);
    }
  });

  it('merge de anotação apagada é igual nas duas ordens', () => {
    const viva = base({ title: 'x', titleTs: 9, last: 30 });
    const morta = base({ deleted: true, title: '', segs: [], status: 'trashed', statusTs: 20, last: 20 });
    const ab = merge(viva, morta), ba = merge(morta, viva);
    expect(ab).toEqual(ba);
    expect(ab.deleted).toBe(true);
    expect(ab.segs).toEqual([]);
  });
});
