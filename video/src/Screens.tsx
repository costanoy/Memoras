// Telas do Memoras desenhadas com as mesmas classes do app (src/styles.css),
// no tamanho lógico de um celular (390 × 844). Tudo é controlado quadro a quadro.
import React, { type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../../src/icons';

export type Item = { group: string; title: string; time: string; prev: string };

export const NOTES: Item[] = [
  { group: 'Hoje', title: 'Caminhada no parque', time: '07:12', prev: 'Saí cedo, antes do café. O parque estava quase vazio e o lago tinha uma névoa fina.' },
  { group: 'Ontem', title: 'Ideias para o fim de semana', time: '21:40', prev: 'Visitar a feira de sábado, terminar o livro e testar a receita de pão.' },
  { group: 'Domingo, 27 de setembro', title: 'Primeira aula de cerâmica', time: '10:05', prev: 'A peça saiu torta, mas é minha. Quero voltar na semana que vem.' },
  { group: 'Domingo, 27 de setembro', title: 'Dia de chuva', time: '17:50', prev: 'Choveu o dia inteiro. Li bastante, fiz pão e não abri o email.' },
  { group: 'Sexta, 25 de setembro', title: 'Livros para outubro', time: '22:15', prev: 'Terminar o romance da estante e começar aquele de contos que ganhei.' },
];

export const Caret = ({ on }: { on: boolean }) => (
  <span style={{ display: 'inline-block', width: 2, height: '1.1em', marginLeft: 1, verticalAlign: 'text-bottom', background: 'var(--acc)', opacity: on ? 1 : 0 }} />
);

export const StatusBar = ({ color = 'var(--ink)' }: { color?: string }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', fontWeight: 700, fontSize: 15, color, zIndex: 60 }}>
    <span>9:41</span>
    <span style={{ width: 24, height: 12, border: '1.5px solid currentColor', borderRadius: 4, padding: 1.5, display: 'block' }}>
      <span style={{ display: 'block', width: '75%', height: '100%', background: 'currentColor', borderRadius: 1.5 }} />
    </span>
  </div>
);

const wrap: CSSProperties = { paddingTop: 50 };

export function SyncPill({ state, spin }: { state: 'synced' | 'syncing' | 'local'; spin: number }) {
  const dot = state === 'syncing'
    ? <span className="spin" style={{ animation: 'none', transform: `rotate(${spin}deg)` }} />
    : <span className="sdot" style={{ background: state === 'synced' ? '#2fae4f' : '#6b8595', boxShadow: `0 0 0 3px ${state === 'synced' ? '#2fae4f33' : '#6b859533'}` }} />;
  return <div className="syncpill">{dot}{state === 'synced' ? 'Sincronizado' : state === 'syncing' ? 'Sincronizando…' : 'Só neste aparelho'}</div>;
}

export function TabBar({ on, plus }: { on: 'history' | 'search'; plus?: CSSProperties }) {
  const tabs: [string, string][] = [['history', 'Diário'], ['search', 'Busca'], ['new', ''], ['archive', 'Arquivo'], ['settings', 'Ajustes']];
  return (
    <div className="tabbar">
      {tabs.map(([k, label]) => (
        <div key={k} className={k === on ? 'on' : ''} style={{ flex: 1, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: k === on ? 'var(--acc-d)' : 'var(--ink2)' }}>
          {k === 'new' ? <span className="plus" style={plus}>+</span> : <><Icon name={k} size={24} /><span>{label}</span></>}
        </div>
      ))}
    </div>
  );
}

export function History({ items, sync, spin = 0, calendar, children }: { items: Item[]; sync: 'synced' | 'syncing' | 'local'; spin?: number; calendar?: ReactNode; children?: ReactNode }) {
  const groups: { label: string; items: Item[] }[] = [];
  items.forEach(n => { const g = groups[groups.length - 1]; if (g && g.label === n.group) g.items.push(n); else groups.push({ label: n.group, items: [n] }); });
  return (
    <div className="wrap m" style={wrap}>
      <div className="side">
        <div className="panel">
          <div className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '0 4px' }}>
            <div className="col" style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <div className="name" style={{ margin: 0, padding: 0 }}>Meu diário</div>
              <SyncPill state={sync} spin={spin} />
            </div>
            <div className="round"><Icon name="calendar" /></div>
          </div>
          {children}
          <div className="scroll" style={{ gap: 14, padding: '2px 2px 8px', margin: '0 -2px', overflow: 'hidden' }}>
            {groups.map(g => (
              <div key={g.label} className="col" style={{ gap: 6 }}>
                <div className="group" style={{ padding: '0 8px' }}>{g.label}</div>
                {g.items.map(n => (
                  <div key={n.title} className="item">
                    <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{n.title}</span><span className="meta">{n.time}</span></span>
                    <span className="prev">{n.prev}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {calendar}
        </div>
      </div>
    </div>
  );
}

export function Calendar({ selected, tap = 0 }: { selected: number | null; tap?: number }) {
  // Setembro de 2026 começa numa terça.
  const has = [3, 8, 12, 14, 19, 22, 25, 27, 29, 30];
  return (
    <div className="cal">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="arrow" style={{ display: 'grid', placeItems: 'center' }}>‹</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Setembro de 2026</span>
        <span className="arrow" style={{ display: 'grid', placeItems: 'center' }}>›</span>
      </div>
      <div className="calgrid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => <span key={i}>{w}</span>)}
        <i /><i />
        {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
          <div key={d} className={'day' + (has.includes(d) ? ' has' : '') + (d === 30 ? ' today' : '') + (d === selected ? ' sel' : '')} style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>{d}{d === 27 && tap > 0 && tap < 1 && <span style={{ position: 'absolute', left: '50%', top: '50%', width: 40, height: 40, margin: -20, borderRadius: '50%', background: 'rgba(255,255,255,.5)', border: '2px solid rgba(255,255,255,.9)', transform: `scale(${0.6 + tap * 0.9})`, opacity: 1 - tap }} />}</div>
        ))}
      </div>
    </div>
  );
}

export type Seg = { time: string; text: string; show: number; caret?: boolean };

export function Editor({ title, segs, sub = 'Salvo', caret, sheetStyle }: { title: string; segs: Seg[]; sub?: string; caret?: boolean; sheetStyle?: CSSProperties }) {
  return (
    <div className="wrap m notab" style={wrap}>
      <div className="main">
        <div className="panel">
          <div className="row" style={{ gap: 8, padding: '12px 14px', flex: 'none' }}>
            <div className="round"><Icon name="back" sw={2.6} /></div>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Hoje, 30 de setembro</div>
              <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{sub}</div>
            </div>
            <div className="pill"><Icon name="archive" size={18} /></div>
            <div className="pill"><Icon name="trash" size={18} /></div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 12px 12px' }}>
            <div className="sheet" style={{ animation: 'none', ...sheetStyle }}>
              <div className="title" style={{ color: title ? 'var(--ink)' : '#6d8898' }}>{title || 'Título (opcional)'}</div>
              {segs.map((s, i) => (
                <div key={i} className="col" style={{ marginTop: 22, gap: 4, opacity: s.show, transform: `translateY(${(1 - s.show) * 14}px)` }}>
                  {s.time && <div className="segtime">{s.time}</div>}
                  <div className="segtext" style={{ whiteSpace: 'pre-wrap', color: s.text ? 'var(--ink)' : '#6d8898' }}>
                    {s.text || 'Escreva o que quiser…'}{s.caret && <Caret on={!!caret} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Search({ query, caret, result }: { query: string; caret: boolean; result: number }) {
  return (
    <div className="wrap m" style={wrap}>
      <div className="main">
        <div className="panel">
          <div className="col" style={{ padding: '22px 20px 12px', gap: 14, flex: 'none' }}>
            <div className="h1">Busca</div>
            <div className="searchbox">
              <Icon name="search" sw={2.4} />
              <span style={{ flex: 1, fontSize: 17, color: query ? 'var(--ink)' : '#6d8898' }}>{query || 'Buscar nas anotações'}<Caret on={caret} /></span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)', padding: '0 6px', opacity: result }}>1 anotação</div>
          </div>
          <div className="col" style={{ padding: '0 16px 16px', gap: 8 }}>
            <div className="gcard" style={{ gap: 4, padding: '14px 16px', opacity: result, transform: `translateY(${(1 - result) * 16}px)` }}>
              <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">Caminhada no parque</span><span className="meta">Hoje</span></span>
              <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink3)' }}>
                …quase vazio. Deixei o fone em casa e deu para ouvir os <mark style={{ boxShadow: `0 0 0 ${3 * result}px rgba(166,231,86,.45)` }}>pássaros</mark>. Quero repetir a caminhada…
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Pin({ filled, hit }: { filled: number; hit: number }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <div className="flow" style={{ paddingTop: 70 }}>
      <div className="card" style={{ maxWidth: 360, alignItems: 'center', gap: 22, padding: '34px 24px 28px' }}>
        <div className="col" style={{ alignItems: 'center', gap: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)', letterSpacing: '.04em' }}>Meu diário</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Digite seu PIN</div>
        </div>
        <div className="dots">{[0, 1, 2, 3].map(i => <i key={i} className={i < filled ? 'f' : ''} />)}</div>
        <div style={{ minHeight: 22 }} />
        <div className="keys">
          {keys.map((k, i) => (
            <div key={i} className={'key' + (i === hit ? ' hit' : '')} style={{ visibility: k ? 'visible' : 'hidden', display: 'grid', placeItems: 'center', fontSize: k === 'del' ? 22 : 28 }}>{k === 'del' ? '⌫' : k}</div>
          ))}
        </div>
        <div className="link">Esqueci o PIN</div>
      </div>
    </div>
  );
}

// A fechadura do desbloqueio, com os mesmos tempos do app (t em segundos desde o início).
export function Lock({ t }: { t: number }) {
  const cl = (v: number) => Math.max(0, Math.min(1, v));
  const ease = (v: number) => 1 - Math.pow(1 - cl(v), 3);
  const turn = ease(t / 0.24) * 90;
  const shackle = ease((t - 0.24) / 0.16) * -18;
  const out = cl((t - 0.38) / 0.3);
  const sheen = cl((t - 0.06) / 0.3) * 280;
  const overlay = 1 - cl((t - 0.44) / 0.26);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'var(--bg)', opacity: overlay }}>
      <div className="lock" style={{ animation: 'none', transform: `scale(${1 + out * 0.35})`, opacity: 1 - out }}>
        <div className="shackle" style={{ animation: 'none', transform: `translateY(${shackle}px)` }} />
        <div className="body">
          <div className="gloss" /><div className="hole" />
          <div className="keybar" style={{ animation: 'none', transform: `rotate(${turn}deg)` }} />
          <div className="sheen" style={{ animation: 'none', transform: `translateX(${sheen}px) skewX(-20deg)` }} />
        </div>
      </div>
    </div>
  );
}
