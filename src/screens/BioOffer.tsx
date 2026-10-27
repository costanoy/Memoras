import { useEffect, useState } from 'react';
import { bioAvailable, bioPossible, bioVerify } from '../native';
import { set, setCfg, toast, useApp } from '../store';
import { useUpdate } from '../updates';
import { updShown } from './UpdateCard';

// Depois de digitar o PIN num celular com digital cadastrada, uma vez: oferece entrar com a digital
// da próxima vez. "Agora não" não pergunta mais neste aparelho (a opção continua nos Ajustes).
export function BioOffer() {
  const s = useApp(), u = useUpdate();
  const [ok, setOk] = useState(false);
  const want = s.bioOffer && bioPossible && s.cfg.pinOn && !s.cfg.bioOn && !s.cfg.bioAsked;
  useEffect(() => { if (want) void bioAvailable().then(setOk); }, [want]);
  if (!want || !ok || updShown(u)) return null;
  const no = () => { setCfg({ bioAsked: true }); set({ bioOffer: false }); };
  const yes = () => void bioVerify(true).then(v => {
    if (!v) return;
    setCfg({ bioOn: true, bioAsked: true });
    set({ bioOffer: false });
    toast('Digital ativada neste aparelho');
  });
  return (
    <div className="updcard" role="status">
      <div className="col" style={{ gap: 3, minWidth: 0 }}>
        <strong>Entrar com a digital?</strong>
        <span>Da próxima vez, abra o Memoras com a digital, sem digitar o PIN.</span>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="gel" onClick={yes}>Usar a digital</button>
        <button className="soft press" onClick={no}>Agora não</button>
      </div>
    </div>
  );
}
