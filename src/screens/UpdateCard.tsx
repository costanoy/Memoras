import { useState } from 'react';
import { installUpdate, useUpdate, type Upd } from '../updates';

// Aviso de versão nova, no alto da tela: aparece ao abrir o app sempre que houver uma.
// "Depois" esconde até a próxima vez que o app abrir (ou até sair outra versão).
let hiddenFor = '';
const TEXT: Partial<Record<Upd['state'], (u: Upd) => string>> = {
  available: () => 'Toque em Atualizar para baixar e instalar. Suas anotações continuam no aparelho.',
  downloading: u => 'Baixando… ' + u.percent + '%',
  ready: () => 'Pronta para instalar. O Memoras fecha, atualiza e abre de novo em alguns segundos.',
  permission: () => 'Na tela que abriu, permita que o Memoras instale atualizações. Depois toque em Atualizar de novo.',
  installing: () => 'Confirme na tela do Android para terminar de atualizar.',
  error: () => 'Não deu para baixar agora. Confira a internet e tente de novo.',
};

export function UpdateCard() {
  const u = useUpdate(), [, hide] = useState(0);
  if (!u?.on || !u.version || hiddenFor === u.version) return null;
  // Erro só aparece aqui se a pessoa pediu para atualizar; o resto fica nos Ajustes.
  const text = u.state === 'error' && !u.asked ? undefined : TEXT[u.state];
  if (!text) return null;
  const busy = u.state === 'downloading';
  const action = u.state === 'ready' ? 'Atualizar agora' : u.state === 'error' ? 'Tentar de novo' : u.state === 'installing' ? 'Abrir de novo' : 'Atualizar';
  const later = () => { hiddenFor = u.version; hide(x => x + 1); };
  return (
    <div className="updcard" role="status">
      <div className="col" style={{ gap: 3, minWidth: 0 }}>
        <strong>Versão {u.version} disponível</strong>
        <span>{text(u)}</span>
        {busy && <span className="updbar"><i style={{ width: u.percent + '%' }} /></span>}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {/* No Windows a versão baixa sozinha; o botão só aparece quando ela está pronta. */}
        {!busy && !(u.kind === 'win' && u.state !== 'ready') && <button className="gel" onClick={() => void installUpdate()}>{action}</button>}
        <button className="soft press" onClick={later}>Depois</button>
      </div>
    </div>
  );
}
