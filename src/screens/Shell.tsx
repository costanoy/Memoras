import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { docPreview, docTitle, todayKey } from '../lib/items';
import { DAY, H, dayLabel, dayMonth, dispTitle, fmtT, fullText, isEmpty, nd, normMap, preview, same, uid, type Note } from '../lib/notes';
import {
  activeSorted, archive, askTrash, dayNotesOn, docsOf, editSeg, go, goBack, goSection, HOME, isTool, live, LOCK_AFTER, newDoc, newNote, onePane, openDay, openDoc, openMenu, openNew, openNote, openTool, plannedDays, reducedMotion, restoreDoc,
  set, setCfg, setNoteColor, setPrefs, setStatus, setTitle, sfx, startChangePin, startCreatePin, startUsePin, tasksOn, toast, trashedDocs, typeNew, useApp, archivedDocs, archiveDoc, openDocOf, openNoteOf, type Section, type State,
} from '../store';
import { bioStatus, bioVerify, type BioStatus } from '../native';
import { friendly, logout, regenRecovery, syncNow } from '../sync';
import { checkUpdate, installUpdate, useUpdate, type Upd } from '../updates';
import { paperStyle } from '../themes';
import { AutoArea, ColorPick, Icon, menuOn, MonthCal, SyncDot, syncLabel, ThemeGrid, Toggle } from '../ui';
import { AgendaDay, agendaLabel, AgendaSide, focusNewTask } from './Agenda';
import { DocsEmpty, DocsList, DocView } from './Docs';
import { Summary } from './Summary';

function Calendar({ s, act }: { s: State; act: Note[] }) {
  return <MonthCal y={s.calY} m={s.calM} onMove={(calY, calM) => set({ calY, calM })} has={t => act.some(n => same(nd(n), t))} isSel={t => !!s.day && same(s.day, t)}
    onPick={t => {
      const sel = !!s.day && same(s.day, t);
      set({ day: sel ? null : t, screen: onePane(s) || (s.screen !== 'editor' && s.screen !== 'history') ? 'history' : s.screen, ...(s.mini ? { calOpen: false } : {}) });
    }} />;
}

const SECTIONS: [Section, string][] = [['diario', 'Diário'], ['cadernos', 'Cadernos'], ['agenda', 'Agenda']];
const SECTION_ICON: Record<Section, string> = { diario: 'history', cadernos: 'docs', agenda: 'agenda' };

const NAV = [['search', 'Busca'], ['archive', 'Arquivo'], ['trash', 'Lixeira'], ['settings', 'Ajustes'], ['calendar', 'Calendário']] as const;

function Side({ s }: { s: State }) {
  const act = activeSorted(s), acc = s.cfg.account, scr = s.screen, isTrash = s.shelf === 'trash', sec = s.section, one = onePane(s);
  const list = s.day ? act.filter(n => same(nd(n), s.day!)) : act;
  const groups: { label: string; items: Note[] }[] = [];
  list.forEach(n => {
    const label = dayLabel(nd(n));
    let g = groups[groups.length - 1];
    if (!g || g.label !== label) groups.push(g = { label, items: [] });
    g.items.push(n);
  });
  const navOther = isTool(scr);
  const calToggle = (
    <button className="round press" aria-label="Calendário" title="Calendário" aria-pressed={s.calOpen} onClick={() => set({ calOpen: !s.calOpen })}
      style={s.calOpen ? { background: 'rgba(255,255,255,.95)', color: 'var(--acc-d)' } : undefined}>
      <Icon name="calendar" />
    </button>
  );

  return (
    <div className="side">
      <div className="panel">
        {one && sec === 'cadernos' ? (
          <div className="row" style={{ gap: 10, padding: '0 4px' }}>
            <div className="h1" style={{ flex: 1, minWidth: 0 }}>Cadernos</div>
            {s.mobile && <button className="round press" aria-label="Busca" onClick={() => openTool('search')}><Icon name="search" sw={2.3} /></button>}
            {s.mobile && <button className="round press" aria-label="Arquivo" onClick={() => openTool('archive', { shelf: 'archive' })}><Icon name="archive" /></button>}
          </div>
        ) : (
          <div className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '0 4px' }}>
            <div className="col" style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <input className="name" value={s.cfg.diaryName} aria-label="Nome do diário" title="Clique para renomear" placeholder="Nome do diário"
                onChange={e => setPrefs({ diaryName: e.target.value })}
                onBlur={() => { if (!s.cfg.diaryName.trim()) setPrefs({ diaryName: 'Meu diário' }); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }} />
              <button className="syncpill press" onClick={() => acc ? (s.sync === 'error' || s.sync === 'synced') && void syncNow() : openTool('settings')}>
                <SyncDot /><span className="lbl">{syncLabel(!!acc, s.sync)}</span>
              </button>
            </div>
            {/* No celular, Busca e Arquivo ficam aqui em cima; as abas são das três partes do app.
                No Mini-Memoras, Busca e Arquivo ficam na barra de navegação. */}
            {s.mobile && <>
              <button className="round press" aria-label="Busca" onClick={() => openTool('search')}><Icon name="search" sw={2.3} /></button>
              <button className="round press" aria-label="Arquivo" onClick={() => openTool('archive', { shelf: 'archive' })}><Icon name="archive" /></button>
            </>}
            {one && sec === 'diario' && calToggle}
          </div>
        )}

        {!one && (
          <div className="seg2 sections" role="group" aria-label="Partes do Memoras">
            {SECTIONS.map(([k, label], i) => <button key={k} className={'press' + (sec === k ? ' on' : '')} aria-pressed={sec === k} title={label + ' (Ctrl+' + (i + 1) + ')'} onClick={() => goSection(k)}>{label}</button>)}
          </div>
        )}

        {sec === 'cadernos' && <DocsList s={s} />}
        {sec === 'agenda' && !one && <AgendaSide s={s} />}

        {sec === 'diario' && <>
        {/* No Mini-Memoras o calendário abre logo abaixo do nome, perto do botão. */}
        {s.calOpen && s.mini && <Calendar s={s} act={act} />}
        {/* Com o calendário aberto, o convite sai para dar espaço a ele. */}
        {!acc && s.cfg.invite && !s.calOpen && (
          <div className="row invite">
            <div className="col" style={{ flex: 1, gap: 4, fontSize: 14, lineHeight: 1.4, color: 'var(--ink2)' }}>
              <span>Suas anotações estão só neste aparelho.</span>
              <button className="link" style={{ alignSelf: 'flex-start', padding: 0, fontSize: 14, fontWeight: 700 }} onClick={() => go('auth', { authMode: 'signup', authReturn: 'settings' })}>Criar conta para sincronizar</button>
            </div>
            <button className="press invx" aria-label="Dispensar" onClick={() => setCfg({ invite: false })}>×</button>
          </div>
        )}

        {!one && (
          <button className="gel row" style={{ flex: 'none', justifyContent: 'center', gap: 8, height: 50 }} title="Nova anotação (Ctrl+N)" onClick={newNote}>
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
              {/* Botão direito (ou toque longo no celular): cor, arquivar e lixeira. */}
              {g.items.map(n => (
                <button key={n.id} className={'item press' + (!one && s.sel === n.id && (scr === 'history' || scr === 'editor') ? ' on' : '') + (s.menu?.id === n.id ? ' ctxon' : '')}
                  style={paperStyle(n.color)} onClick={() => openNote(n.id)} {...menuOn((x, y, touch) => openMenu('note', n.id, x, y, touch))}>
                  <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{dispTitle(n)}</span><span className="meta">{fmtT(nd(n))}</span></span>
                  <span className="prev">{preview(n)}</span>
                </button>
              ))}
            </div>
          ))}
          {!act.length && (
            <div className="empty" style={{ margin: 'auto 0', gap: 10, padding: '24px 16px' }}>
              <div className="orb md" />
              <div style={{ fontSize: 18, fontWeight: 700 }}>Nenhuma anotação ainda</div>
              <div className="small" style={{ maxWidth: 240 }}>Escreva o que quiser. Fica tudo guardado aqui, só para você.</div>
              <button className="glassbtn press" style={{ marginTop: 4, height: 44, fontSize: 15, fontWeight: 700 }} onClick={newNote}>Escrever a primeira</button>
            </div>
          )}
        </div>

        {s.calOpen && !s.mini && <Calendar s={s} act={act} />}
        </>}

        {!one && (
          <div className="nav">
            {NAV.filter(([k]) => k !== 'calendar' || sec === 'diario').map(([k, label]) => {
              const on = k === 'calendar' ? s.calOpen : k === 'trash' ? scr === 'archive' && isTrash : k === 'archive' ? scr === 'archive' && !isTrash : scr === k;
              const open = on && !(k === 'calendar' && navOther);
              const click = () => k === 'calendar' ? set({ calOpen: !s.calOpen }) : on ? goBack() : k === 'trash' || k === 'archive' ? openTool('archive', { shelf: k }) : openTool(k);
              return (
                <button key={k} className={(on ? 'on' : '') + (open ? ' open' : '')} title={k === 'search' ? label + ' (Ctrl+F)' : label} aria-label={label} aria-pressed={on} onClick={click}>
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

// Mini-Memoras: as três partes do app, as ferramentas e o "+", numa faixa só, abaixo da barra de título.
function MiniNav({ s }: { s: State }) {
  const tool = isTool(s.screen) ? s.screen : null;
  const left = s.section !== 'agenda' ? tasksOn(s, todayKey()).filter(t => !t.done && t.text.trim()).length : 0;
  const toolBtn = (k: 'search' | 'archive' | 'settings', label: string, icon: string, hint?: string) => (
    <button className={'round press' + (tool === k ? ' on' : '')} aria-label={label} title={hint ?? label} aria-pressed={tool === k}
      onClick={() => tool === k ? goBack() : openTool(k, k === 'archive' ? { shelf: 'archive' } : {})}>
      <Icon name={icon} size={18} sw={k === 'search' ? 2.3 : 2.2} />
    </button>
  );
  return (
    <nav className="mininav" aria-label="Navegação do Memoras">
      <div className="seg2 minisec" role="group" aria-label="Partes do Memoras">
        {SECTIONS.map(([k, label], i) => (
          <button key={k} className={'press' + (s.section === k ? ' on' : '')} aria-pressed={s.section === k} aria-keyshortcuts={'Control+' + (i + 1)}
            aria-label={k === 'agenda' && left ? 'Agenda, ' + left + (left === 1 ? ' tarefa a fazer hoje' : ' tarefas a fazer hoje') : label}
            title={label + ' (Ctrl+' + (i + 1) + ')'} onClick={() => goSection(k)}>
            <Icon name={SECTION_ICON[k]} size={16} />{label}
            {k === 'agenda' && left > 0 && <span className="mnbadge" aria-hidden="true">{left}</span>}
          </button>
        ))}
      </div>
      <span className="mnspacer" />
      {toolBtn('search', 'Busca', 'search', 'Busca (Ctrl+F)')}
      {toolBtn('archive', 'Arquivo e lixeira', 'archive')}
      {toolBtn('settings', 'Ajustes', 'settings')}
      <button className="gel mplus" aria-label={NEW_LABEL[s.section]} title={NEW_LABEL[s.section] + ' (Ctrl+N)'} onClick={() => addNew(s)}>
        <Icon name="plus" size={16} sw={3} /><span className="plbl">{NEW_LABEL[s.section]}</span>
      </button>
    </nav>
  );
}

// "+" (e Ctrl+N): uma anotação, um caderno ou uma tarefa nova, conforme a parte do app na tela.
export function addNew(s: State) {
  if (s.section === 'cadernos') newDoc();
  else if (s.section === 'agenda') { focusNewTask(); openDay(s.screen === 'agenda' ? s.agDay : todayKey()); }
  else newNote();
}

function Editor({ s, cur }: { s: State; cur: Note }) {
  // Trechos esvaziados nesta visita continuam na tela; os que já estavam vazios ficam de fora.
  const touched = useRef(new Set<string>());
  const pending = useRef(uid());
  const sheet = useRef<HTMLDivElement>(null);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(x => x + 1), 60000); return () => clearInterval(iv); }, []);
  // Tocar no espaço vazio da página continua o texto: o cursor vai para o fim do último trecho.
  const focusLast = () => { const a = sheet.current?.querySelectorAll('textarea'), el = a?.[a.length - 1]; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } };
  useEffect(() => { if (isEmpty(cur)) focusLast(); }, []);

  const segs = cur.segs.filter(g => g.text !== '' || touched.current.has(g.id));
  // Regra das 2 horas: depois desse tempo sem escrever, o próximo texto abre um trecho com horário novo.
  const needNew = !segs.length || Date.now() - cur.last >= 2 * H;
  const t0 = nd(cur), acc = s.cfg.account;
  const date = dayLabel(t0) + (same(t0, Date.now()) || same(t0, Date.now() - DAY) ? ', ' + dayMonth(t0) : '');
  const sub = cur.status === 'archived' ? 'Arquivada' : !acc ? 'Salvo neste aparelho' : s.sync === 'offline' ? 'Salvo no aparelho · sincroniza quando voltar a internet' : s.sync === 'error' ? 'Salvo no aparelho' : 'Salvo';
  const archLabel = cur.status === 'archived' ? 'Desarquivar' : 'Arquivar';

  return <>
    <div className="row ibar">
      {onePane(s) && <button className="round press" aria-label="Voltar" title={s.mini ? 'Voltar (Alt+←)' : 'Voltar'} onClick={() => s.mini ? goBack() : go('history')}><Icon name="back" sw={2.6} /></button>}
      <div className="ibar-txt">
        <div className="ibar-t">{date}</div>
        <div className="ibar-s">{sub}</div>
      </div>
      <ColorPick value={cur.color} onPick={c => setNoteColor(cur.id, c)} mobile={s.mobile} label="Cor da anotação" />
      <button className="pill press" aria-label={archLabel} title={archLabel} onClick={() => archive(cur.id)}><Icon name="archive" size={18} />{!s.mobile && <span className="plbl">{archLabel}</span>}</button>
      <button className="pill press" aria-label="Mover para a lixeira" title="Mover para a lixeira" onClick={() => askTrash(cur.id)}><Icon name="trash" size={18} />{!s.mobile && <span className="plbl">Lixeira</span>}</button>
    </div>
    <div className="iscroll">
      <div className="sheet" ref={sheet} style={paperStyle(cur.color)} onClick={e => e.target === e.currentTarget && focusLast()}>
        <input className="title" value={cur.title} placeholder="Título (opcional)" aria-label="Título" onChange={e => setTitle(cur.id, e.target.value)} />
        {/* O trecho novo nasce com o id que vai ter depois, para o cursor não sair do lugar. */}
        {[...segs, ...(needNew ? [null] : [])].map(g => g ? (
          <div key={g.id} className="col" style={{ marginTop: 22, gap: 4 }}>
            <div className="segtime">{fmtT(g.t)}</div>
            <AutoArea value={g.text} placeholder="" label={'Trecho das ' + fmtT(g.t)} onChange={v => { touched.current.add(g.id); editSeg(cur.id, g.id, v); }} />
          </div>
        ) : (
          <div key={pending.current} className="col" style={{ marginTop: 22, gap: 4 }}>
            <div className="segtime" hidden />
            <AutoArea value="" placeholder={segs.length ? 'Continue escrevendo…' : 'Escreva o que quiser…'} label={segs.length ? 'Continuar escrevendo' : 'Texto da anotação'}
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
  const results: { key: string; title: string; meta: string; tag?: string; color?: string; open: () => void; before: string; match: string; after: string }[] = [];
  const hit = (src: string) => {
    const m = normMap(src), idx = m.out.indexOf(nq);
    if (idx < 0) return null;
    const a = m.map[idx], b = m.map[idx + nq.length - 1] + 1, st = Math.max(0, a - 60);
    return { before: (st > 0 ? '…' : '') + src.slice(st, a), match: src.slice(a, b), after: src.slice(b, b + 90) + (b + 90 < src.length ? '…' : '') };
  };
  if (nq) {
    live(s).filter(n => n.status !== 'trashed').sort((a, b) => nd(b) - nd(a)).forEach(n => {
      const r = hit([n.title, fullText(n)].filter(Boolean).join(' · '));
      if (r) results.push({ key: n.id, title: dispTitle(n), meta: dayLabel(nd(n)), tag: n.status === 'archived' ? 'Arquivada' : undefined, color: n.color, open: () => openNote(n.id), ...r });
    });
    [...docsOf(s), ...archivedDocs(s)].forEach(d => {
      const r = hit([d.title, plain(d.body)].filter(Boolean).join(' · '));
      if (r) results.push({ key: d.id, title: docTitle(d), meta: '', tag: d.status === 'archived' ? 'Caderno arquivado' : 'Caderno', color: d.color, open: () => openDoc(d.id), ...r });
    });
    [...plannedDays(s)].sort().reverse().forEach(k => {
      const r = hit([...tasksOn(s, k).map(t => t.text), ...dayNotesOn(s, k).map(n => n.text)].filter(Boolean).join(' · '));
      if (r) results.push({ key: 'dia:' + k, title: agendaLabel(k), meta: '', tag: 'Agenda', open: () => openDay(k), ...r });
    });
  }
  const onlyNotes = results.every(r => !r.tag || r.tag === 'Arquivada');
  const count = results.length === 1 ? (onlyNotes ? '1 anotação' : '1 resultado') : results.length + (onlyNotes ? ' anotações' : ' resultados');
  return <>
    <div className="col vhead">
      <div className="row" style={{ gap: 10 }}>
        {s.mini && <button className="round press" aria-label="Voltar" title="Voltar (Esc)" onClick={goBack}><Icon name="back" sw={2.6} /></button>}
        <div className="h1">Busca</div>
      </div>
      <label className="searchbox">
        <Icon name="search" sw={2.4} />
        {/* Esc apaga o que foi digitado; com o campo vazio, volta para onde estava. */}
        <input value={s.query} placeholder="Buscar no diário, nos cadernos e na agenda" aria-label="Buscar no diário, nos cadernos e na agenda" autoFocus={!s.mobile}
          onChange={e => set({ query: e.target.value })} onKeyDown={e => { if (e.key !== 'Escape' || e.nativeEvent.isComposing) return; e.preventDefault(); if (s.query) set({ query: '' }); else goBack(); }} />
      </label>
      {results.length > 0 && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)', padding: '0 6px' }}>{count}</div>}
    </div>
    <div className="scroll vlist">
      {results.map(r => (
        <button key={r.key} className="gcard press" style={{ gap: 4, padding: '14px 16px', ...paperStyle(r.color) }} onClick={r.open}>
          <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{r.title}</span><span className="meta">{r.meta}</span></span>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink3)' }}>{r.before}<mark>{r.match}</mark>{r.after}</span>
          {r.tag && <span className="tag">{r.tag}</span>}
        </button>
      ))}
      {q && !results.length && (
        <div className="empty">
          <div style={{ fontSize: 19, fontWeight: 700 }}>Nada encontrado</div>
          <div className="small" style={{ color: 'var(--ink3)', maxWidth: 280 }}>Nenhum resultado para “{s.query}”. Tente outra palavra.</div>
        </div>
      )}
      {!q && <div className="empty small" style={{ color: 'var(--ink3)', maxWidth: 280 }}>Busque por qualquer palavra. A busca acontece no aparelho, mesmo offline.</div>}
    </div>
  </>;
}

function Shelf({ s }: { s: State }) {
  const isTrash = s.shelf === 'trash';
  const rows = live(s).filter(n => n.status === (isTrash ? 'trashed' : 'archived')).sort((a, b) => nd(b) - nd(a));
  const docRows = isTrash ? trashedDocs(s) : archivedDocs(s);
  return <>
    <div className="col vhead">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        {s.mini && <button className="round press" aria-label="Voltar" title="Voltar (Esc)" onClick={goBack}><Icon name="back" sw={2.6} /></button>}
        <div className="h1" style={{ flex: 1, minWidth: 0 }}>{isTrash ? 'Lixeira' : 'Arquivo'}</div>
        {isTrash && rows.length + docRows.length > 0 && <button className="glassbtn press danger" style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => set({ confirm: { all: true } })}>Esvaziar lixeira</button>}
      </div>
      {onePane(s) && (
        <div className="seg2" style={{ boxShadow: 'none' }}>
          <button className={'press' + (!isTrash ? ' on' : '')} aria-pressed={!isTrash} onClick={() => set({ shelf: 'archive' })}>Arquivadas</button>
          <button className={'press' + (isTrash ? ' on' : '')} aria-pressed={isTrash} onClick={() => set({ shelf: 'trash' })}>Lixeira</button>
        </div>
      )}
      <div style={{ fontSize: 15, color: 'var(--ink3)', lineHeight: 1.4 }}>{isTrash ? 'Restaure anotações e cadernos ou apague para sempre.' : 'Anotações e cadernos guardados fora das listas. Continuam aparecendo na busca.'}</div>
    </div>
    <div className="scroll vlist">
      {rows.map(n => (
        <div key={n.id} className="gcard" style={{ gap: 10, padding: '14px 16px', ...paperStyle(n.color) }}>
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
        <div key={d.id} className="gcard" style={{ gap: 10, padding: '14px 16px', ...paperStyle(d.color) }}>
          <div className="col" style={{ gap: 3 }}>
            <span className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="ttl">{docTitle(d)}</span><span className="tag" style={{ alignSelf: 'center' }}>Caderno</span></span>
            <span className="prev">{docPreview(d.body) || 'Sem texto ainda'}</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="soft press" style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 700 }} onClick={() => isTrash ? restoreDoc(d.id) : archiveDoc(d.id)}>{isTrash ? 'Restaurar' : 'Desarquivar'}</button>
            {isTrash && <button className="soft danger press" style={{ height: 40, padding: '0 16px', fontSize: 14 }} onClick={() => set({ confirm: { id: d.id } })}>Apagar para sempre</button>}
          </div>
        </div>
      ))}
      {!rows.length && !docRows.length && (
        <div className="empty">
          <div className="orb md" />
          <div style={{ fontSize: 19, fontWeight: 700 }}>{isTrash ? 'Lixeira vazia' : 'Nada arquivado'}</div>
          <div className="small" style={{ color: 'var(--ink3)', maxWidth: 280 }}>{isTrash ? 'Anotações e cadernos que você mandar para a lixeira aparecem aqui.' : 'Arquive anotações e cadernos para tirá-los das listas sem apagar.'}</div>
        </div>
      )}
    </div>
  </>;
}

function Settings({ s }: { s: State }) {
  const acc = s.cfg.account;
  const [busy, setBusy] = useState(false);
  // Digital: só no celular com leitor; sem digital cadastrada, explica onde cadastrar. Confere de novo
  // quando o app volta à tela (a pessoa pode ter ido cadastrar uma nas configurações do celular).
  const [bio, setBio] = useState<BioStatus>('no');
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') void bioStatus().then(setBio); };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  const after = LOCK_AFTER.includes(s.cfg.lockAfter) ? s.cfg.lockAfter : 5;
  const regen = async () => {
    if (busy) return;
    setBusy(true);
    try { go('recovery', { shownKey: await regenRecovery(), recReturn: 'settings' }); }
    catch (e) { toast(friendly(e)); }
    finally { setBusy(false); }
  };
  return <>
    {/* No Mini-Memoras o título fica parado em cima, com o Voltar; o resto rola. */}
    {s.mini && (
      <div className="row vhead" style={{ gap: 10 }}>
        <button className="round press" aria-label="Voltar" title="Voltar (Esc)" onClick={goBack}><Icon name="back" sw={2.6} /></button>
        <div className="h1">Configurações</div>
      </div>
    )}
    <div className="vset">
      <div className="col" style={{ maxWidth: 620, margin: '0 auto', gap: 14 }}>
        {!s.mini && <div className="h1" style={{ padding: '0 4px' }}>Configurações</div>}

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

        {/* Com conta, o PIN é um só em todos os aparelhos; cada aparelho escolhe se pede (ou abre com a digital). */}
        <div className="gcard setcard">
          <div className="group">{acc ? 'PIN da conta' : 'PIN deste aparelho'}</div>
          <button className="press row" aria-pressed={s.cfg.pinOn} style={{ gap: 14, padding: 0, background: 'none', border: 'none', textAlign: 'left', color: 'var(--ink)', minHeight: 44 }}
            onClick={() => s.cfg.pinOn ? startChangePin('off') : acc && s.cfg.pinHash ? startUsePin('settings') : startCreatePin('settings')}>
            <span className="col" style={{ flex: 1, gap: 2 }}><span style={{ fontSize: 17, fontWeight: 600 }}>{acc ? 'Pedir PIN neste aparelho' : 'Pedir PIN ao abrir'}</span>
              <span style={{ fontSize: 14, color: 'var(--ink2)' }}>{acc ? 'O mesmo PIN em todos os seus aparelhos.' : 'Independente da senha da conta.'}</span></span>
            <Toggle on={s.cfg.pinOn} />
          </button>
          {s.cfg.pinOn && bio === 'ok' && (
            <button className="press row" aria-pressed={s.cfg.bioOn} style={{ gap: 14, padding: 0, background: 'none', border: 'none', textAlign: 'left', color: 'var(--ink)', minHeight: 44 }}
              onClick={() => s.cfg.bioOn ? setCfg({ bioOn: false }) : void bioVerify(true).then(ok => { if (ok) { setCfg({ bioOn: true, bioAsked: true }); toast('Digital ativada neste aparelho'); } })}>
              <span className="col" style={{ flex: 1, gap: 2 }}><span style={{ fontSize: 17, fontWeight: 600 }}>Entrar com a digital</span><span style={{ fontSize: 14, color: 'var(--ink2)' }}>Sem digitar o PIN neste celular. O PIN continua valendo se a digital não funcionar.</span></span>
              <Toggle on={s.cfg.bioOn} />
            </button>
          )}
          {s.cfg.pinOn && bio === 'none' && <div className="small">Para entrar com a digital, cadastre uma nas configurações do celular (Segurança). Depois volte aqui.</div>}
          {/* Quanto tempo fora do app (ou com ele fechado) até pedir o PIN de novo. */}
          {s.cfg.pinOn && (
            <div className="col" style={{ gap: 8 }}>
              <span className="col" style={{ gap: 2 }}><span style={{ fontSize: 17, fontWeight: 600 }}>Pedir o PIN de novo depois de</span>
                <span style={{ fontSize: 14, color: 'var(--ink2)' }}>Tempo fora do app neste aparelho, mesmo com ele fechado.</span></span>
              <div className="seg2 lockafter" role="group" aria-label="Pedir o PIN de novo depois de">
                {LOCK_AFTER.map(m => (
                  <button key={m} className={'press' + (after === m ? ' on' : '')} aria-pressed={after === m} aria-label={m === 60 ? '1 hora' : m === 1 ? '1 minuto' : m + ' minutos'}
                    onClick={() => setCfg({ lockAfter: m })}>{m === 60 ? '1 h' : m + ' min'}</button>
                ))}
              </div>
            </div>
          )}
          {s.cfg.pinOn && <button className="soft press" style={{ alignSelf: 'flex-start' }} onClick={() => startChangePin('change')}>Trocar PIN</button>}
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

        <Updates />
        <div className="small" style={{ textAlign: 'center', color: 'var(--ink3)', paddingTop: 2 }}>Memoras {__APP_VERSION__}</div>
      </div>
    </div>
  </>;
}

// Só no app de Windows: andamento da atualização e o botão para reiniciar e instalar.
const UPD_TEXT: Record<Upd['state'], (u: Upd) => string> = {
  idle: u => u.kind === 'win' ? 'Procura versão nova ao abrir o app e a cada 4 horas.' : 'Procura versão nova sempre que o app abre.',
  checking: () => 'Procurando versão nova…',
  latest: () => 'Você está na versão mais recente.',
  available: u => `A versão ${u.version} está disponível. Suas anotações continuam no aparelho.`,
  downloading: u => `Baixando a versão ${u.version}… ${u.percent}%`,
  ready: u => `A versão ${u.version} está pronta. O Memoras fecha, atualiza e abre de novo em alguns segundos.`,
  permission: () => 'Permita que o Memoras instale atualizações e toque em Atualizar de novo.',
  installing: () => 'Confirme na tela do Android para terminar de atualizar.',
  error: u => u.asked ? 'Não deu para baixar agora. Confira a internet e tente de novo.' : 'Não deu para procurar versão nova agora. Confira a internet e tente de novo.',
};
function Updates() {
  const u = useUpdate();
  if (!u?.on) return null;
  return (
    <div className="gcard setcard">
      <div className="group">Atualizações</div>
      <div className="small" role="status">{UPD_TEXT[u.state](u)}</div>
      {u.state === 'ready'
        ? <button className="gel" style={{ alignSelf: 'flex-start', height: 44, padding: '0 20px', fontSize: 15 }} onClick={() => void installUpdate()}>Reiniciar e atualizar</button>
        : u.kind === 'apk' && u.url && (u.state === 'available' || u.state === 'permission' || u.state === 'installing' || (u.state === 'error' && u.asked))
          ? <button className="gel" style={{ alignSelf: 'flex-start', height: 44, padding: '0 20px', fontSize: 15 }} onClick={() => void installUpdate()}>Atualizar</button>
          : u.state !== 'checking' && u.state !== 'downloading' && <button className="soft press" style={{ alignSelf: 'flex-start' }} onClick={() => void checkUpdate(true)}>Procurar agora</button>}
    </div>
  );
}

// Abas do celular: as três partes do app, o + e os ajustes.
const TABS = [['history', 'Diário'], ['docs', 'Cadernos'], ['new', ''], ['agenda', 'Agenda'], ['settings', 'Ajustes']] as const;
const NEW_LABEL: Record<Section, string> = { diario: 'Nova anotação', cadernos: 'Novo caderno', agenda: 'Nova tarefa' };
const TAB_OF: Partial<Record<State['screen'], string>> = { history: 'history', editor: 'history', docs: 'docs', doc: 'docs', summary: 'docs', agenda: 'agenda', settings: 'settings' };

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
  const s = useApp(), scr = s.screen, one = onePane(s);
  const cur = openNoteOf(s);
  // Caderno arquivado também abre (pela busca), com o botão Desarquivar.
  const curDoc = openDocOf(s);
  const showEditor = !!cur && (scr === 'editor' || (!one && scr === 'history'));
  const hasNotes = s.notes.some(n => !n.deleted && n.status === 'active');
  const showDoc = !!curDoc && (scr === 'doc' || (!one && scr === 'docs'));
  // No celular e no Mini-Memoras, as listas (diário e cadernos) ocupam a tela sozinhas.
  const listOnly = one && (scr === 'history' || (scr === 'editor' && !cur) || scr === 'docs' || (scr === 'doc' && !curDoc));
  // Enquanto escreve ou lê no celular (inclusive o Resumão), o menu inferior sai de cena.
  const tabbar = s.mobile && !showEditor && !showDoc && scr !== 'summary';
  const plus = usePlusBurst();
  const add = (btn: HTMLElement) => {
    if (s.section === 'cadernos') plus.start(btn, () => newDoc(true), () => newDoc());
    else if (s.section === 'agenda') { focusNewTask(); openDay(todayKey()); }
    else plus.start(btn, openNew, newNote);
  };
  return <>
    {/* Os filhos ficam sempre na mesma posição (a barra do mini, a lista, o painel): trocar de tamanho
        não recria o editor, e o cursor continua onde estava. */}
    <div className={'wrap' + (s.mobile ? ' m' : '') + (s.mobile && !tabbar ? ' notab' : '')}>
      {s.mini && <MiniNav s={s} />}
      {(!one || listOnly) && <Side s={s} />}
      {!listOnly && (
        <div className="main">
          <div className="panel">
            {showEditor && <Editor key={cur.id} s={s} cur={cur} />}
            {!showEditor && (scr === 'history' || scr === 'editor') && (
              <div className="empty" style={{ gap: 12 }}>
                <div className="orb lg" />
                {/* Com anotações, nenhuma abre sozinha: a pessoa escolhe na lista. */}
                <div style={{ fontSize: 24, fontWeight: 700 }}>{hasNotes ? 'Seu diário' : 'Seu diário está em branco'}</div>
                <div className="p" style={{ color: 'var(--ink3)', maxWidth: 320 }}>{hasNotes ? 'Escolha uma anotação na lista ou comece uma nova.' : 'Comece com uma frase. Você pode voltar e continuar quando quiser.'}</div>
                <button className="gel" style={{ marginTop: 6, height: 50, padding: '0 26px' }} onClick={newNote}>Nova anotação</button>
              </div>
            )}
            {showDoc && curDoc && <DocView key={curDoc.id} s={s} d={curDoc} />}
            {!showDoc && (scr === 'docs' || scr === 'doc') && <DocsEmpty />}
            {scr === 'summary' && <Summary s={s} />}
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
            onClick={e => k === 'new' ? !plus.busy && add(e.currentTarget.querySelector('.plus') ?? e.currentTarget) : k === 'docs' ? goSection('cadernos') : k === 'settings' ? openTool('settings') : go(k)}>
            {k === 'new' ? <span className="plus">+</span> : <><Icon name={k} size={24} /><span>{label}</span></>}
          </button>
        ))}
      </div>
    )}
    {plus.el}
  </>;
}
