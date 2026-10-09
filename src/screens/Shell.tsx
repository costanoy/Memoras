import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { docPreview, docTitle, todayKey } from '../lib/items';
import { DAY, H, dayLabel, dayMonth, dispTitle, fmtT, fullText, isEmpty, nd, normMap, preview, same, uid, type Note } from '../lib/notes';
import {
  activeSorted, archive, dayNotesOn, docsOf, editSeg, go, HOME, live, newDoc, newNote, openDay, openDoc, openNew, openNote, plannedDays, reducedMotion, restoreDoc,
  set, setCfg, setPrefs, setStatus, setTitle, sfx, startCreatePin, tasksOn, toast, trash, trashedDocs, typeNew, useApp, type Section, type State,
} from '../store';
import { friendly, logout, regenRecovery, syncNow } from '../sync';
import { AutoArea, Icon, MonthCal, SyncDot, syncLabel, ThemeGrid, Toggle } from '../ui';
import { AgendaDay, agendaLabel, AgendaSide, focusNewTask } from './Agenda';
import { DocsEmpty, DocsList, DocView } from './Docs';

function Calendar({ s, act }: { s: State; act: Note[] }) {
  return <MonthCal y={s.calY} m={s.calM} onMove={(calY, calM) => set({ calY, calM })} has={t => act.some(n => same(nd(n), t))} isSel={t => !!s.day && same(s.day, t)}
    onPick={t => { const sel = !!s.day && same(s.day, t); set({ day: sel ? null : t, screen: s.mobile || (s.screen !== 'editor' && s.screen !== 'history') ? 'history' : s.screen }); }} />;
}

const SECTIONS: [Section, string][] = [['diario', 'Diário'], ['cadernos', 'Cadernos'], ['agenda', 'Agenda']];
// Entrar em Cadernos no computador já abre o caderno mais recente, como o diário faz.
const goSection = (s: State, k: Section) => k === 'cadernos'
  ? go('docs', { docSel: docsOf(s).some(d => d.id === s.docSel) ? s.docSel : !s.mobile ? docsOf(s)[0]?.id ?? null : null, docEdit: false })
  : go(HOME[k]);

const NAV = [['search', 'Busca'], ['archive', 'Arquivo'], ['trash', 'Lixeira'], ['settings', 'Ajustes'], ['calendar', 'Calendário']] as const;

function Side({ s }: { s: State }) {
  const act = activeSorted(s), acc = s.cfg.account, scr = s.screen, isTrash = s.shelf === 'trash', sec = s.section;
  const list = s.day ? act.filter(n => same(nd(n), s.day!)) : act;
  const groups: { label: string; items: Note[] }[] = [];
  list.forEach(n => {
    const label = dayLabel(nd(n));
    let g = groups[groups.length - 1];
    if (!g || g.label !== label) groups.push(g = { label, items: [] });
    g.items.push(n);
  });
  const navOther = scr === 'search' || scr === 'archive' || scr === 'settings';

  return (
    <div className="side">
      <div className="panel">
        {s.mobile && sec === 'cadernos' ? (
          <div className="row" style={{ gap: 10, padding: '0 4px' }}>
            <div className="h1" style={{ flex: 1, minWidth: 0 }}>Cadernos</div>
            <button className="round press" aria-label="Busca" onClick={() => go('search')}><Icon name="search" sw={2.3} /></button>
          </div>
        ) : (
          <div className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '0 4px' }}>
            <div className="col" style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <input className="name" value={s.cfg.diaryName} aria-label="Nome do diário" title="Clique para renomear" placeholder="Nome do diário"
                onChange={e => setPrefs({ diaryName: e.target.value })}
                onBlur={() => { if (!s.cfg.diaryName.trim()) setPrefs({ diaryName: 'Meu diário' }); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }} />
              <button className="syncpill press" onClick={() => acc ? (s.sync === 'error' || s.sync === 'synced') && void syncNow() : go('settings')}>
                <SyncDot /><span className="lbl">{syncLabel(!!acc, s.sync)}</span>
              </button>
            </div>
            {/* No celular, Busca e Arquivo ficam aqui em cima; as abas são das três partes do app. */}
            {s.mobile && <>
              <button className="round press" aria-label="Busca" onClick={() => go('search')}><Icon name="search" sw={2.3} /></button>
              <button className="round press" aria-label="Arquivo" onClick={() => go('archive')}><Icon name="archive" /></button>
              <button className="round press" aria-label="Calendário" aria-pressed={s.calOpen} onClick={() => set({ calOpen: !s.calOpen })}
                style={s.calOpen ? { background: 'rgba(255,255,255,.95)', color: 'var(--acc-d)' } : undefined}>
                <Icon name="calendar" />
              </button>
            </>}
          </div>
        )}

        {!s.mobile && (
          <div className="seg2 sections" role="group" aria-label="Partes do Memoras">
            {SECTIONS.map(([k, label]) => <button key={k} className={'press' + (sec === k ? ' on' : '')} aria-pressed={sec === k} onClick={() => goSection(s, k)}>{label}</button>)}
          </div>
        )}

        {sec === 'cadernos' && <DocsList s={s} />}
        {sec === 'agenda' && !s.mobile && <AgendaSide s={s} />}

        {sec === 'diario' && <>
        {!acc && s.cfg.invite && (
          <div className="row" style={{ gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 18, background: 'rgba(255,255,255,.72)', border: '1px solid #fff' }}>
            <div className="col" style={{ flex: 1, gap: 4, fontSize: 14, lineHeight: 1.4, color: 'var(--ink2)' }}>
              <span>Suas anotações estão só neste aparelho.</span>
              <button className="link" style={{ alignSelf: 'flex-start', padding: 0, fontSize: 14, fontWeight: 700 }} onClick={() => go('auth', { authMode: 'signup', authReturn: 'settings' })}>Criar conta para sincronizar</button>
            </div>
            <button className="press" aria-label="Dispensar" onClick={() => setCfg({ invite: false })}
              style={{ flex: 'none', width: 28, height: 28, padding: 0, borderRadius: '50%', border: 'none', background: 'rgba(12,60,90,.08)', color: 'var(--ink2)', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        {!s.mobile && (
          <button className="gel row" style={{ flex: 'none', justifyContent: 'center', gap: 8, height: 50 }} onClick={newNote}>
            <Icon name="plus" size={18} sw={3} />Nova anotação
          </button>
        )}

        {s.day && (
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, padding: '0 6px', fontSize: 14, color: 'var(--ink3)', flex: 'none' }}>
            <span>Mostrando <strong>{dayMonth(s.day)}</strong></span>
            <button className="link" style={{ padding: '6px 0', fontSize: 14, fontWeight: 700 }} onClick={() => set({ day: null })}>Ver todas</button>
          </div>
        )}

        <div className="scroll" style={{ gap: 14, padding: '2px 2px 8px', margin: '0 -2px' }}>
          {groups.map(g => (
            <div key={g.label} className="col" style={{ gap: 6 }}>
              <div className="group" style={{ padding: '0 8px' }}>{g.label}</div>
              {g.items.map(n => (
                <button key={n.id} className={'item press' + (!s.mobile && s.sel === n.id && (scr === 'history' || scr === 'editor') ? ' on' : '')} onClick={() => openNote(n.id)}>
                  <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{dispTitle(n)}</span><span className="meta">{fmtT(nd(n))}</span></span>
                  <span className="prev">{preview(n)}</span>
                </button>
              ))}
            </div>
          ))}
          {!act.length && (
            <div className="empty" style={{ margin: 'auto 0', gap: 10, padding: '24px 16px' }}>
              <div className="orb" style={{ width: 64, height: 64 }} />
              <div style={{ fontSize: 18, fontWeight: 700 }}>Nenhuma anotação ainda</div>
              <div className="small" style={{ maxWidth: 240 }}>Escreva o que quiser. Fica tudo guardado aqui, só para você.</div>
              <button className="glassbtn press" style={{ marginTop: 4, height: 44, fontSize: 15, fontWeight: 700 }} onClick={newNote}>Escrever a primeira</button>
            </div>
          )}
        </div>

        {s.calOpen && <Calendar s={s} act={act} />}
        </>}

        {!s.mobile && (
          <div className="nav">
            {NAV.filter(([k]) => k !== 'calendar' || sec === 'diario').map(([k, label]) => {
              const on = k === 'calendar' ? s.calOpen : k === 'trash' ? scr === 'archive' && isTrash : k === 'archive' ? scr === 'archive' && !isTrash : scr === k;
              const open = on && !(k === 'calendar' && navOther);
              const click = () => k === 'calendar' ? set({ calOpen: !s.calOpen }) : on ? go(HOME[sec]) : k === 'trash' || k === 'archive' ? go('archive', { shelf: k }) : go(k);
              return (
                <button key={k} className={(on ? 'on' : '') + (open ? ' open' : '')} title={label} aria-label={label} aria-pressed={on} onClick={click}>
                  <Icon name={k} sw={k === 'search' ? 2.3 : 2.2} />{open && <span>{label}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ s, cur }: { s: State; cur: Note }) {
  // Trechos esvaziados nesta visita continuam na tela; os que já estavam vazios ficam de fora.
  const touched = useRef(new Set<string>());
  const pending = useRef(uid());
  const sheet = useRef<HTMLDivElement>(null);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(x => x + 1), 60000); return () => clearInterval(iv); }, []);
  const focusLast = () => { const a = sheet.current?.querySelectorAll('textarea'); a?.[a.length - 1]?.focus(); };
  useEffect(() => { if (isEmpty(cur)) focusLast(); }, []);

  const segs = cur.segs.filter(g => g.text !== '' || touched.current.has(g.id));
  // Regra das 2 horas: depois desse tempo sem escrever, o próximo texto abre um trecho com horário novo.
  const needNew = !segs.length || Date.now() - cur.last >= 2 * H;
  const t0 = nd(cur), acc = s.cfg.account;
  const date = dayLabel(t0) + (same(t0, Date.now()) || same(t0, Date.now() - DAY) ? ', ' + dayMonth(t0) : '');
  const sub = cur.status === 'archived' ? 'Arquivada' : !acc ? 'Salvo neste aparelho' : s.sync === 'offline' ? 'Salvo no aparelho · sincroniza quando voltar a internet' : s.sync === 'error' ? 'Salvo no aparelho' : 'Salvo';
  const archLabel = cur.status === 'archived' ? 'Desarquivar' : 'Arquivar';

  return <>
    <div className="row" style={{ gap: 8, padding: '12px 14px', flex: 'none' }}>
      {s.mobile && <button className="round press" aria-label="Voltar" onClick={() => go('history')}><Icon name="back" sw={2.6} /></button>}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{date}</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{sub}</div>
      </div>
      <button className="pill press" aria-label={archLabel} onClick={() => archive(cur.id)}><Icon name="archive" size={18} />{!s.mobile && archLabel}</button>
      <button className="pill press" aria-label="Mover para a lixeira" onClick={() => trash(cur.id)}><Icon name="trash" size={18} />{!s.mobile && 'Lixeira'}</button>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 12px 12px' }}>
      <div className="sheet" ref={sheet} onClick={e => e.target === e.currentTarget && focusLast()}>
        <input className="title" value={cur.title} placeholder="Título (opcional)" aria-label="Título" onChange={e => setTitle(cur.id, e.target.value)} />
        {/* O trecho novo nasce com o id que vai ter depois, para o cursor não sair do lugar. */}
        {[...segs, ...(needNew ? [null] : [])].map(g => g ? (
          <div key={g.id} className="col" style={{ marginTop: 22, gap: 4 }}>
            <div className="segtime">{fmtT(g.t)}</div>
            <AutoArea value={g.text} placeholder="" onChange={v => { touched.current.add(g.id); editSeg(cur.id, g.id, v); }} />
          </div>
        ) : (
          <div key={pending.current} className="col" style={{ marginTop: 22, gap: 4 }}>
            <div className="segtime" hidden />
            <AutoArea value="" placeholder={segs.length ? 'Continue escrevendo…' : 'Escreva o que quiser…'}
              onChange={v => { if (!v) return; const id = pending.current; touched.current.add(id); pending.current = uid(); typeNew(cur.id, id, v); }} />
          </div>
        ))}
      </div>
    </div>
  </>;
}

// Texto do caderno sem as marcas de título e de lista, para a busca mostrar o trecho limpo.
const plain = (body: string) => body.replace(/^\s*(#{1,3}|[-*•]|\d+[.)])\s+/gm, '').split('\n').map(l => l.trim()).filter(Boolean).join(' · ');

function Search({ s }: { s: State }) {
  const q = s.query.trim(), nq = normMap(q).out;
  const results: { key: string; title: string; meta: string; tag?: string; open: () => void; before: string; match: string; after: string }[] = [];
  const hit = (src: string) => {
    const m = normMap(src), idx = m.out.indexOf(nq);
    if (idx < 0) return null;
    const a = m.map[idx], b = m.map[idx + nq.length - 1] + 1, st = Math.max(0, a - 60);
    return { before: (st > 0 ? '…' : '') + src.slice(st, a), match: src.slice(a, b), after: src.slice(b, b + 90) + (b + 90 < src.length ? '…' : '') };
  };
  if (nq) {
    live(s).filter(n => n.status !== 'trashed').sort((a, b) => nd(b) - nd(a)).forEach(n => {
      const r = hit([n.title, fullText(n)].filter(Boolean).join(' · '));
      if (r) results.push({ key: n.id, title: dispTitle(n), meta: dayLabel(nd(n)), tag: n.status === 'archived' ? 'Arquivada' : undefined, open: () => openNote(n.id), ...r });
    });
    docsOf(s).forEach(d => {
      const r = hit([d.title, plain(d.body)].filter(Boolean).join(' · '));
      if (r) results.push({ key: d.id, title: docTitle(d), meta: '', tag: 'Caderno', open: () => openDoc(d.id), ...r });
    });
    [...plannedDays(s)].sort().reverse().forEach(k => {
      const r = hit([...tasksOn(s, k).map(t => t.text), ...dayNotesOn(s, k).map(n => n.text)].filter(Boolean).join(' · '));
      if (r) results.push({ key: 'dia:' + k, title: agendaLabel(k), meta: '', tag: 'Agenda', open: () => openDay(k), ...r });
    });
  }
  const onlyNotes = results.every(r => !r.tag || r.tag === 'Arquivada');
  const count = results.length === 1 ? (onlyNotes ? '1 anotação' : '1 resultado') : results.length + (onlyNotes ? ' anotações' : ' resultados');
  return <>
    <div className="col" style={{ padding: '22px 20px 12px', gap: 14, flex: 'none' }}>
      <div className="h1">Busca</div>
      <label className="searchbox">
        <Icon name="search" sw={2.4} />
        <input value={s.query} placeholder="Buscar nas anotações" aria-label="Buscar nas anotações" autoFocus={!s.mobile} onChange={e => set({ query: e.target.value })} />
      </label>
      {results.length > 0 && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)', padding: '0 6px' }}>{count}</div>}
    </div>
    <div className="scroll" style={{ padding: '0 16px 16px', gap: 8 }}>
      {results.map(r => (
        <button key={r.key} className="gcard press" style={{ gap: 4, padding: '14px 16px' }} onClick={r.open}>
          <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{r.title}</span><span className="meta">{r.meta}</span></span>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink3)' }}>{r.before}<mark>{r.match}</mark>{r.after}</span>
          {r.tag && <span className="tag">{r.tag}</span>}
        </button>
      ))}
      {q && !results.length && (
        <div className="empty">
          <div style={{ fontSize: 19, fontWeight: 700 }}>Nada encontrado</div>
          <div className="small" style={{ color: 'var(--ink3)', maxWidth: 280 }}>Nenhuma anotação tem “{s.query}”. Tente outra palavra.</div>
        </div>
      )}
      {!q && <div className="empty small" style={{ color: 'var(--ink3)', maxWidth: 280 }}>Busque por qualquer palavra. A busca acontece no aparelho, mesmo offline.</div>}
    </div>
  </>;
}

function Shelf({ s }: { s: State }) {
  const isTrash = s.shelf === 'trash';
  const rows = live(s).filter(n => n.status === (isTrash ? 'trashed' : 'archived')).sort((a, b) => nd(b) - nd(a));
  const docRows = isTrash ? trashedDocs(s) : [];
  return <>
    <div className="col" style={{ padding: '22px 20px 12px', gap: 14, flex: 'none' }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="h1">{isTrash ? 'Lixeira' : 'Arquivo'}</div>
        {isTrash && rows.length + docRows.length > 0 && <button className="glassbtn press danger" style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => set({ confirm: { all: true } })}>Esvaziar lixeira</button>}
      </div>
      {s.mobile && (
        <div className="seg2" style={{ boxShadow: 'none' }}>
          <button className={'press' + (!isTrash ? ' on' : '')} aria-pressed={!isTrash} onClick={() => set({ shelf: 'archive' })}>Arquivadas</button>
          <button className={'press' + (isTrash ? ' on' : '')} aria-pressed={isTrash} onClick={() => set({ shelf: 'trash' })}>Lixeira</button>
        </div>
      )}
      <div style={{ fontSize: 15, color: 'var(--ink3)', lineHeight: 1.4 }}>{isTrash ? 'Restaure uma anotação ou apague para sempre.' : 'Anotações guardadas fora do histórico. Continuam aparecendo na busca.'}</div>
    </div>
    <div className="scroll" style={{ padding: '0 16px 16px', gap: 8 }}>
      {rows.map(n => (
        <div key={n.id} className="gcard" style={{ gap: 10, padding: '14px 16px' }}>
          <div className="col" style={{ gap: 3 }}>
            <span className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="ttl">{dispTitle(n)}</span><span className="meta">{dayLabel(nd(n))}</span></span>
            <span className="prev">{preview(n)}</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="soft press" style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 700 }} onClick={() => { setStatus(n.id, 'active'); toast(isTrash ? 'Anotação restaurada' : 'Anotação desarquivada'); }}>{isTrash ? 'Restaurar' : 'Desarquivar'}</button>
            {isTrash && <button className="soft danger press" style={{ height: 40, padding: '0 16px', fontSize: 14 }} onClick={() => set({ confirm: { id: n.id } })}>Apagar para sempre</button>}
          </div>
        </div>
      ))}
      {docRows.map(d => (
        <div key={d.id} className="gcard" style={{ gap: 10, padding: '14px 16px' }}>
          <div className="col" style={{ gap: 3 }}>
            <span className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="ttl">{docTitle(d)}</span><span className="tag" style={{ alignSelf: 'center' }}>Caderno</span></span>
            <span className="prev">{docPreview(d.body) || 'Sem texto ainda'}</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="soft press" style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 700 }} onClick={() => restoreDoc(d.id)}>Restaurar</button>
            <button className="soft danger press" style={{ height: 40, padding: '0 16px', fontSize: 14 }} onClick={() => set({ confirm: { id: d.id } })}>Apagar para sempre</button>
          </div>
        </div>
      ))}
      {!rows.length && !docRows.length && (
        <div className="empty">
          <div className="orb" style={{ width: 64, height: 64 }} />
          <div style={{ fontSize: 19, fontWeight: 700 }}>{isTrash ? 'Lixeira vazia' : 'Nada arquivado'}</div>
          <div className="small" style={{ color: 'var(--ink3)', maxWidth: 280 }}>{isTrash ? 'Anotações que você mandar para a lixeira aparecem aqui.' : 'Arquive anotações para tirá-las do histórico sem apagar.'}</div>
        </div>
      )}
    </div>
  </>;
}

function Settings({ s }: { s: State }) {
  const acc = s.cfg.account;
  const [busy, setBusy] = useState(false);
  const regen = async () => {
    if (busy) return;
    setBusy(true);
    try { go('recovery', { shownKey: await regenRecovery(), recReturn: 'settings' }); }
    catch (e) { toast(friendly(e)); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '22px 16px 20px' }}>
      <div className="col" style={{ maxWidth: 620, margin: '0 auto', gap: 14 }}>
        <div className="h1" style={{ padding: '0 4px' }}>Configurações</div>

        <div className="gcard setcard" style={{ gap: 10 }}>
          <div className="group">Diário</div>
          <label className="col" style={{ gap: 6, fontSize: 15, fontWeight: 600 }}>Nome do diário
            <input className="field" style={{ height: 48, borderRadius: 14, padding: '0 14px', boxShadow: 'none' }} value={s.cfg.diaryName}
              onChange={e => setPrefs({ diaryName: e.target.value })} onBlur={() => { if (!s.cfg.diaryName.trim()) setPrefs({ diaryName: 'Meu diário' }); }} />
          </label>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Cor</div>
          <ThemeGrid />
        </div>

        <div className="gcard setcard">
          <div className="group">Sons</div>
          <button className="press row" aria-pressed={s.cfg.sounds} style={{ gap: 14, padding: 0, background: 'none', border: 'none', textAlign: 'left', color: 'var(--ink)', minHeight: 44 }}
            onClick={() => setCfg({ sounds: !s.cfg.sounds })}>
            <span className="col" style={{ flex: 1, gap: 2 }}><span style={{ fontSize: 17, fontWeight: 600 }}>Sons do app</span><span style={{ fontSize: 14, color: 'var(--ink2)' }}>Ao desbloquear, criar, arquivar e mandar para a lixeira. Nunca enquanto você escreve.</span></span>
            <Toggle on={s.cfg.sounds} />
          </button>
        </div>

        <div className="gcard setcard">
          <div className="group">PIN deste aparelho</div>
          <button className="press row" aria-pressed={s.cfg.pinOn} style={{ gap: 14, padding: 0, background: 'none', border: 'none', textAlign: 'left', color: 'var(--ink)', minHeight: 44 }}
            onClick={() => { if (s.cfg.pinOn) { setCfg({ pinOn: false }); toast('PIN desativado'); } else startCreatePin('settings'); }}>
            <span className="col" style={{ flex: 1, gap: 2 }}><span style={{ fontSize: 17, fontWeight: 600 }}>Pedir PIN ao abrir</span><span style={{ fontSize: 14, color: 'var(--ink2)' }}>Independente da senha da conta.</span></span>
            <Toggle on={s.cfg.pinOn} />
          </button>
          {s.cfg.pinOn && <button className="soft press" style={{ alignSelf: 'flex-start' }} onClick={() => startCreatePin('settings')}>Trocar PIN</button>}
        </div>

        <div className="gcard setcard">
          <div className="group">Conta e sincronização</div>
          {acc ? <>
            <div className="col" style={{ gap: 2 }}><span style={{ fontSize: 17, fontWeight: 600, overflowWrap: 'anywhere' }}>{acc.email}</span><span style={{ fontSize: 14, color: 'var(--ink2)' }}>Criptografia de ponta a ponta. Edições em dois aparelhos se juntam sozinhas.</span></div>
            <div className="row" style={{ gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--ink3)' }}><SyncDot />{syncLabel(true, s.sync)}</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="soft press" onClick={() => void syncNow()}>Sincronizar agora</button>
              <button className="soft press" onClick={() => { void logout(); toast('Você saiu. As anotações continuam neste aparelho.'); }}>Sair da conta</button>
            </div>
          </> : <>
            <div className="small">Sem conta, suas anotações ficam só neste aparelho. Crie uma para sincronizar com seus outros aparelhos.</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="gel" style={{ height: 44, padding: '0 20px', fontSize: 15 }} onClick={() => go('auth', { authMode: 'signup', authReturn: 'settings' })}>Criar conta</button>
              <button className="soft press" style={{ height: 44 }} onClick={() => go('auth', { authMode: 'login', authReturn: 'settings' })}>Entrar</button>
            </div>
          </>}
        </div>

        {acc && (
          <div className="gcard setcard" style={{ gap: 10 }}>
            <div className="group">Chave de recuperação</div>
            <div className="small">Criada no cadastro e mostrada uma única vez. Se você perdeu a sua, gere uma nova. A anterior deixa de funcionar.</div>
            <button className={'soft press' + (busy ? ' off' : '')} style={{ alignSelf: 'flex-start' }} onClick={regen}>Gerar nova chave</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Abas do celular: as três partes do app, o + e os ajustes.
const TABS = [['history', 'Diário'], ['docs', 'Cadernos'], ['new', ''], ['agenda', 'Agenda'], ['settings', 'Ajustes']] as const;
const NEW_LABEL: Record<Section, string> = { diario: 'Nova anotação', cadernos: 'Novo caderno', agenda: 'Nova tarefa' };
const TAB_OF: Partial<Record<State['screen'], string>> = { history: 'history', editor: 'history', docs: 'docs', doc: 'docs', agenda: 'agenda', settings: 'settings' };

// O "+" do celular: o botão gira e uma bolha de gel cresce a partir dele até
// cobrir a tela; o item novo abre por baixo e a bolha se desfaz.
function usePlusBurst() {
  const [burst, setBurst] = useState<{ x: number; y: number; scale: number; run: () => void } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!burst || !el) return;
    const grow = el.animate([{ transform: 'scale(1)', opacity: 0.95 }, { transform: `scale(${burst.scale})`, opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    const t = setTimeout(burst.run, 230);
    grow.onfinish = () => { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out', fill: 'forwards' }).onfinish = () => setBurst(null); };
    return () => clearTimeout(t);
  }, [burst]);
  // run: abre o item novo sem som (o som toca no toque); plain: o mesmo, com som, sem animação.
  const start = (btn: HTMLElement, run: () => void, plain: () => void) => {
    if (reducedMotion()) return plain();
    sfx('new-note');
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    setBurst({ x, y, scale: far / 26 + 1, run });
  };
  const el = burst && <div ref={ref} className="burst" style={{ left: burst.x - 26, top: burst.y - 26 }} />;
  return { start, el, busy: !!burst };
}

export function Shell() {
  const s = useApp(), scr = s.screen;
  const cur = s.notes.find(n => n.id === s.sel && !n.deleted && n.status !== 'trashed');
  const curDoc = s.items.find(i => i.kind === 'doc' && i.id === s.docSel && !i.deleted && i.status === 'active');
  const showEditor = !!cur && (scr === 'editor' || (!s.mobile && scr === 'history'));
  const showDoc = curDoc?.kind === 'doc' && (scr === 'doc' || (!s.mobile && scr === 'docs'));
  // No celular, as listas (diário e cadernos) ocupam a tela sozinhas.
  const listOnly = s.mobile && (scr === 'history' || (scr === 'editor' && !cur) || scr === 'docs' || (scr === 'doc' && !curDoc));
  // Enquanto escreve ou lê no celular, o menu inferior sai de cena.
  const tabbar = s.mobile && !showEditor && !showDoc;
  const plus = usePlusBurst();
  const add = (btn: HTMLElement) => {
    if (s.section === 'cadernos') plus.start(btn, () => newDoc(true), () => newDoc());
    else if (s.section === 'agenda') { focusNewTask(); openDay(todayKey()); }
    else plus.start(btn, openNew, newNote);
  };
  return <>
    <div className={'wrap' + (s.mobile ? ' m' : '') + (s.mobile && !tabbar ? ' notab' : '')}>
      {(!s.mobile || listOnly) && <Side s={s} />}
      {!listOnly && (
        <div className="main">
          <div className="panel">
            {showEditor && <Editor key={cur.id} s={s} cur={cur} />}
            {!showEditor && (scr === 'history' || scr === 'editor') && (
              <div className="empty" style={{ gap: 12 }}>
                <div className="orb" style={{ width: 84, height: 84 }} />
                <div style={{ fontSize: 24, fontWeight: 700 }}>Seu diário está em branco</div>
                <div className="p" style={{ color: 'var(--ink3)', maxWidth: 320 }}>Comece com uma frase. Você pode voltar e continuar quando quiser.</div>
                <button className="gel" style={{ marginTop: 6, height: 50, padding: '0 26px' }} onClick={newNote}>Nova anotação</button>
              </div>
            )}
            {showDoc && curDoc.kind === 'doc' && <DocView key={curDoc.id} s={s} d={curDoc} />}
            {!showDoc && (scr === 'docs' || scr === 'doc') && <DocsEmpty />}
            {scr === 'agenda' && <AgendaDay s={s} />}
            {scr === 'search' && <Search s={s} />}
            {scr === 'archive' && <Shelf s={s} />}
            {scr === 'settings' && <Settings s={s} />}
          </div>
        </div>
      )}
    </div>
    {tabbar && (
      <div className="tabbar">
        {TABS.map(([k, label]) => (
          <button key={k} className={'press' + (TAB_OF[scr] === k ? ' on' : '') + (k === 'new' && plus.busy ? ' spin-plus' : '')} aria-label={k === 'new' ? NEW_LABEL[s.section] : label}
            onClick={e => k === 'new' ? !plus.busy && add(e.currentTarget.querySelector('.plus') ?? e.currentTarget) : k === 'docs' ? goSection(s, 'cadernos') : go(k)}>
            {k === 'new' ? <span className="plus">+</span> : <><Icon name={k} size={24} /><span>{label}</span></>}
          </button>
        ))}
      </div>
    )}
    {plus.el}
  </>;
}
