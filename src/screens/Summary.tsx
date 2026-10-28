import { go, goBack, onePane, openDay, toggleTask, upcoming, type State } from '../store';
import { Icon } from '../ui';
import { fullLabel } from './Agenda';

// O Resumão: todas as tarefas da Agenda de hoje em diante, separadas por dia, lidas como um caderno.
// Ele se monta sozinho a partir da Agenda; aqui dá para marcar as tarefas e abrir o dia.
export function Summary({ s }: { s: State }) {
  const days = upcoming(s);
  const left = days.reduce((n, d) => n + d.tasks.filter(t => !t.done).length, 0), busy = days.filter(d => d.tasks.some(t => !t.done)).length;
  const sub = !days.length ? 'Nada planejado daqui para frente' : !left ? 'Tudo feito por enquanto'
    : (left === 1 ? '1 tarefa a fazer' : left + ' tarefas a fazer') + (busy === 1 ? ' em 1 dia' : ' em ' + busy + ' dias');
  return <>
    <div className="row ibar">
      {onePane(s) && <button className="round press" aria-label="Voltar" title={s.mini ? 'Voltar (Alt+←)' : 'Voltar'} onClick={() => s.mini ? goBack() : go('docs')}><Icon name="back" sw={2.6} /></button>}
      <div className="ibar-txt">
        <div className="ibar-t">Resumão</div>
        <div className="ibar-s">{sub}</div>
      </div>
      <button className="pill press" aria-label="Abrir a Agenda" title="Abrir a Agenda" onClick={() => go('agenda')}><Icon name="agenda" size={18} />{!s.mobile && <span className="plbl">Abrir a Agenda</span>}</button>
    </div>
    <div className="iscroll">
      <div className="sheet">
        <div className="title doctitle">Resumão</div>
        <p className="dochint" style={{ marginTop: -6 }}>Todas as tarefas de hoje em diante, separadas por dia. Ele se atualiza sozinho com a Agenda.</p>
        {days.map(({ k, tasks }) => {
          const n = tasks.filter(t => !t.done).length;
          return (
            <section key={k} className="sumday">
              <button className="sumhead" title="Abrir este dia na Agenda" onClick={() => openDay(k)}>
                <span>{fullLabel(k)}</span><span className="meta">{n ? n + ' a fazer' : 'Tudo feito'}</span>
              </button>
              {tasks.map(t => (
                <div key={t.id} className={'sumtask' + (t.done ? ' done' : '')}>
                  <button className={'tick press' + (t.done ? ' on' : '')} role="checkbox" aria-checked={t.done} aria-label={t.done ? 'Desmarcar ' + t.text : 'Marcar ' + t.text + ' como feita'}
                    onClick={() => toggleTask(t.id)}><i>{t.done ? '✓' : ''}</i></button>
                  <span>{t.text}</span>
                </div>
              ))}
            </section>
          );
        })}
        {!days.length && (
          <div className="empty" style={{ margin: '24px auto 0', gap: 10 }}>
            <div className="small" style={{ maxWidth: 300 }}>Quando você planejar tarefas na Agenda, elas aparecem aqui, dia a dia.</div>
            <button className="glassbtn press" style={{ height: 44, fontSize: 15, fontWeight: 700 }} onClick={() => go('agenda')}>Planejar na Agenda</button>
          </div>
        )}
      </div>
    </div>
  </>;
}
