import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DAY, H, dayLabel, dayMonth, dispTitle, fmtT, fullText, isEmpty, monthYear, nd, normMap, preview, same, uid, type Note } from '../lib/notes';
import { activeSorted, archive, editSeg, go, live, newNote, openNote, set, setCfg, setPrefs, setStatus, setTitle, startCreatePin, toast, trash, typeNew, useApp, type State } from '../store';
import { friendly, logout, regenRecovery, syncNow } from '../sync';
import { Icon, SyncDot, syncLabel, ThemeGrid, Toggle } from '../ui';

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Calendar({ s, act }: { s: State; act: Note[] }) {
  const first = new Date(s.calY, s.calM, 1), dim = new Date(s.calY, s.calM + 1, 0).getDate();
  const move = (d: number) => { const m = new Date(s.calY, s.calM + d, 1); set({ calY: m.getFullYear(), calM: m.getMonth() }); };
  return (
    <div className="cal">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <button className="arrow press" aria-label="Mês anterior" onClick={() => move(-1)}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{monthYear(s.calY, s.calM)}</span>
        <button className="arrow press" aria-label="Próximo mês" onClick={() => move(1)}>›</button>
      </div>
      <div className="calgrid">
        {DOW.map((w, i) => <span key={i}>{w}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <i key={'e' + i} />)}
        {Array.from({ length: dim }, (_, i) => {
          const t = new Date(s.calY, s.calM, i + 1).getTime();
          const has = act.some(n => same(nd(n), t)), sel = !!s.day && same(s.day, t);
          return (
            <button key={i} className={'day' + (has ? ' has press' : '') + (same(t, Date.now()) ? ' today' : '') + (sel ? ' sel' : '')} tabIndex={has ? 0 : -1} aria-pressed={sel}
              onClick={() => has && set({ day: sel ? null : t, screen: s.mobile || (s.screen !== 'editor' && s.screen !== 'history') ? 'history' : s.screen })}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAV = [['search', 'Busca'], ['archive', 'Arquivo'], ['trash', 'Lixeira'], ['settings', 'Ajustes'], ['calendar', 'Calendário']] as const;

function Side({ s }: { s: State }) {
  const act = activeSorted(s), acc = s.cfg.account, scr = s.screen, isTrash = s.shelf === 'trash';
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
        <div className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '0 4px' }}>
          <div className="col" style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <input className="name" value={s.cfg.diaryName} aria-label="Nome do diário" title="Clique para renomear" placeholder="Nome do diário"
              onChange={e => setPrefs({ diaryName: e.target.value })}
              onBlur={() => { if (!s.cfg.diaryName.trim()) setPrefs({ diaryName: 'Meu diário' }); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }} />
            <button className="syncpill press" onClick={() => acc ? (s.sync === 'error' || s.sync === 'synced') && void syncNow() : go('settings')}>
              <SyncDot />{syncLabel(!!acc, s.sync)}
            </button>
          </div>
          {s.mobile && (
            <button className="round press" aria-label="Calendário" aria-pressed={s.calOpen} onClick={() => set({ calOpen: !s.calOpen })}
              style={s.calOpen ? { background: 'rgba(255,255,255,.95)', color: 'var(--acc-d)' } : undefined}>
              <Icon name="calendar" />
            </button>
          )}
        </div>

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

        {!s.mobile && (
          <div className="nav">
            {NAV.map(([k, label]) => {
              const on = k === 'calendar' ? s.calOpen : k === 'trash' ? scr === 'archive' && isTrash : k === 'archive' ? scr === 'archive' && !isTrash : scr === k;
              const open = on && !(k === 'calendar' && navOther);
              const click = () => k === 'calendar' ? set({ calOpen: !s.calOpen }) : on ? go('history') : k === 'trash' || k === 'archive' ? go('archive', { shelf: k }) : go(k);
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

function Area({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } };
  useLayoutEffect(fit, [value]);
  useEffect(() => { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, []);
  return <textarea ref={ref} className="segtext" rows={1} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
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
            <Area value={g.text} placeholder="" onChange={v => { touched.current.add(g.id); editSeg(cur.id, g.id, v); }} />
          </div>
        ) : (
          <div key={pending.current} className="col" style={{ marginTop: 22, gap: 4 }}>
            <div className="segtime" hidden />
            <Area value="" placeholder={segs.length ? 'Continue escrevendo…' : 'Escreva o que quiser…'}
              onChange={v => { if (!v) return; const id = pending.current; touched.current.add(id); pending.current = uid(); typeNew(cur.id, id, v); }} />
          </div>
        ))}
      </div>
    </div>
  </>;
}

function Search({ s }: { s: State }) {
  const q = s.query.trim();
  const results: { n: Note; before: string; match: string; after: string }[] = [];
  if (q) {
    const nq = normMap(q).out;
    live(s).filter(n => n.status !== 'trashed').sort((a, b) => nd(b) - nd(a)).forEach(n => {
      const src = [n.title, fullText(n)].join(' · '), m = normMap(src), idx = m.out.indexOf(nq);
      if (idx < 0) return;
      const a = m.map[idx], b = m.map[idx + nq.length - 1] + 1, st = Math.max(0, a - 60);
      results.push({ n, before: (st > 0 ? '…' : '') + src.slice(st, a), match: src.slice(a, b), after: src.slice(b, b + 90) + (b + 90 < src.length ? '…' : '') });
    });
  }
  return <>
    <div className="col" style={{ padding: '22px 20px 12px', gap: 14, flex: 'none' }}>
      <div className="h1">Busca</div>
      <label className="searchbox">
        <Icon name="search" sw={2.4} />
        <input value={s.query} placeholder="Buscar nas anotações" aria-label="Buscar nas anotações" autoFocus={!s.mobile} onChange={e => set({ query: e.target.value })} />
      </label>
      {results.length > 0 && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)', padding: '0 6px' }}>{results.length === 1 ? '1 anotação' : results.length + ' anotações'}</div>}
    </div>
    <div className="scroll" style={{ padding: '0 16px 16px', gap: 8 }}>
      {results.map(r => (
        <button key={r.n.id} className="gcard press" style={{ gap: 4, padding: '14px 16px' }} onClick={() => openNote(r.n.id)}>
          <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{dispTitle(r.n)}</span><span className="meta">{dayLabel(nd(r.n))}</span></span>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink3)' }}>{r.before}<mark>{r.match}</mark>{r.after}</span>
          {r.n.status === 'archived' && <span className="tag">Arquivada</span>}
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
  return <>
    <div className="col" style={{ padding: '22px 20px 12px', gap: 14, flex: 'none' }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="h1">{isTrash ? 'Lixeira' : 'Arquivo'}</div>
        {isTrash && rows.length > 0 && <button className="glassbtn press danger" style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => set({ confirm: { all: true } })}>Esvaziar lixeira</button>}
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
      {!rows.length && (
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

const TABS = [['history', 'Diário'], ['search', 'Busca'], ['new', 'Nova anotação'], ['archive', 'Arquivo'], ['settings', 'Ajustes']] as const;

export function Shell() {
  const s = useApp(), scr = s.screen;
  const cur = s.notes.find(n => n.id === s.sel && !n.deleted && n.status !== 'trashed');
  const showEditor = !!cur && (scr === 'editor' || (!s.mobile && scr === 'history'));
  const historyOnly = s.mobile && (scr === 'history' || (scr === 'editor' && !cur));
  return <>
    <div className={'wrap' + (s.mobile ? ' m' : '')}>
      {(!s.mobile || historyOnly) && <Side s={s} />}
      {!historyOnly && (
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
            {scr === 'search' && <Search s={s} />}
            {scr === 'archive' && <Shelf s={s} />}
            {scr === 'settings' && <Settings s={s} />}
          </div>
        </div>
      )}
    </div>
    {s.mobile && (
      <div className="tabbar">
        {TABS.map(([k, label]) => (
          <button key={k} className={'press' + (k === scr || (k === 'history' && scr === 'editor') ? ' on' : '')} aria-label={label} onClick={() => k === 'new' ? newNote() : go(k)}>
            {k === 'new' ? <span className="plus">+</span> : <><Icon name={k} size={24} /><span>{label}</span></>}
          </button>
        ))}
      </div>
    )}
  </>;
}
