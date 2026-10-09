import { Easing, interpolate } from 'remotion';

export const FPS = 30;
export const f = (sec: number) => Math.round(sec * FPS);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const smooth = Easing.bezier(0.2, 0.8, 0.2, 1);

// Valor de 0 a 1 entre dois instantes (em segundos).
export const prog = (frame: number, from: number, to: number, easing = smooth) =>
  interpolate(frame, [f(from), f(to)], [0, 1], { ...clamp, easing });

export const between = (frame: number, from: number, to: number) => frame >= f(from) && frame < f(to);

// A música tem 30 s (medidos na faixa): entra a batida aos 6 s, a frase de batida vai de 8 a 16 s
// (com uma virada no fim), a parte forte começa aos 16 s, respira entre 22 e 24 s, ápice de 24 a 28 s
// e final aos 28 s. Para caber Cadernos e Agenda, a frase de 8 a 16 s toca duas vezes (Memoras.tsx):
// até 16 s o vídeo segue a música; dali em diante, a música está 8 s atrás.
export const DURATION = 38;
export const MUSIC_REPEAT = { at: 16, from: 8 };
export const T = {
  phoneIn: 4, tapPlus: 4.4, editorOpen: 4.9, typeFrom: 5, typeTo: 7.8,
  history: 8, calendar: 8.6, dayTap: 9.3, search: 9.9, queryFrom: 10.1, queryTo: 10.8, result: 10.9,
  times: 12, seg2: 13, seg3: 14.5,
  docs: 16, docsTap: 16.15, docOpen: 17, docBlocks: [17.2, 17.5, 17.85, 18.25, 18.6, 18.95, 19.3],
  agenda: 20, agendaTap: 20.15, checks: [20.8, 21.3, 21.8], move: 22.4, toast: 22.75,
  pin: 24, keys: [24.3, 24.6, 24.9, 25.2], unlock: 25.5, afterUnlock: 26.3,
  encrypt: 28, scrambleFrom: 28.3, scrambleTo: 29.6, flyTo: 30.6, syncing: 30.4, synced: 31.2,
  colors: 32, outro: 36,
};
