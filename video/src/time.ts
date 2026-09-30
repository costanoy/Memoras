import { Easing, interpolate } from 'remotion';

export const FPS = 30;
export const f = (sec: number) => Math.round(sec * FPS);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const smooth = Easing.bezier(0.2, 0.8, 0.2, 1);

// Valor de 0 a 1 entre dois instantes (em segundos).
export const prog = (frame: number, from: number, to: number, easing = smooth) =>
  interpolate(frame, [f(from), f(to)], [0, 1], { ...clamp, easing });

export const between = (frame: number, from: number, to: number) => frame >= f(from) && frame < f(to);

// Os momentos da música (medidos na faixa): entra a batida aos 6 s, a parte forte aos 16 s,
// respira entre 22 e 24 s, ápice de 24 a 28 s e final aos 28 s.
export const T = {
  phoneIn: 4, tapPlus: 4.4, editorOpen: 4.9, typeFrom: 5, typeTo: 7.8,
  history: 8, calendar: 8.6, dayTap: 9.3, search: 9.9, queryFrom: 10.1, queryTo: 10.8, result: 10.9,
  times: 12, seg2: 13, seg3: 14.5,
  pin: 16, keys: [16.3, 16.6, 16.9, 17.2], unlock: 17.5, afterUnlock: 18.3,
  encrypt: 20, scrambleFrom: 20.3, scrambleTo: 21.6, flyTo: 22.6, syncing: 22.4, synced: 23.2,
  colors: 24, outro: 28,
};
