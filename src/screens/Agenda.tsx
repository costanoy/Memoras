import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { addDays, dayKey, keyTime, todayKey, type Task } from '../lib/items';
import { dayLabel, dayMonth, uid } from '../lib/notes';
import { addTask, dayNotesOn, deleteTask, doneDays, get, go, insertTaskAfter, moveTask, onePane, openDay, openMenu, plannedDays, reorderTask, set, setDayNote, setTaskText, tasksOn, toggleTask, type State } from '../store';
import { AutoArea, editing, Icon, menuOn, MonthCal } from '../ui';

// "Hoje", "Amanhã", "Ontem" ou o dia da semana com a data.
export function agendaLabel(k: string) {
  const t = todayKey();
  return k === t ? 'Hoje' : k === addDays(t, 1) ? 'Amanhã' : k === addDays(t, -1) ? 'Ontem' : dayLabel(keyTime(k));
}
export const fullLabel = (k: string) => { const l = agendaLabel(k); return l === 'Hoje' || l === 'Amanhã' || l === 'Ontem' ? l + ', ' + dayMonth(keyTime(k)) : l; };

// O + do celular pede o campo de tarefa nova já com o cursor.
let wantFocus = false;
export const focusNewTask = () => { wantFocus = true; };
// Tarefa que recebe o cursor quando aparecer na tela (Enter cria uma logo abaixo; apagar volta para a de cima).
let focusTaskId: string | null = null;

// Dia com todas as tarefas feitas aparece com ✓ no lugar do pontinho.
function AgendaCal({ s }: { s: State }) {
  const planned = plannedDays(s), done = doneDays(s);
  return <MonthCal y={s.agY} m={s.agM} all onMove={(agY, agM) => set({ agY, agM })} has={t => planned.has(dayKey(t))} done={t => done.has(dayKey(t))} isSel={t => dayKey(t) === s.agDay}
    onPick={t => { openDay(dayKey(t)); if (onePane(s)) set({ agCal: false }); }} />;
}

// Barra lateral do computador: calendário e os próximos dias com plano.
export function AgendaSide({ s }: { s: State }) {
  const today = todayKey();
  const next = [...plannedDays(s)].filter(k => k >= today).sort().slice(0, 10);
  return <>
    <AgendaCal s={s} />
    <div className="scroll" style={{ gap: 6, padding: '2px 2px 8px', margin: '0 -2px' }}>
      {next.length > 0 && <div className="group" style={{ padding: '2px 8px 0' }}>Próximos dias</div>}
      {next.map(k => {
        const ts = tasksOn(s, k), left = ts.filter(t => !t.done).length;
        return (
          <button key={k} className={'item press' + (k === s.agDay && s.screen === 'agenda' ? ' on' : '')} onClick={() => openDay(k)}>
            <span className="row" style={{ gap: 8, alignItems: 'baseline', width: '100%' }}><span className="ttl">{fullLabel(k)}</span><span className="meta">{!ts.length ? '' : left ? left + ' a fazer' : 'Tudo feito'}</span></span>
            <span className="prev">{ts.map(t => t.text).join(' · ') || dayNotesOn(s, k)[0]?.text}</span>
          </button>
        );
      })}
      {!next.length && <div className="small" style={{ padding: '6px 8px', color: 'var(--ink3)' }}>Escolha um dia no calendário para planejar.</div>}
    </div>
  </>;
}

// Arrastar pela alça: a tarefa segue o dedo (ou o mouse) e as outras abrem espaço; ao soltar, fica na
// posição nova. As setas do teclado na alça também mudam a ordem.
type Drag = { id: string; from: number; to: number; y0: number; dy: number; mids: number[]; h: number };
type Grab = { down(e: PointerEvent<HTMLButtonElement>, id: string): void; move(e: PointerEvent): void; up(): void; cancel(): void; key(id: string, dir: number): void };

// No celular, a linha fica só com a alça, a caixinha e o texto: "Amanhã" e apagar ficam no toque longo
// (no computador, também no botão direito). Tocar longo no texto que se está editando é do sistema (copiar, colar).
function TaskRow({ t, k, i, drag, grab, rowRef, mobile, menuOpen }: { t: Task; k: string; i: number; drag: Drag | null; grab: Grab; rowRef: (el: HTMLDivElement | null) => void; mobile: boolean; menuOpen: boolean }) {
  const toToday = k === todayKey();
  let shift = 0;
  if (drag?.id === t.id) shift = drag.dy;
  else if (drag && drag.from < drag.to && i > drag.from && i <= drag.to) shift = -drag.h;
  else if (drag && drag.to < drag.from && i >= drag.to && i < drag.from) shift = drag.h;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusTaskId !== t.id) return;
    focusTaskId = null;
    const el = ref.current;
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });
  // Enter: linha nova logo abaixo, com a caixinha. Enter numa linha vazia vai para "Adicionar tarefa".
  // Apagar numa linha vazia tira a linha e volta para a de cima.
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!t.text.trim()) { wantFocus = true; deleteTask(t.id); return; }
      const id = insertTaskAfter(t.id);
      if (id) focusTaskId = id;
    } else if (e.key === 'Backspace' && !t.text) {
      e.preventDefault();
      const list = tasksOn(get(), k), prev = list[list.findIndex(x => x.id === t.id) - 1];
      if (prev) focusTaskId = prev.id; else wantFocus = true;
      deleteTask(t.id);
    }
  };
  const menu = menuOn((x, y, touch) => openMenu('task', t.id, x, y, touch), (el, touch) => !editing(el) && !(touch && el.closest('.grip')));
  return (
    <div ref={rowRef} className={'task' + (t.done ? ' done' : '') + (drag?.id === t.id ? ' dragging' : drag ? ' shift' : '') + (menuOpen ? ' ctxon' : '')}
      style={shift ? { transform: 'translateY(' + shift + 'px)' } : undefined} {...menu}>
      <button className="grip" aria-label={'Mudar a ordem de ' + (t.text || 'tarefa')} title="Arraste para mudar a ordem"
        onPointerDown={e => grab.down(e, t.id)} onPointerMove={grab.move} onPointerUp={grab.up} onPointerCancel={grab.cancel}
        onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); grab.key(t.id, e.key === 'ArrowUp' ? -1 : 1); } }}>
        <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">{[3, 9, 15].map(y => <g key={y}><circle cx="3" cy={y} r="1.7" /><circle cx="9" cy={y} r="1.7" /></g>)}</svg>
      </button>
      <button className={'tick press' + (t.done ? ' on' : '')} role="checkbox" aria-checked={t.done} aria-label={t.done ? 'Desmarcar ' + t.text : 'Marcar ' + t.text + ' como feita'} onClick={() => toggleTask(t.id)}><i>{t.done ? '✓' : ''}</i></button>
      {/* enterKeyHint: no Android, a tecla Enter do teclado vira um Enter de verdade (sem ele, ela pulava para as Observações). */}
      <input ref={ref} className="tasktext" value={t.text} aria-label="Tarefa" enterKeyHint="enter" onChange={e => setTaskText(t.id, e.target.value)} onKeyDown={keys} onBlur={() => { if (!t.text.trim()) deleteTask(t.id); }} />
      {!mobile && !t.done && <button className="mini press" title={toToday ? 'Passar para amanhã' : 'Passar para o dia seguinte'} onClick={() => moveTask(t.id, addDays(k, 1))}>{toToday ? 'Amanhã' : 'Dia seguinte'}</button>}
      {!mobile && <button className="mini x press" aria-label={'Apagar ' + t.text} onClick={() => deleteTask(t.id)}>×</button>}
    </div>
  );
}

// Linha para a próxima tarefa: enquanto se escreve nela, o + vira uma caixinha vazia.
function NewTask({ k }: { k: string }) {
  const [v, setV] = useState(''), [on, setOn] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (wantFocus) { wantFocus = false; ref.current?.focus(); } });
  const add = () => { if (v.trim()) { addTask(k, v); setV(''); } };
  return (
    <div className="task add">
      <span className="gripspace" aria-hidden="true" />
      <span className="tick ghost" aria-hidden="true">{!on && !v && <Icon name="plus" size={14} sw={3} />}</span>
      <input ref={ref} className="tasktext" value={v} placeholder="Adicionar tarefa" aria-label="Adicionar tarefa" enterKeyHint="enter" onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} onFocus={() => setOn(true)} onBlur={() => { setOn(false); add(); }} />
    </div>
  );
}

function DayBody({ s, k }: { s: State; k: string }) {
  const tasks = tasksOn(s, k), notes = dayNotesOn(s, k), done = tasks.filter(t => t.done).length;
  // A observação nova nasce com este id, para o cursor não sair do lugar ao digitar a primeira letra.
  const pending = useRef(uid());
  const areas = notes.length ? notes : [{ id: pending.current, text: '' }];
  const rows = useRef(new Map<string, HTMLDivElement>());
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragNow = useRef<Drag | null>(null);
  const put = (d: Drag | null) => { dragNow.current = d; setDrag(d); };
  const grab: Grab = {
    down(e, id) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const from = tasks.findIndex(t => t.id === id), rects = tasks.map(t => rows.current.get(t.id)!.getBoundingClientRect());
      put({ id, from, to: from, y0: e.clientY, dy: 0, mids: rects.map(r => r.top + r.height / 2), h: rects[from].height });
    },
    move(e) {
      const d = dragNow.current;
      if (!d) return;
      const dy = e.clientY - d.y0, center = d.mids[d.from] + dy;
      put({ ...d, dy, to: d.mids.filter((m, i) => i !== d.from && m < center).length });
    },
    up() { const d = dragNow.current; put(null); if (d && d.to !== d.from) reorderTask(d.id, d.to); },
    cancel() { put(null); },
    key(id, dir) { const to = tasks.findIndex(t => t.id === id) + dir; if (to >= 0 && to < tasks.length) reorderTask(id, to); },
  };
  return (
    <div className="sheet">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="group">Tarefas</div>
        {tasks.length > 0 && <span className="meta">{done} de {tasks.length} {tasks.length === 1 ? 'feita' : 'feitas'}</span>}
      </div>
      <div className="col" style={{ marginTop: 8 }}>
        {tasks.map((t, i) => <TaskRow key={t.id} t={t} k={k} i={i} drag={drag} grab={grab} mobile={s.mobile} menuOpen={s.menu?.id === t.id}
          rowRef={el => { if (el) rows.current.set(t.id, el); else rows.current.delete(t.id); }} />)}
        <NewTask k={k} />
      </div>
      <div className="group" style={{ marginTop: 30 }}>Observações</div>
      {areas.map((n, i) => (
        <div key={n.id} className="col" style={{ marginTop: 10, gap: 4 }}>
          {i > 0 && <div className="segtime">Outra versão, de outro aparelho</div>}
          <AutoArea value={n.text} label="Observações do dia" placeholder="Algo mais sobre este dia?" onChange={v => setDayNote(k, n.id, v)} />
        </div>
      ))}
    </div>
  );
}

// O plano de um dia: tarefas com caixinha e observações.
export function AgendaDay({ s }: { s: State }) {
  const k = s.agDay, today = todayKey(), tasks = tasksOn(s, k), left = tasks.filter(t => !t.done).length;
  const sub = !tasks.length ? 'Nada planejado ainda' : !left ? 'Tudo feito' : left === 1 ? '1 tarefa a fazer' : left + ' tarefas a fazer';
  return <>
    <div className="row ibar">
      <div className="ibar-txt">
        <div className="ibar-t">{fullLabel(k)}</div>
        <div className="ibar-s">{sub}</div>
      </div>
      {k !== today && <button className="pill press" onClick={() => openDay(today)}>Hoje</button>}
      <button className="round press" aria-label="Dia anterior" title="Dia anterior" onClick={() => openDay(addDays(k, -1))}><Icon name="back" sw={2.6} /></button>
      <button className="round press flip" aria-label="Próximo dia" title="Próximo dia" onClick={() => openDay(addDays(k, 1))}><Icon name="back" sw={2.6} /></button>
      {onePane(s) && (
        <button className="round press" aria-label="Calendário" title="Calendário" aria-pressed={s.agCal} onClick={() => set({ agCal: !s.agCal })}
          style={s.agCal ? { background: 'rgba(255,255,255,.95)', color: 'var(--acc-d)' } : undefined}>
          <Icon name="calendar" />
        </button>
      )}
    </div>
    {onePane(s) && s.agCal && (
      <div className="agcal">
        <AgendaCal s={s} />
        {/* No Mini-Memoras, o Resumão fica a um clique daqui (ele mora em Cadernos). */}
        {s.mini && <button className="link" style={{ alignSelf: 'center', fontSize: 14, fontWeight: 700 }} onClick={() => go('summary')}>Ver o Resumão</button>}
      </div>
    )}
    {/* Cada dia começa do alto (o painel não herda a rolagem do dia anterior). */}
    <div key={k} className="iscroll">
      <DayBody s={s} k={k} />
    </div>
  </>;
}
