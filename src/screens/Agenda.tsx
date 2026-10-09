import { useEffect, useRef, useState } from 'react';
import { addDays, dayKey, keyTime, todayKey, type Task } from '../lib/items';
import { dayLabel, dayMonth, uid } from '../lib/notes';
import { addTask, dayNotesOn, deleteTask, moveTask, openDay, plannedDays, set, setDayNote, setTaskText, tasksOn, toggleTask, type State } from '../store';
import { AutoArea, Icon, MonthCal } from '../ui';

// "Hoje", "Amanhã", "Ontem" ou o dia da semana com a data.
export function agendaLabel(k: string) {
  const t = todayKey();
  return k === t ? 'Hoje' : k === addDays(t, 1) ? 'Amanhã' : k === addDays(t, -1) ? 'Ontem' : dayLabel(keyTime(k));
}
const fullLabel = (k: string) => { const l = agendaLabel(k); return l === 'Hoje' || l === 'Amanhã' || l === 'Ontem' ? l + ', ' + dayMonth(keyTime(k)) : l; };

// O + do celular pede o campo de tarefa nova já com o cursor.
let wantFocus = false;
export const focusNewTask = () => { wantFocus = true; };

function AgendaCal({ s }: { s: State }) {
  const planned = plannedDays(s);
  return <MonthCal y={s.agY} m={s.agM} all onMove={(agY, agM) => set({ agY, agM })} has={t => planned.has(dayKey(t))} isSel={t => dayKey(t) === s.agDay}
    onPick={t => { openDay(dayKey(t)); if (s.mobile) set({ agCal: false }); }} />;
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

function TaskRow({ t, k }: { t: Task; k: string }) {
  const toToday = k === todayKey();
  return (
    <div className={'task' + (t.done ? ' done' : '')}>
      <button className={'tick press' + (t.done ? ' on' : '')} role="checkbox" aria-checked={t.done} aria-label={t.done ? 'Desmarcar ' + t.text : 'Marcar ' + t.text + ' como feita'} onClick={() => toggleTask(t.id)}><i>{t.done ? '✓' : ''}</i></button>
      <input className="tasktext" value={t.text} aria-label="Tarefa" onChange={e => setTaskText(t.id, e.target.value)} onBlur={() => { if (!t.text.trim()) deleteTask(t.id); }} />
      {!t.done && <button className="mini press" title={toToday ? 'Passar para amanhã' : 'Passar para o dia seguinte'} onClick={() => moveTask(t.id, addDays(k, 1))}>{toToday ? 'Amanhã' : 'Dia seguinte'}</button>}
      <button className="mini x press" aria-label={'Apagar ' + t.text} onClick={() => deleteTask(t.id)}>×</button>
    </div>
  );
}

function NewTask({ k }: { k: string }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (wantFocus) { wantFocus = false; ref.current?.focus(); } });
  const add = () => { if (v.trim()) { addTask(k, v); setV(''); } };
  return (
    <div className="task add">
      <span className="tick ghost" aria-hidden="true"><Icon name="plus" size={14} sw={3} /></span>
      <input ref={ref} className="tasktext" value={v} placeholder="Adicionar tarefa" aria-label="Adicionar tarefa" onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

function DayBody({ s, k }: { s: State; k: string }) {
  const tasks = tasksOn(s, k), notes = dayNotesOn(s, k), done = tasks.filter(t => t.done).length;
  // A observação nova nasce com este id, para o cursor não sair do lugar ao digitar a primeira letra.
  const pending = useRef(uid());
  const areas = notes.length ? notes : [{ id: pending.current, text: '' }];
  return (
    <div className="sheet">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="group">Tarefas</div>
        {tasks.length > 0 && <span className="meta">{done} de {tasks.length} {tasks.length === 1 ? 'feita' : 'feitas'}</span>}
      </div>
      <div className="col" style={{ marginTop: 8 }}>
        {tasks.map(t => <TaskRow key={t.id} t={t} k={k} />)}
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
    <div className="row" style={{ gap: 8, padding: '12px 14px', flex: 'none' }}>
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullLabel(k)}</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{sub}</div>
      </div>
      {k !== today && <button className="pill press" onClick={() => openDay(today)}>Hoje</button>}
      <button className="round press" aria-label="Dia anterior" onClick={() => openDay(addDays(k, -1))}><Icon name="back" sw={2.6} /></button>
      <button className="round press flip" aria-label="Próximo dia" onClick={() => openDay(addDays(k, 1))}><Icon name="back" sw={2.6} /></button>
      {s.mobile && (
        <button className="round press" aria-label="Calendário" aria-pressed={s.agCal} onClick={() => set({ agCal: !s.agCal })}
          style={s.agCal ? { background: 'rgba(255,255,255,.95)', color: 'var(--acc-d)' } : undefined}>
          <Icon name="calendar" />
        </button>
      )}
    </div>
    {s.mobile && s.agCal && <div style={{ padding: '0 12px 10px', flex: 'none' }}><AgendaCal s={s} /></div>}
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 12px 12px' }}>
      <DayBody key={k} s={s} k={k} />
    </div>
  </>;
}
