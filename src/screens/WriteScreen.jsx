import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { fmtShort, fmtFull, fmtTime } from '../dateUtils';
import { isEditable } from '../entryUtils';
import { WARNING_VISIBLE_MS, LINE_HEIGHT } from '../constants';
import { NewNoteIcon, CloseIcon, UndoIcon, RedoIcon } from '../components/Icons';

/**
 * Foca a linha e deixa o cursor no fim do que já estava escrito.
 * `preventScroll` evita que o navegador role a lista sozinho até a caixa —
 * a rolagem some do controle do usuário assim que ele clica ou digita.
 */
function caretToEnd(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const end = el.value.length;
  el.setSelectionRange(end, end);
}

/**
 * Trava a altura em múltiplos exatos da pauta, senão o texto sai da linha.
 * Arredonda para cima, nunca para baixo — a caixa tem que sobrar altura, não
 * faltar, senão a última linha do texto fica cortada e viraria uma área
 * "morta" ali, fora do alcance de clique da própria caixa.
 */
function snapToGrid(el) {
  if (!el) return;
  el.style.height = 'auto';
  const lines = Math.max(1, Math.ceil(el.scrollHeight / LINE_HEIGHT));
  el.style.height = `${lines * LINE_HEIGHT}px`;
}

const MIRROR_PROPS = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
  'textIndent', 'textTransform', 'wordSpacing', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth',
  'borderBottomWidth', 'borderLeftWidth', 'boxSizing',
];

/**
 * Uma <textarea> não expõe suas linhas ao DOM: não dá para perguntar "que
 * trecho do texto está nesta altura?". A saída é montar um clone invisível
 * com exatamente o mesmo layout, medir nele com um Range e jogar fora.
 */
function withMirror(el, fn) {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const mirror = document.createElement('div');
  MIRROR_PROPS.forEach((prop) => { mirror.style[prop] = cs[prop]; });
  Object.assign(mirror.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  mirror.textContent = el.value;
  document.body.appendChild(mirror);
  try {
    const node = mirror.firstChild;
    if (!node) return null;
    return fn(node, rect);
  } finally {
    mirror.remove();
  }
}

/** Topo da linha onde o cursor está agora, em coordenadas de tela. */
function caretTop(el) {
  const result = withMirror(el, (node) => {
    const range = document.createRange();
    const offset = Math.min(el.selectionStart, el.value.length);
    range.setStart(node, offset);
    range.setEnd(node, offset);
    return range.getBoundingClientRect().top;
  });
  return result ?? el.getBoundingClientRect().top;
}

/**
 * Uma seta pra cima/baixo na primeira/última linha visual de um parágrafo
 * de várias linhas não deve pular pro parágrafo vizinho — só quando não há
 * mais nenhuma linha pra cima/baixo DENTRO da própria caixa.
 *
 * O texto nunca fica colado na borda da caixa (a fonte "senta" um pouco
 * abaixo do topo de cada linha de 33px, por causa do line-height) — por
 * isso não dá pra comparar direto com o topo/fundo do retângulo. O jeito
 * certo é achar em qual das linhas de 33px o cursor caiu, arredondando.
 */
function lineIndexOf(el) {
  const top = caretTop(el);
  const boxTop = el.getBoundingClientRect().top;
  return Math.round((top - boxTop) / LINE_HEIGHT);
}
function isOnFirstLine(el) {
  return lineIndexOf(el) <= 0;
}
function isOnLastLine(el) {
  const rect = el.getBoundingClientRect();
  const totalLines = Math.round(rect.height / LINE_HEIGHT);
  return lineIndexOf(el) >= totalLines - 1;
}

export function WriteScreen({
  entry,
  now,
  setTitle,
  setEntryTitle,
  setParagraphText,
  resetParagraphs,
  mergeParagraphBack,
  splitParagraph,
  removeParagraph,
  undo,
  redo,
  canUndo,
  canRedo,
  onOpenHistory,
  onNewEntry,
  onStartTyping,
}) {
  const textareaRefs = useRef([]);
  const wrapperRefs = useRef([]);
  const listRef = useRef(null);
  const prevCount = useRef(entry?.paragraphs.length ?? 0);
  const prevEntryId = useRef(entry?.id);
  const openedOnce = useRef(false);
  const pendingCaretRef = useRef(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const warnTimer = useRef(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);

  // "Selecionar tudo" virtual: cada parágrafo é uma <textarea> separada, então
  // o Ctrl+A nativo só pega a caixa focada — e só ela mostraria o destaque
  // azul nativo. `allSelected` (em vez de só uma ref) existe pra forçar um
  // re-render e pintar TODAS as caixas com uma classe CSS de "selecionado",
  // já que o navegador não desenha seleção em caixas sem foco.
  const allSelectedRef = useRef(false);
  const [allSelected, setAllSelected] = useState(false);
  const outsideClickRef = useRef(null);

  const clearMultiSelect = () => {
    if (!allSelectedRef.current) return;
    allSelectedRef.current = false;
    setAllSelected(false);
    textareaRefs.current.forEach((el) => el && el.setSelectionRange(0, 0));
    if (outsideClickRef.current) {
      window.removeEventListener('click', outsideClickRef.current);
      outsideClickRef.current = null;
    }
  };

  const selectAllTextareas = () => {
    textareaRefs.current.forEach((el) => el && el.setSelectionRange(0, el.value.length));
    allSelectedRef.current = true;
    setAllSelected(true);
    outsideClickRef.current = () => clearMultiSelect();
    window.addEventListener('click', outsideClickRef.current);
  };

  useEffect(() => () => clearTimeout(warnTimer.current), []);
  useEffect(() => () => {
    if (outsideClickRef.current) window.removeEventListener('click', outsideClickRef.current);
  }, []);

  /**
   * Reajustar a altura das caixas faz o navegador rolar sozinho até o cursor.
   * `.write-lines` tem `overflow:auto`, mas a cadeia acima dela só usa
   * `min-height` (nunca `height`), então na prática ela nunca fica curta o
   * bastante para rolar por conta própria — quem rola de verdade é a janela.
   * Guarda as duas posições, deixa o ajuste de altura acontecer e devolve
   * tudo a como estava; só rola de propósito se o cursor realmente ficou
   * fora da área visível da janela.
   */
  const resizeKeepingScroll = useCallback((boxes) => {
    const list = listRef.current;
    const prevListScroll = list ? list.scrollTop : 0;
    const prevWindowScroll = window.scrollY;

    boxes.forEach(snapToGrid);

    if (list) list.scrollTop = prevListScroll;
    window.scrollTo(window.scrollX, prevWindowScroll);

    const focused = document.activeElement;
    if (!boxes.includes(focused)) return;

    // Mede a linha do CURSOR, não a caixa do parágrafo inteiro — um
    // parágrafo pode ter várias linhas, e a maioria delas pode estar fora
    // da tela sem que a linha do cursor esteja. Medir a caixa toda rolava
    // a cada tecla, sempre até encostar o cursor na borda da tela.
    const top = caretTop(focused);
    const bottom = top + LINE_HEIGHT;
    if (top >= 0 && bottom <= window.innerHeight) return;

    if (bottom > window.innerHeight) window.scrollBy(0, bottom - window.innerHeight);
    else if (top < 0) window.scrollBy(0, top);
  }, []);

  // Só recalcula a altura quando o texto de fato muda — rodar isso em todo
  // re-render (ex.: o tique de 30s que reavalia o bloqueio, ou o painel
  // lateral fechando ao digitar) encolhe e cresce as caixas de novo, o que
  // faz o navegador ajustar a rolagem sozinho (efeito de "pular" indesejado).
  useLayoutEffect(() => {
    resizeKeepingScroll(textareaRefs.current.filter(Boolean));
  }, [entry?.paragraphs, resizeKeepingScroll]);

  useEffect(() => {
    if (!entry) return;
    const sameEntry = prevEntryId.current === entry.id;

    if (!sameEntry || !openedOnce.current) {
      // Abrir uma anotação já deixa o cursor pronto na primeira linha.
      openedOnce.current = true;
      if (isEditable(entry)) caretToEnd(textareaRefs.current[0]);
    } else if (entry.paragraphs.length !== prevCount.current) {
      if (pendingCaretRef.current) {
        // Parágrafo fundido pelo Backspace: o cursor vai pro ponto exato da
        // junção, não pro fim do último parágrafo (que é o caso comum de
        // quando a contagem muda por causa de um Enter).
        const { index, offset } = pendingCaretRef.current;
        pendingCaretRef.current = null;
        const el = textareaRefs.current[index];
        if (el) {
          el.focus({ preventScroll: true });
          el.setSelectionRange(offset, offset);
        }
      } else {
        caretToEnd(textareaRefs.current[entry.paragraphs.length - 1]);
      }
    }

    prevCount.current = entry.paragraphs.length;
    prevEntryId.current = entry.id;
  }, [entry]);

  if (!entry) return <div className="screen write-screen" />;

  const editable = isEditable(entry, now);

  /**
   * A <textarea> cobre a linha inteira, do começo ao fim — um clique nela
   * é tratado pelo próprio navegador, nativamente, sem nenhuma lógica nossa
   * no meio. Isto só entra em ação quando o clique cai FORA de qualquer
   * caixa (nas linhas vazias da pauta acima da primeira ou abaixo da
   * última, que são só fundo decorativo): aí foca o parágrafo mais perto,
   * como um bloco de notas.
   */
  const focusNearestLine = (e) => {
    if (!editable) return;
    if (e.target.closest('textarea, input, button, a, svg')) return;

    const wrappers = wrapperRefs.current.filter(Boolean);
    if (wrappers.length === 0) return;

    const y = e.clientY;
    const firstTop = wrappers[0].getBoundingClientRect().top;
    const lastBottom = wrappers[wrappers.length - 1].getBoundingClientRect().bottom;
    if (y < firstTop || y > lastBottom) return;

    let index = 0;
    for (let i = 0; i < wrappers.length; i++) {
      const r = wrappers[i].getBoundingClientRect();
      index = i;
      if (y <= r.bottom) break;
    }

    // O foco precisa ser síncrono no clique, senão o teclado do celular não sobe.
    caretToEnd(textareaRefs.current[index]);
  };

  const handleTextareaKeyDown = (idx) => (e) => {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }

    if (mod && e.key.toLowerCase() === 'a') {
      if (entry.paragraphs.length <= 1) return; // o Ctrl+A nativo já resolve
      e.preventDefault();
      selectAllTextareas();
      return;
    }

    if (mod && e.key.toLowerCase() === 'c' && allSelectedRef.current) {
      e.preventDefault();
      const fullText = entry.paragraphs.map((p) => p.text).join('\n\n');
      navigator.clipboard?.writeText(fullText).catch(() => {});
      return;
    }

    if (allSelectedRef.current) {
      const isPrintable = e.key.length === 1 && !mod && !e.altKey;
      const isErase = e.key === 'Backspace' || e.key === 'Delete';
      if (isPrintable || isErase) {
        e.preventDefault();
        clearMultiSelect();
        resetParagraphs(isPrintable ? e.key : '');
        return;
      }
      clearMultiSelect();
    }

    // Backspace bem no início de um parágrafo (sem nada selecionado) funde
    // o texto dele com o parágrafo anterior — senão apagar para trás "trava"
    // na borda de cada parágrafo, porque cada um é uma <textarea> isolada.
    // Vale mesmo pra parágrafos recém-criados pelo Enter: são só texto do
    // mesmo rascunho, então apagar tem que atravessar a quebra normalmente.
    //
    // `flushSync` força o React a aplicar a mudança e re-renderizar ANTES
    // de sair da função, e o foco é reposicionado logo em seguida, ainda
    // dentro do mesmo evento — sem isso, seguravam a tecla, e um segundo
    // Backspace podia disparar antes do React atualizar os refs, agindo
    // num índice que não existia mais e travando o apagar no meio do texto.
    if (e.key === 'Backspace' && !mod && idx > 0) {
      const el = e.target;
      if (el.selectionStart === 0 && el.selectionEnd === 0) {
        e.preventDefault();
        const prevEl = textareaRefs.current[idx - 1];
        const offset = prevEl ? prevEl.value.length : 0;
        pendingCaretRef.current = { index: idx - 1, offset };
        flushSync(() => mergeParagraphBack(idx));
        const target = textareaRefs.current[idx - 1];
        if (target) {
          target.focus({ preventScroll: true });
          target.setSelectionRange(offset, offset);
        }
        return;
      }
    }

    // Delete no fim de um parágrafo é o espelho do Backspace no início: funde
    // o próximo parágrafo aqui dentro, apagando "pra frente" através da quebra.
    if (e.key === 'Delete' && !mod && idx < entry.paragraphs.length - 1) {
      const el = e.target;
      if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
        e.preventDefault();
        const offset = el.value.length;
        pendingCaretRef.current = { index: idx, offset };
        flushSync(() => mergeParagraphBack(idx + 1));
        const target = textareaRefs.current[idx];
        if (target) {
          target.focus({ preventScroll: true });
          target.setSelectionRange(offset, offset);
        }
        return;
      }
    }

    // Cada parágrafo é uma <textarea> isolada — o navegador não sabe que
    // existe uma "próxima caixa" ao apertar as setas. Sem isso, ↑/↓/←/→
    // ficavam presos dentro do parágrafo atual ao chegar numa borda.
    if (!mod && !e.shiftKey) {
      const el = e.target;

      if (e.key === 'ArrowLeft' && idx > 0 && el.selectionStart === 0 && el.selectionEnd === 0) {
        e.preventDefault();
        const target = textareaRefs.current[idx - 1];
        if (target) {
          const end = target.value.length;
          target.focus({ preventScroll: true });
          target.setSelectionRange(end, end);
        }
        return;
      }

      if (
        e.key === 'ArrowRight' &&
        idx < entry.paragraphs.length - 1 &&
        el.selectionStart === el.value.length &&
        el.selectionEnd === el.value.length
      ) {
        e.preventDefault();
        const target = textareaRefs.current[idx + 1];
        if (target) {
          target.focus({ preventScroll: true });
          target.setSelectionRange(0, 0);
        }
        return;
      }

      if (e.key === 'ArrowUp' && idx > 0 && isOnFirstLine(el)) {
        e.preventDefault();
        const target = textareaRefs.current[idx - 1];
        if (target) {
          const end = target.value.length;
          target.focus({ preventScroll: true });
          target.setSelectionRange(end, end);
        }
        return;
      }

      if (e.key === 'ArrowDown' && idx < entry.paragraphs.length - 1 && isOnLastLine(el)) {
        e.preventDefault();
        const target = textareaRefs.current[idx + 1];
        if (target) {
          target.focus({ preventScroll: true });
          target.setSelectionRange(0, 0);
        }
        return;
      }
    }

    // Enter sempre abre um parágrafo novo, no ponto exato do cursor — não só
    // no fim do último. O que estiver selecionado é substituído pela quebra.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      pendingCaretRef.current = { index: idx + 1, offset: 0 };
      flushSync(() => splitParagraph(idx, start, end));
      const target = textareaRefs.current[idx + 1];
      if (target) {
        target.focus({ preventScroll: true });
        target.setSelectionRange(0, 0);
      }
    }
  };

  const showWarning = () => {
    clearTimeout(warnTimer.current);
    setWarningVisible(true);
    warnTimer.current = setTimeout(() => setWarningVisible(false), WARNING_VISIBLE_MS);
  };

  const timeDivider = (p, i) =>
    i > 0 && p.time ? (
      <div className="dashed-divider">
        <span className="dashed-divider__line" />
        <span className="dashed-divider__time">{fmtTime(p.time)}</span>
        {editable && (
          <button
            type="button"
            className="dashed-divider__delete"
            aria-label="Apagar esta divisória"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteIdx(i);
            }}
          >
            <CloseIcon size={11} />
          </button>
        )}
        <span className="dashed-divider__line" />
      </div>
    ) : null;

  return (
    <div
      className={`screen write-screen${editable ? '' : ' screen--aged'}`}
      onClick={focusNearestLine}
    >
      <div className="write-topbar">
        {editable && (
          <div className="undo-redo">
            <button
              type="button"
              className="icon-button icon-button--round"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Desfazer"
            >
              <UndoIcon size={16} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--round"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Refazer"
            >
              <RedoIcon size={16} />
            </button>
          </div>
        )}
        {!editable && <span className="badge">Bloqueada</span>}
        <span className="short-date">{fmtShort(entry.createdAt)}</span>
      </div>

      {editable ? (
        <>
          <input
            className="title-input"
            placeholder="Título"
            value={entry.title}
            onChange={(e) => {
              setTitle(e.target.value);
              onStartTyping?.();
            }}
            onKeyDown={(e) => {
              const mod = e.ctrlKey || e.metaKey;
              if (mod && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
                return;
              }
              if (e.key !== 'Enter') return;
              e.preventDefault();
              caretToEnd(textareaRefs.current[0]);
            }}
          />
          <div className="notebook-lines write-lines" ref={listRef}>
            {entry.paragraphs.map((p, i) => (
              <div key={i} ref={(el) => (wrapperRefs.current[i] = el)}>
                {timeDivider(p, i)}
                <textarea
                  ref={(el) => (textareaRefs.current[i] = el)}
                  className={`paragraph-textarea${allSelected ? ' paragraph-textarea--selected' : ''}`}
                  value={p.text}
                  onChange={(e) => {
                    setParagraphText(i, e.target.value);
                    resizeKeepingScroll([e.target]);
                    onStartTyping?.();
                  }}
                  onKeyDown={handleTextareaKeyDown(i)}
                  rows={1}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="read-head">
            <div className="detail-date">{fmtFull(entry.createdAt)}</div>
            <div className="detail-time">{fmtTime(entry.createdAt)}</div>
            <input
              className="detail-title-input"
              placeholder="Título"
              value={entry.title}
              onChange={(e) => setEntryTitle(entry.id, e.target.value)}
            />
          </div>
          <div className="notebook-lines write-lines">
            {entry.paragraphs.map((p, i) => (
              <div key={i}>
                {timeDivider(p, i)}
                <div className="paragraph-readonly" onClick={showWarning}>
                  {p.text}
                </div>
              </div>
            ))}
            <button type="button" className="ghost-button" onClick={onNewEntry}>
              <NewNoteIcon size={16} />
              <span>Escrever uma nova anotação</span>
            </button>
          </div>
        </>
      )}

      <button type="button" className="fab" onClick={onOpenHistory} aria-label="Histórico">
        H
      </button>

      {warningVisible && <div className="toast">Este texto não é mais editável</div>}

      {confirmDeleteIdx !== null && (
        <div className="confirm-overlay" onClick={() => setConfirmDeleteIdx(null)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-card__text">
              Apagar esta divisória e o texto escrito depois dela?
            </p>
            <div className="confirm-card__actions">
              <button
                type="button"
                className="confirm-card__cancel"
                onClick={() => setConfirmDeleteIdx(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-card__danger"
                onClick={() => {
                  removeParagraph(confirmDeleteIdx);
                  setConfirmDeleteIdx(null);
                }}
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
