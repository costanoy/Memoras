import { Capacitor, registerPlugin } from '@capacitor/core';

export type Sound = 'pin-key' | 'pin-error' | 'unlock' | 'new-note' | 'archive' | 'trash';

// Os arquivos vieram com volumes bem diferentes (medidos: de -16 a -44 dB RMS).
// Estes ganhos deixam todos perto do mesmo nível, baixo, como pede um diário.
// `skip` corta o silêncio do começo para o som sair junto com o toque.
const MIX: Record<Sound, { gain: number; skip?: number }> = {
  'pin-key': { gain: 0.7, skip: 0.05 },
  'pin-error': { gain: 0.25 },
  'unlock': { gain: 1.2 },
  'new-note': { gain: 0.22 },
  'archive': { gain: 4 },
  'trash': { gain: 1.3 },
};
const MASTER = 0.6;

let ctx: AudioContext | null = null;
const buffers = new Map<Sound, Promise<AudioBuffer | null>>();

function load(name: Sound) {
  let p = buffers.get(name);
  if (!p) {
    ctx ??= new AudioContext();
    const c = ctx;
    p = fetch('/sounds/' + name + '.mp3').then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).catch(() => null);
    buffers.set(name, p);
  }
  return p;
}
export const preloadSounds = () => (Object.keys(MIX) as Sound[]).forEach(load);

// No Android, o celular no silencioso ou no vibrar deixa o app mudo.
const RingerMode = registerPlugin<{ get(): Promise<{ silent: boolean }> }>('RingerMode');
let silent = false;
const refreshRinger = () => { if (Capacitor.isNativePlatform()) RingerMode.get().then(r => { silent = r.silent; }, () => {}); };
refreshRinger();
document.addEventListener('visibilitychange', refreshRinger);

export async function playSound(name: Sound) {
  refreshRinger();
  if (silent) return;
  const buf = await load(name);
  if (!buf || !ctx) return;
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  const src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = buf;
  gain.gain.value = MIX[name].gain * MASTER;
  src.connect(gain).connect(ctx.destination);
  src.start(0, MIX[name].skip ?? 0);
}
