import { Fragment, useEffect, useRef } from 'react';
import { docPreview, docTitle, parseDoc, type Block, type Doc } from '../lib/items';
import { DAY, dayMonth, fmtT, same } from '../lib/notes';
import { docsOf, finishDoc, go, lastEdit, newDoc, openDoc, set, setDocBody, setDocTitle, trashDoc, type State } from '../store';
import { AutoArea, Icon } from '../ui';

const when = (t: number) => same(t, Date.now()) ? fmtT(t) : same(t, Date.now() - DAY) ? 'Ontem' : dayMonth(t);
const edited = (t: number) => same(t, Date.now()) ? 'Editado hoje às ' + fmtT(t) : same(t, Date.now() - DAY) ? 'Editado ontem' : 'Editado em ' + dayMonth(t);

// Lista dos cadernos: na barra lateral do computador e na aba Cadernos do celular.
export function DocsList({ s }: { s: State }) {
  const docs = docsOf(s);
  return <>
    {!s.mobile && (
      <button className="gel row" style={{ flex: 'none', justifyContent: 'center', gap: 8, height: 50 }} onClick={() => newDoc()}>
        <Icon name="plus" size={18} sw={3} />Novo caderno
      </button>
    )}
    <div className="scroll" style={{ gap: 6, padding: '2px 2px 8px', margin: '0 -2px' }}>
      {docs.map(d => (
        <button key={d.id} className={'item press' + (!s.mobile && s.docSel === d.id && (s.screen === 'docs' || s.screen === 'doc') ? ' on' : '')} onClick={() => openDoc(d.id)}>
          <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{docTitle(d)}</span><span className="meta">{when(lastEdit(d))}</span></span>
          <span className="prev">{docPreview(d.body) || 'Sem texto ainda'}</span>
        </button>
      ))}
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

function Rendered({ b }: { b: Block }) {
  if (b.t === 'h1') return <h2>{b.lines[0]}</h2>;
  if (b.t === 'h2') return <h3>{b.lines[0]}</h3>;
  if (b.t === 'ul') return <ul>{b.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>;
  if (b.t === 'ol') return <ol>{b.lines.map((l, i) => <li key={i}>{l}</li>)}</ol>;
  return <p>{b.lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}</p>;
}

// Um caderno: abre para leitura; "Editar" troca para o texto cru, com # e -.
export function DocView({ s, d }: { s: State; d: Doc }) {
  const edit = s.docEdit, acc = s.cfg.account;
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (edit && !d.title && !d.body) titleRef.current?.focus(); }, [edit]);
  const blocks = edit ? [] : parseDoc(d.body);
  const sub = !acc ? 'Salvo neste aparelho' : s.sync === 'offline' ? 'Salvo no aparelho · sincroniza quando voltar a internet' : s.sync === 'error' ? 'Salvo no aparelho' : 'Salvo';
  return <>
    <div className="row" style={{ gap: 8, padding: '12px 14px', flex: 'none' }}>
      {s.mobile && <button className="round press" aria-label="Voltar" onClick={() => { finishDoc(); go('docs'); }}><Icon name="back" sw={2.6} /></button>}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.body ? edited(lastEdit(d)) : 'Caderno novo'}</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{sub}</div>
      </div>
      {edit
        ? <button className="pill press" onClick={finishDoc}>Pronto</button>
        : <button className="pill press" aria-label="Editar" onClick={() => set({ docEdit: true })}><Icon name="edit" size={18} />{!s.mobile && 'Editar'}</button>}
      <button className="pill press" aria-label="Mover para a lixeira" onClick={() => trashDoc(d.id)}><Icon name="trash" size={18} />{!s.mobile && 'Lixeira'}</button>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 12px 12px' }}>
      {edit ? (
        <div className="sheet">
          <input ref={titleRef} className="title" value={d.title} placeholder="Título do caderno" aria-label="Título do caderno" onChange={e => setDocTitle(d.id, e.target.value)} />
          <div className="dochint">Comece a linha com # para um título e com - para uma lista.</div>
          <AutoArea className="segtext docbody" value={d.body} label="Texto do caderno" placeholder="Escreva aqui o que você quer reler depois." onChange={v => setDocBody(d.id, v)} />
        </div>
      ) : (
        <div className="sheet doc">
          {d.title.trim() && <div className="title">{d.title}</div>}
          {blocks.length ? blocks.map((b, i) => <Rendered key={i} b={b} />) : <p className="dochint">Este caderno está vazio. Toque em Editar para escrever.</p>}
        </div>
      )}
    </div>
  </>;
}
