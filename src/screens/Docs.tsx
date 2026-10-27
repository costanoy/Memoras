import { useEffect, useLayoutEffect, useRef, type PointerEvent } from 'react';
import { docLines, docPreview, docTitle, lineStarts, type Doc, type Line } from '../lib/items';
import { DAY, dayMonth, fmtT, same } from '../lib/notes';
import { archiveDoc, askTrash, docsOf, finishDoc, go, lastEdit, newDoc, openDoc, openMenu, set, setDocBody, setDocColor, setDocTitle, upcoming, type State } from '../store';
import { paperStyle } from '../themes';
import { AutoArea, ColorPick, Icon, menuOn } from '../ui';
import { agendaLabel } from './Agenda';

const when = (t: number) => same(t, Date.now()) ? fmtT(t) : same(t, Date.now() - DAY) ? 'Ontem' : dayMonth(t);
const edited = (t: number) => same(t, Date.now()) ? 'Editado hoje às ' + fmtT(t) : same(t, Date.now() - DAY) ? 'Editado ontem' : 'Editado em ' + dayMonth(t);

// O Resumão, sempre no alto da lista: as tarefas da Agenda de hoje em diante, lidas como um caderno.
function SummaryCard({ s }: { s: State }) {
  const days = upcoming(s), left = days.reduce((n, d) => n + d.tasks.filter(t => !t.done).length, 0);
  const prev = days.map(d => [agendaLabel(d.k), d.tasks.filter(t => !t.done).map(t => t.text.trim()).join(', ')]).filter(([, t]) => t).map(([l, t]) => l + ': ' + t).join(' · ');
  return (
    <button className={'item press sumcard' + (!s.mobile && s.screen === 'summary' ? ' on' : '')} onClick={() => go('summary')}>
      <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}>
        <span className="ttl"><Icon name="agenda" size={16} sw={2.4} />Resumão</span><span className="meta">{left ? left + ' a fazer' : ''}</span>
      </span>
      <span className="prev">{prev.slice(0, 160) || (days.length ? 'Tudo feito por enquanto.' : 'As tarefas da Agenda de hoje em diante, separadas por dia.')}</span>
    </button>
  );
}

// Lista dos cadernos: na barra lateral do computador e na aba Cadernos do celular. Os fixados vêm
// primeiro. Botão direito (ou toque longo no celular) abre as opções do caderno.
export function DocsList({ s }: { s: State }) {
  const docs = docsOf(s), pinned = docs.filter(d => d.pinned), rest = docs.filter(d => !d.pinned);
  const card = (d: Doc) => (
    <button key={d.id} className={'item press' + (!s.mobile && s.docSel === d.id && (s.screen === 'docs' || s.screen === 'doc') ? ' on' : '') + (s.menu?.id === d.id ? ' ctxon' : '')}
      style={paperStyle(d.color)} onClick={() => openDoc(d.id)} {...menuOn((x, y, touch) => openMenu('doc', d.id, x, y, touch))}>
      <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}>
        <span className="ttl">{docTitle(d)}</span>
        {d.pinned && <span className="pinmark" title="Fixado no alto"><Icon name="pin" size={14} sw={2.4} /></span>}
        <span className="meta">{when(lastEdit(d))}</span>
      </span>
      <span className="prev">{docPreview(d.body) || 'Sem texto ainda'}</span>
    </button>
  );
  return <>
    {!s.mobile && (
      <button className="gel row" style={{ flex: 'none', justifyContent: 'center', gap: 8, height: 50 }} onClick={() => newDoc()}>
        <Icon name="plus" size={18} sw={3} />Novo caderno
      </button>
    )}
    <div className="scroll" style={{ gap: 6, padding: '2px 2px 8px', margin: '0 -2px' }}>
      <SummaryCard s={s} />
      {pinned.length > 0 && <div className="group" style={{ padding: '8px 8px 0' }}>Fixados</div>}
      {pinned.map(card)}
      {pinned.length > 0 && rest.length > 0 && <div className="group" style={{ padding: '8px 8px 0' }}>Outros cadernos</div>}
      {rest.map(card)}
      {!docs.length && (
        <div className="empty" style={{ margin: 'auto 0', gap: 10, padding: '24px 16px' }}>
          <div className="orb" style={{ width: 64, height: 64 }} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>Nenhum caderno ainda</div>
          <div className="small" style={{ maxWidth: 250 }}>Um para cada assunto que você quer reler: guias, aprendizados, quem você quer ser.</div>
          <button className="glassbtn press" style={{ marginTop: 4, height: 44, fontSize: 15, fontWeight: 700 }} onClick={() => newDoc()}>Criar o primeiro</button>
        </div>
      )}
    </div>
  </>;
}

// Painel principal do computador sem caderno escolhido.
export function DocsEmpty() {
  return (
    <div className="empty" style={{ gap: 12 }}>
      <div className="orb" style={{ width: 84, height: 84 }} />
      <div style={{ fontSize: 24, fontWeight: 700 }}>Seus cadernos</div>
      <div className="p" style={{ color: 'var(--ink3)', maxWidth: 340 }}>Guias, aprendizados e o que você quer lembrar. Escreva uma vez e releia quando precisar.</div>
      <button className="gel" style={{ marginTop: 6, height: 50, padding: '0 26px' }} onClick={() => newDoc()}>Novo caderno</button>
    </div>
  );
}

// Leitura linha por linha, com a mesma altura e a mesma quebra da edição: linha em branco continua
// linha em branco, e o "-" da lista vira um ponto no mesmo espaço. Cada linha guarda (data-line) de
// que linha do texto veio; o texto fica em .tx, para o toque duplo achar a letra tocada.
function Lines({ lines }: { lines: Line[] }) {
  return <>{lines.map((l, i) => {
    const sym = l.t === 'li' ? /^(\s*)(\S)(\s*)$/.exec(l.mark) : null;
    return (
      <div key={i} className={'ln ln-' + l.t} data-line={i}>
        {sym ? <span className="mk">{sym[1]}<span className="bul">{sym[2]}</span>{sym[3]}</span> : l.mark && <span className="mk">{l.mark}</span>}
        <span className="tx">{l.text}</span>
      </div>
    );
  })}</>;
}

// Quantas letras do elemento ficam antes do ponto tocado.
type CaretDoc = Document & { caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null };
function colAt(el: Element, x: number, y: number) {
  const d = document as CaretDoc, p = d.caretPositionFromPoint?.(x, y), r = p ? null : document.caretRangeFromPoint?.(x, y);
  const node = p?.offsetNode ?? r?.startContainer, off = p?.offset ?? r?.startOffset ?? 0;
  if (!node || !el.contains(node)) return 0;
  const rg = document.createRange();
  rg.setStart(el, 0); rg.setEnd(node, off);
  return rg.toString().length;
}

// Altura (a partir do topo do campo) da linha onde fica um ponto do texto, medida numa cópia invisível do campo.
const MIRROR = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'wordSpacing', 'tabSize',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'boxSizing'] as const;
function caretTop(ta: HTMLTextAreaElement, pos: number) {
  const cs = getComputedStyle(ta), m = document.createElement('div');
  for (const p of MIRROR) m.style[p] = cs[p];
  Object.assign(m.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', width: ta.offsetWidth + 'px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });
  m.textContent = ta.value.slice(0, pos);
  const mark = m.appendChild(document.createElement('span'));
  mark.textContent = '​';
  document.body.appendChild(m);
  const y = mark.offsetTop;
  m.remove();
  return y;
}

// line: linha do texto; col: letras depois da marca (#, -, 1.); y: onde ela estava na tela.
type Anchor = { line: number; col: number; y: number; focus: boolean; title?: boolean };

// Um caderno: abre para leitura. "Editar" ou dois toques no texto trocam para o texto cru, com # e -,
// sem tirar do lugar o que estava na tela; com dois toques, o cursor já fica onde tocou.
export function DocView({ s, d }: { s: State; d: Doc }) {
  const edit = s.docEdit, acc = s.cfg.account;
  const titleRef = useRef<HTMLInputElement>(null), areaRef = useRef<HTMLTextAreaElement>(null), scRef = useRef<HTMLDivElement>(null);
  const anchor = useRef<Anchor | null>(null), tap = useRef({ t: 0, x: 0, y: 0, sx: 0, sy: 0 });
  useEffect(() => { if (edit && !d.title && !d.body) titleRef.current?.focus(); }, [edit]);
  const lines = edit ? [] : docLines(d.body);
  const sub = d.status === 'archived' ? 'Arquivado' : !acc ? 'Salvo neste aparelho' : s.sync === 'offline' ? 'Salvo no aparelho · sincroniza quando voltar a internet' : s.sync === 'error' ? 'Salvo no aparelho' : 'Salvo';
  const archLabel = d.status === 'archived' ? 'Desarquivar' : 'Arquivar';
  const viewY = (el: Element) => el.getBoundingClientRect().top - scRef.current!.getBoundingClientRect().top;

  const startEdit = (at?: { x: number; y: number }) => {
    const sc = scRef.current;
    anchor.current = null;
    if (sc && at) {
      const hit = document.elementFromPoint(at.x, at.y), line = hit?.closest<HTMLElement>('[data-line]'), title = hit?.closest('.doctitle');
      const y = at.y - sc.getBoundingClientRect().top;
      anchor.current = line ? { line: +line.dataset.line!, col: colAt(line.querySelector('.tx') ?? line, at.x, at.y), y, focus: true }
        : title ? { line: 0, col: colAt(title, at.x, at.y), y, focus: true, title: true }
        : { line: -1, col: 0, y, focus: true };
    } else if (sc) {
      const top = sc.getBoundingClientRect().top;
      const first = [...sc.querySelectorAll<HTMLElement>('[data-line]')].find(el => el.getBoundingClientRect().bottom > top + 4);
      if (first) anchor.current = { line: +first.dataset.line!, col: 0, y: viewY(first), focus: false };
    }
    set({ docEdit: true });
  };

  const stopEdit = () => {
    const sc = scRef.current, ta = areaRef.current;
    anchor.current = null;
    if (sc && ta && d.body) {
      const starts = lineStarts(d.body), taY = viewY(ta);
      let line: number, pos: number;
      if (document.activeElement === ta) {
        pos = ta.selectionStart;
        line = 0;
        while (line + 1 < starts.length && starts[line + 1] <= pos) line++;
      } else {
        // A linha que está no alto da tela (as alturas crescem com a linha: busca binária).
        let lo = 0, hi = starts.length - 1;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (taY + caretTop(ta, starts[mid]) <= 4) lo = mid; else hi = mid - 1; }
        line = lo; pos = starts[lo];
      }
      anchor.current = { line, col: 0, y: taY + caretTop(ta, pos), focus: false };
    }
    finishDoc();
  };

  useLayoutEffect(() => {
    const a = anchor.current, sc = scRef.current;
    anchor.current = null;
    if (!a || !sc) return;
    if (edit && a.title) {
      const t = titleRef.current;
      if (t) { t.focus({ preventScroll: true }); t.setSelectionRange(a.col, a.col); }
      return;
    }
    if (edit) {
      const ta = areaRef.current;
      if (!ta) return;
      const l = docLines(d.body)[a.line], starts = lineStarts(d.body);
      const pos = !l ? d.body.length : Math.min(starts[a.line] + l.mark.length + a.col, starts[a.line] + l.mark.length + l.text.length);
      sc.scrollTop += viewY(ta) + caretTop(ta, pos) - a.y;
      if (a.focus) { ta.focus({ preventScroll: true }); ta.setSelectionRange(pos, pos); }
      return;
    }
    let el: HTMLElement | undefined;
    for (const e of sc.querySelectorAll<HTMLElement>('[data-line]')) { if (+e.dataset.line! <= a.line) el = e; else break; }
    if (el) sc.scrollTop += viewY(el) - a.y;
  }, [edit]);

  // Dois toques (ou clique duplo) no mesmo lugar, sem arrastar, abrem a edição.
  const down = (e: PointerEvent) => { tap.current.sx = e.clientX; tap.current.sy = e.clientY; };
  const up = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const t = tap.current;
    if (Math.hypot(e.clientX - t.sx, e.clientY - t.sy) > 10) { t.t = 0; return; }
    if (e.timeStamp - t.t < 400 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 30) { t.t = 0; startEdit({ x: e.clientX, y: e.clientY }); }
    else Object.assign(t, { t: e.timeStamp, x: e.clientX, y: e.clientY });
  };

  return <>
    <div className="row" style={{ gap: 8, padding: '12px 14px', flex: 'none' }}>
      {s.mobile && <button className="round press" aria-label="Voltar" onClick={() => { finishDoc(); go('docs'); }}><Icon name="back" sw={2.6} /></button>}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.body ? edited(lastEdit(d)) : 'Caderno novo'}</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{sub}</div>
      </div>
      <ColorPick value={d.color} onPick={c => setDocColor(d.id, c)} mobile={s.mobile} label="Cor do caderno" />
      {/* Escrevendo no celular, Arquivar e Lixeira saem para sobrar espaço (continuam no toque longo da lista). */}
      {!(edit && s.mobile) && <>
        <button className="pill press" aria-label={archLabel} onClick={() => archiveDoc(d.id)}><Icon name="archive" size={18} />{!s.mobile && archLabel}</button>
        <button className="pill press" aria-label="Mover para a lixeira" onClick={() => askTrash(d.id)}><Icon name="trash" size={18} />{!s.mobile && 'Lixeira'}</button>
      </>}
      {/* Editar e Pronto ficam por último; Pronto, em destaque, termina a edição. */}
      {edit
        ? <button className="pill press go" onClick={stopEdit}><Icon name="check" size={18} sw={2.8} />Pronto</button>
        : <button className="pill press" aria-label="Editar" onClick={() => startEdit()}><Icon name="edit" size={18} />{!s.mobile && 'Editar'}</button>}
    </div>
    <div ref={scRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 12px 12px' }}>
      {edit ? (
        <div className="sheet" style={paperStyle(d.color)}>
          <input ref={titleRef} className="title doctitle" value={d.title} placeholder="Título do caderno" aria-label="Título do caderno" onChange={e => setDocTitle(d.id, e.target.value)} />
          <AutoArea areaRef={areaRef} className="segtext docbody" value={d.body} label="Texto do caderno" placeholder="Escreva aqui o que você quer reler depois." onChange={v => setDocBody(d.id, v)} />
        </div>
      ) : (
        <div className="sheet doc" style={paperStyle(d.color)} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { tap.current.t = 0; }}>
          {d.title.trim() && <div className="title doctitle">{d.title}</div>}
          {d.body.trim() ? <Lines lines={lines} /> : <p className="dochint">Este caderno está vazio. Toque duas vezes aqui ou em Editar para escrever.</p>}
        </div>
      )}
    </div>
  </>;
}
