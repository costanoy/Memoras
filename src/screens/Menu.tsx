import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, docTitle, todayKey, type Doc, type Task } from '../lib/items';
import { dispTitle } from '../lib/notes';
import { archive, archiveDoc, askTrash, closeMenu, deleteTask, moveTask, setDocColor, setDocPinned, setNoteColor, toggleTask, useApp } from '../store';
import { PAPERS } from '../themes';
import { Icon } from '../ui';

function Item({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return <button className={'ctxitem' + (danger ? ' danger' : '')} role="menuitem" onClick={onClick}><Icon name={icon} size={18} />{label}</button>;
}

// Menu de opções de uma anotação, de um caderno ou de uma tarefa: abre com o botão direito do mouse
// ou com o toque longo (ui.tsx, menuOn). Fecha ao escolher, ao tocar fora, com Esc ou com o voltar.
export function ItemMenu() {
  const s = useApp(), m = s.menu;
  const ref = useRef<HTMLDivElement>(null), back = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const note = m?.kind === 'note' ? s.notes.find(n => n.id === m.id && !n.deleted) : undefined;
  const doc = m?.kind === 'doc' ? s.items.find((i): i is Doc => i.kind === 'doc' && i.id === m.id && !i.deleted) : undefined;
  const task = m?.kind === 'task' ? s.items.find((i): i is Task => i.kind === 'task' && i.id === m.id && !i.deleted) : undefined;
  const there = !!(note || doc || task);

  // Com o mouse, abre a partir do ponteiro; com o dedo, acima do toque (para o dedo não cobrir). Sempre dentro da tela.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!m || !el) { setPos(null); return; }
    // Aberto pelo mouse ou pelo teclado, o foco volta ao item quando o menu fecha. Pelo dedo, não
    // (devolver o foco a um campo abriria o teclado do celular de novo).
    if (!m.touch) back.current ??= document.activeElement as HTMLElement | null;
    const w = el.offsetWidth, h = el.offsetHeight, pad = 10, top0 = pad + (document.querySelector('.titlebar')?.getBoundingClientRect().bottom ?? 0);
    const left = Math.min(Math.max(pad, m.touch ? m.x - w / 2 : m.x), innerWidth - w - pad);
    let top = m.touch ? m.y - h - 16 : m.y;
    if (top < top0) top = m.touch ? m.y + 16 : top0;
    if (top + h > innerHeight - pad) top = Math.max(top0, innerHeight - h - pad);
    setPos({ left, top });
  }, [m, there]);

  useEffect(() => {
    if (!m) {
      // Fechou: o foco volta para o item, se ele ainda está na tela e nada mais pegou o foco.
      const b = back.current;
      back.current = null;
      if (b?.isConnected && (!document.activeElement || document.activeElement === document.body)) b.focus({ preventScroll: true });
      return;
    }
    if (!there) { closeMenu(); return; }
    // No celular, o teclado que abre ou fecha muda o tamanho da tela: aí o menu fica.
    const resize = () => { if (!m.touch) closeMenu(); };
    // Tocar ou clicar fora só fecha o menu, como nos menus do sistema (o toque não chega ao que está embaixo).
    const down = (e: globalThis.PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      closeMenu();
      if (e.button !== 0) return;
      const eat = (c: Event) => { c.preventDefault(); c.stopPropagation(); };
      window.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 700);
    };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); } };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', esc, true);
    window.addEventListener('resize', resize);
    window.addEventListener('blur', closeMenu);
    window.addEventListener('wheel', closeMenu, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', esc, true);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', closeMenu);
      window.removeEventListener('wheel', closeMenu);
    };
  }, [m, there]);

  // Aberto pelo mouse ou pelo teclado, o foco vai para a primeira opção (teclado e leitores de tela).
  useEffect(() => { if (m && pos && !m.touch) ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); }, [m, !!pos]);

  if (!m || !there) return null;

  // Setas andam pelas opções (e pelas cores); Tab também, sem sair do menu.
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')], i = all.indexOf(document.activeElement as HTMLButtonElement);
    const to = (n: number) => { e.preventDefault(); all[(n + all.length) % all.length]?.focus(); };
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) to(i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) to(i - 1);
    else if (e.key === 'Home') to(0);
    else if (e.key === 'End') to(all.length - 1);
  };
  const run = (fn: () => void) => () => { closeMenu(); fn(); };
  const title = note ? dispTitle(note) : doc ? docTitle(doc) : task!.text.trim() || 'Tarefa';
  const color = note?.color ?? doc?.color ?? '';
  const paint = (k: string) => run(() => note ? setNoteColor(note.id, k) : setDocColor(doc!.id, k));

  return (
    <div ref={ref} className="ctxmenu" role="menu" aria-label={'Opções de ' + title} onKeyDown={keys} onContextMenu={e => e.preventDefault()}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}>
      <div className="ctxtitle">{title}</div>
      {(note || doc) && <>
        <div className="ctxlabel">Cor</div>
        <div className="ctxcolors" role="group" aria-label="Cor">
          {PAPERS.map(([k, name, , sw]) => (
            <button key={k || 'sem'} role="menuitemradio" aria-checked={k === color} aria-label={name} title={name}
              className={'cswatch press' + (k === color ? ' on' : '')} style={{ background: sw }} onClick={paint(k)} />
          ))}
        </div>
      </>}
      {doc && <Item icon="pin" label={doc.pinned ? 'Desafixar' : 'Fixar no alto'} onClick={run(() => setDocPinned(doc.id, !doc.pinned))} />}
      {note && <Item icon="archive" label={note.status === 'archived' ? 'Desarquivar' : 'Arquivar'} onClick={run(() => archive(note.id))} />}
      {doc && <Item icon="archive" label={doc.status === 'archived' ? 'Desarquivar' : 'Arquivar'} onClick={run(() => archiveDoc(doc.id))} />}
      {task && !task.done && <Item icon="forward" label={task.date === todayKey() ? 'Passar para amanhã' : 'Passar para o dia seguinte'} onClick={run(() => moveTask(task.id, addDays(task.date, 1)))} />}
      {task && <Item icon="check" label={task.done ? 'Desmarcar' : 'Marcar como feita'} onClick={run(() => toggleTask(task.id))} />}
      {(note || doc) && <Item icon="trash" label="Mover para a lixeira" danger onClick={run(() => askTrash((note ?? doc)!.id))} />}
      {task && <Item icon="trash" label="Apagar tarefa" danger onClick={run(() => deleteTask(task.id))} />}
    </div>
  );
}
