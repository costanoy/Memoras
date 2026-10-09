import { useEffect, useState } from 'react';
import { installUpdate, useUpdate } from './updates';

// Ponte do app de Windows (electron/preload.cjs). Fora dele, não existe.
type WinApi = { minimize(): void; toggleMaximize(): void; close(): void; onMaximized(cb: (v: boolean) => void): void };
const api = (window as unknown as { memorasWin?: WinApi }).memorasWin;
export const hasTitleBar = !!api;
if (api) document.documentElement.classList.add('electron');

// Barra de título do app de Windows: vidro, com o título brilhando e botões em gel,
// no lugar da moldura padrão. Arrastar move a janela; clique duplo maximiza.
export function TitleBar() {
  const [max, setMax] = useState(false);
  const u = useUpdate();
  useEffect(() => { api?.onMaximized(setMax); }, []);
  if (!api) return null;
  return (
    <div className="titlebar">
      <img src="/icon-512.png" alt="" width={20} height={20} />
      <span className="tbtitle">Memoras</span>
      {/* Versão nova baixada: um clique fecha, instala e abre o app de novo. */}
      {u?.state === 'ready' && <button className="tbupd" title={'Reiniciar e instalar a versão ' + u.version} onClick={installUpdate}>Atualizar para {u.version}</button>}
      <div className="tbtns">
        <button className="tbtn" aria-label="Minimizar" onClick={() => api.minimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><line x1="2" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
        <button className="tbtn" aria-label={max ? 'Restaurar' : 'Maximizar'} onClick={() => api.toggleMaximize()}>
          {max
            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="1.75" y="3.75" width="6.5" height="6.5" rx="1.2" /><path d="M4 3.5V2.6c0-.5.4-.85.85-.85h4.55c.45 0 .85.4.85.85v4.55c0 .45-.4.85-.85.85H8.5" /></svg>
            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1.5" /></svg>}
        </button>
        <button className="tbtn close" aria-label="Fechar" onClick={() => api.close()}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}
