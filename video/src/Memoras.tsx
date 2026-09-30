import React, { type CSSProperties } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import '@fontsource-variable/source-sans-3';
import '@fontsource/source-code-pro/600.css';
import '../../src/styles.css';
import { THEMES, type ThemeKey } from '../../src/themes';
import { Calendar, Editor, History, Lock, NOTES, Pin, Search, StatusBar, TabBar } from './Screens';
import { T, between, f, prog } from './time';

const TYPED = 'Hoje acordei antes do despertador e fui caminhar. O céu estava limpo e deu para ouvir os pássaros.';
const SEG1 = 'Saí cedo, antes do café. O parque estava quase vazio e o lago tinha uma névoa fina.';
const SEG2 = 'Voltando ao assunto: quero repetir a caminhada três vezes por semana.';
const SEG3 = 'Fui de novo no fim da tarde. Já virou hábito.';
const CYCLE: ThemeKey[] = ['azul', 'verde', 'amarelo', 'laranja', 'vermelho', 'rosa', 'roxo', 'porDoSol', 'noite'];

const themeVars = (k: ThemeKey) => ({ ...THEMES[k] }) as CSSProperties;

function themeAt(frame: number): ThemeKey {
  if (frame < f(T.colors) || frame >= f(T.outro)) return 'turquesa';
  return CYCLE[Math.min(CYCLE.length - 1, Math.floor((frame - f(T.colors)) / f(0.5)))];
}

// Bolhas de vidro subindo devagar, o tempo todo.
const BUBBLES = [
  { x: 80, size: 170, speed: 1.1, off: 300 }, { x: 860, size: 240, speed: 0.8, off: 1300 }, { x: 640, size: 90, speed: 1.6, off: 700 },
  { x: 230, size: 110, speed: 1.3, off: 1700 }, { x: 960, size: 70, speed: 1.9, off: 200 }, { x: 420, size: 60, speed: 2.2, off: 1100 },
];
function Bubbles() {
  const frame = useCurrentFrame();
  return <>
    <div className="deco haze" />
    {BUBBLES.map((b, i) => {
      const span = 1920 + b.size * 2, y = 1920 + b.size - ((frame * b.speed * 2 + b.off) % span);
      return <div key={i} className="deco b1" style={{ left: b.x + Math.sin((frame + i * 40) / 45) * 14, top: y, width: b.size, height: b.size }} />;
    })}
  </>;
}

// Frase grande no topo de cada cena, num cartão de vidro para ler em qualquer cor.
const LINES: [number, number, string][] = [
  [4, 8, 'Escreva rápido.'], [8, 12, 'Releia depois.'], [12, 16, 'Cada momento no seu horário.'],
  [16, 20, 'Tudo privado.'], [20, 24, 'Criptografado antes de sair do aparelho.'], [24, 28, 'Do seu jeito.'],
];
function Headline() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const cur = LINES.find(([a, b]) => between(frame, a, b));
  if (!cur) return null;
  const [a, b, text] = cur;
  const enter = spring({ frame: frame - f(a), fps, config: { damping: 16, stiffness: 140 } });
  const leave = prog(frame, b - 0.2, b);
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 120, display: 'flex', justifyContent: 'center', opacity: enter * (1 - leave), transform: `translateY(${(1 - enter) * 40 - leave * 20}px) scale(${0.96 + enter * 0.04})` }}>
      <div style={{ padding: '26px 44px', borderRadius: 40, background: 'var(--glass2)', backdropFilter: 'var(--blur)', border: '2px solid rgba(255,255,255,.85)', boxShadow: 'inset 0 2px 0 #fff, 0 40px 80px -36px rgba(0,50,100,.55)', fontSize: 70, fontWeight: 700, lineHeight: 1.1, textAlign: 'center', color: 'var(--ink)', textWrap: 'balance' } as CSSProperties}>{text}</div>
    </div>
  );
}

function Intro() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const icon = spring({ frame: frame - f(0.3), fps, config: { damping: 12, stiffness: 90 } });
  const word = spring({ frame: frame - f(1), fps, config: { damping: 18 } });
  const tag = spring({ frame: frame - f(1.8), fps, config: { damping: 18 } });
  const leave = prog(frame, 3.6, 4);
  const sheen = prog(frame, 1.2, 1.9);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 40, opacity: 1 - leave, transform: `scale(${1 - leave * 0.15})` }}>
      <div style={{ position: 'relative', width: 420, height: 420, transform: `scale(${icon}) rotate(${(1 - icon) * -12}deg)`, filter: 'drop-shadow(0 40px 60px rgba(0,50,100,.35))' }}>
        <Img src={staticFile('icon.png')} style={{ width: 420, height: 420 }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 90, overflow: 'hidden', WebkitMaskImage: `url(${staticFile('icon.png')})`, WebkitMaskSize: 'cover' }}>
          <div style={{ position: 'absolute', top: -60, bottom: -60, width: 120, left: -200 + sheen * 800, background: 'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.85),rgba(255,255,255,0))', transform: 'skewX(-20deg)' }} />
        </div>
      </div>
      <div style={{ fontSize: 140, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)', opacity: word, transform: `translateY(${(1 - word) * 40}px)` }}>Memoras</div>
      <div style={{ fontSize: 50, fontWeight: 600, color: 'var(--ink3)', opacity: tag, transform: `translateY(${(1 - tag) * 30}px)` }}>Seu diário pessoal. Só seu.</div>
    </AbsoluteFill>
  );
}

// O que aparece dentro do celular em cada momento.
function PhoneScreen() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = frame / fps;
  const caret = frame % 30 < 16;
  const spin = frame * 12;

  // 4 a 8 s: toque no + e escrita
  if (t < T.editorOpen) {
    const press = prog(frame, T.tapPlus, T.tapPlus + 0.26);
    const plus: CSSProperties = { transform: `scale(${press < 0.35 ? 1 - press * 0.4 : 0.86 + (press - 0.35) * 0.34}) rotate(${press * 90}deg)` };
    const grow = prog(frame, T.tapPlus + 0.05, T.editorOpen + 0.05, (x: number) => x * x);
    return <>
      <History items={NOTES} sync="synced" />
      <TabBar on="history" plus={plus} />
      {grow > 0 && <div style={{ position: 'absolute', left: 195 - 26, top: 844 - 14 - 36 - 26, width: 52, height: 52, borderRadius: '50%', background: 'var(--gel)', transform: `scale(${1 + grow * 38})`, zIndex: 30 }} />}
    </>;
  }
  if (t < T.history) {
    const n = Math.round(interpolate(frame, [f(T.typeFrom), f(T.typeTo)], [0, TYPED.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
    const reveal = 1 - prog(frame, T.editorOpen, T.editorOpen + 0.3);
    return <>
      <Editor title="" segs={[{ time: n ? '07:48' : '', text: TYPED.slice(0, n), show: 1, caret: true }]} caret={caret} />
      {reveal > 0 && <div style={{ position: 'absolute', inset: 0, background: 'var(--gel)', opacity: reveal, zIndex: 30 }} />}
    </>;
  }
  // 8 a 10 s: histórico com a anotação nova e o calendário
  if (t < T.search) {
    const fresh = { group: 'Hoje', title: 'Hoje acordei antes do despertador…', time: '07:48', prev: TYPED };
    const cal = prog(frame, T.calendar, T.calendar + 0.4);
    const picked = frame >= f(T.dayTap);
    const items = picked ? NOTES.filter(n => n.group.startsWith('Domingo')) : [fresh, ...NOTES];
    return <>
      <History items={items} sync="synced"
        calendar={cal > 0 && <div style={{ opacity: cal, transform: `translateY(${(1 - cal) * 40}px)` }}><Calendar selected={picked ? 27 : null} tap={prog(frame, T.dayTap - 0.1, T.dayTap + 0.35, (v: number) => v)} /></div>}>
        {picked && <div className="row" style={{ justifyContent: 'space-between', padding: '0 6px', fontSize: 14, color: 'var(--ink3)' }}><span>Mostrando <strong>27 de setembro</strong></span><span style={{ color: 'var(--acc-d)', fontWeight: 700 }}>Ver todas</span></div>}
      </History>
      <TabBar on="history" />
    </>;
  }
  // 10 a 12 s: busca sem acento acha "pássaros"
  if (t < T.times) {
    const q = 'passaros', n = Math.round(interpolate(frame, [f(T.queryFrom), f(T.queryTo)], [0, q.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
    const r = spring({ frame: frame - f(T.result), fps, config: { damping: 14 } });
    return <><Search query={q.slice(0, n)} caret={caret} result={r} /><TabBar on="search" /></>;
  }
  // 12 a 16 s: trechos com horários
  if (t < T.pin) {
    const s2 = spring({ frame: frame - f(T.seg2), fps, config: { damping: 14 } });
    const s3 = spring({ frame: frame - f(T.seg3), fps, config: { damping: 14 } });
    return <Editor title="Caminhada no parque" caret={caret} segs={[
      { time: '07:12', text: SEG1, show: 1 },
      { time: '10:40', text: SEG2, show: s2 },
      { time: '21:05', text: SEG3, show: s3, caret: s3 > 0.5 },
    ]} />;
  }
  // 16 a 20 s: PIN e desbloqueio
  if (t < T.encrypt) {
    const filled = T.keys.filter(k => t >= k).length;
    const hitKey = T.keys.findIndex(k => t >= k && t < k + 0.14);
    const keyIdx = [0, 3, 7, 10][hitKey] ?? -1; // 1, 4, 8, 0
    if (t < T.unlock) return <Pin filled={filled} hit={keyIdx} />;
    return <>
      <History items={NOTES} sync="synced" />
      <TabBar on="history" />
      {t < T.afterUnlock + 0.2 && <Lock t={t - T.unlock} />}
    </>;
  }
  // 20 a 24 s: o texto vira código e sobe para a nuvem
  if (t < T.syncing) {
    const sc = prog(frame, T.scrambleFrom, T.scrambleTo, (x: number) => x);
    const fly = prog(frame, T.scrambleTo, T.flyTo);
    const glyph = (s: string, seed: number) => s.split('').map((c, i) => {
      if (c === ' ') return ' ';
      const h = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453, r = h - Math.floor(h);
      return r < sc ? 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789+/='[Math.floor((r * 1e4 + frame) % 35)] : c;
    }).join('');
    return <Editor title={glyph('Caminhada no parque', 1)} sub="Criptografando…" caret={false}
      sheetStyle={{ fontFamily: sc > 0.5 ? "'Source Code Pro', monospace" : undefined, transform: `translateY(${-fly * 260}px) scale(${1 - fly * 0.25})`, opacity: 1 - fly, filter: `blur(${fly * 6}px)` }}
      segs={[{ time: '07:12', text: glyph(SEG1, 2), show: 1 }, { time: '10:40', text: glyph(SEG2, 3), show: 1 }, { time: '21:05', text: glyph(SEG3, 4), show: 1 }]} />;
  }
  if (t < T.colors) {
    const synced = t >= T.synced;
    return <>
      <History items={NOTES} sync={synced ? 'synced' : 'syncing'} spin={spin} />
      <TabBar on="history" />
    </>;
  }
  // 24 a 28 s: as cores trocando na batida
  return <><History items={NOTES} sync="synced" /><TabBar on="history" /></>;
}

function Phone() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const enter = spring({ frame: frame - f(T.phoneIn), fps, config: { damping: 15, stiffness: 110 } });
  const leave = prog(frame, T.outro, T.outro + 0.5);
  // pulso leve a cada batida enquanto as cores trocam
  const beat = between(frame, T.colors, T.outro) ? 1 + 0.018 * Math.max(0, 1 - ((frame - f(T.colors)) % f(0.5)) / 6) : 1;
  const hit16 = frame >= f(T.pin) ? 1 + 0.03 * Math.max(0, 1 - (frame - f(T.pin)) / 8) : 1;
  const S = 1.66;
  return (
    <div style={{ position: 'absolute', left: (1080 - 390) / 2, top: 400, width: 390, height: 844, transformOrigin: 'top center',
      transform: `translateY(${(1 - enter) * 1500 + leave * 900}px) scale(${S * beat * hit16})`, opacity: 1 - leave }}>
      <div style={{ position: 'absolute', inset: -10, borderRadius: 58, background: '#0d1c28', boxShadow: '0 60px 100px -40px rgba(0,30,60,.7), 0 0 0 1px rgba(255,255,255,.35)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 48, overflow: 'hidden', background: 'var(--bg)' }}>
        <div className="deco b1" style={{ left: -30, top: 120, width: 120, height: 120 }} />
        <div className="deco b4" style={{ left: 250, bottom: 90, width: 80, height: 80 }} />
        <PhoneScreen />
        <StatusBar />
        <div style={{ position: 'absolute', left: '50%', top: 10, width: 110, height: 30, marginLeft: -55, borderRadius: 20, background: '#0d1c28', zIndex: 61 }} />
      </div>
    </div>
  );
}

function Outro() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const at = (s: number) => spring({ frame: frame - f(s), fps, config: { damping: 14 } });
  const icon = at(T.outro + 0.1), name = at(T.outro + 0.3), plat = at(T.outro + 0.6), url = at(T.outro + 0.9);
  const up = (v: number): CSSProperties => ({ opacity: v, transform: `translateY(${(1 - v) * 40}px)` });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 34 }}>
      <Img src={staticFile('icon.png')} style={{ width: 340, height: 340, transform: `scale(${icon})`, filter: 'drop-shadow(0 40px 60px rgba(0,50,100,.35))' }} />
      <div style={{ fontSize: 130, fontWeight: 700, color: 'var(--ink)', ...up(name) }}>Memoras</div>
      <div style={{ fontSize: 50, fontWeight: 700, color: 'var(--ink2)', ...up(plat) }}>Windows e Android</div>
      <div style={{ marginTop: 10, padding: '20px 40px', borderRadius: 999, fontSize: 44, fontWeight: 700, color: 'var(--gel-fg)', background: 'var(--gel)', border: '2px solid var(--gel-bd)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.75), 0 20px 40px -16px var(--gel-sh)', textShadow: '0 2px 2px var(--gel-ts)', ...up(url) }}>memoras.cyberhat.com.br</div>
    </AbsoluteFill>
  );
}

// Efeitos por cima da música, bem mais baixos que ela.
const SFX: [number, string, number][] = [
  [3.7, 'video-whoosh', 0.35], [T.tapPlus, 'new-note', 0.3], [T.typeFrom, 'video-typing', 0.6],
  [7.85, 'video-whoosh', 0.3], [T.dayTap, 'pin-key', 0.5], [11.85, 'video-whoosh', 0.3],
  ...T.keys.map(k => [k, 'pin-key', 0.7] as [number, string, number]), [T.unlock, 'unlock', 0.9],
  [19.85, 'video-whoosh', 0.3], [T.scrambleFrom, 'video-encrypt', 0.35],
  ...Array.from({ length: 8 }, (_, i) => [T.colors + i * 0.5, 'video-color', 0.8] as [number, string, number]),
  [T.outro, 'video-logo', 0.6],
];

export function Memoras() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...themeVars(themeAt(frame)), background: 'var(--bg)', fontFamily: "'Source Sans 3 Variable', sans-serif", color: 'var(--ink)', overflow: 'hidden' }}>
      <Bubbles />
      <Audio src={staticFile('audio/musica.wav')} volume={0.85} />
      {SFX.map(([at, name, volume], i) => (
        <Sequence key={i} from={f(at)} durationInFrames={f(3.2)}><Audio src={staticFile(`audio/${name}.mp3`)} volume={volume} /></Sequence>
      ))}
      {frame < f(4) && <Intro />}
      {between(frame, T.phoneIn, T.outro + 0.6) && <Phone />}
      <Headline />
      {frame >= f(T.outro) && <Outro />}
    </AbsoluteFill>
  );
}
