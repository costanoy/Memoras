// Ponte do app de Windows (electron/preload.cjs). No navegador e no Android não existe.
// Sem imports: store.ts, themes.ts e TitleBar.tsx usam este módulo sem criar um ciclo.
export type WinMode = 'full' | 'mini';
export type ModeResult = { mode: WinMode; first: boolean; top: boolean } | null;
export type WinApi = {
  minimize(): void; toggleMaximize(): void; close(): void; onMaximized(cb: (v: boolean) => void): void;
  mode?: WinMode;
  setMode?(mode: WinMode, anchor?: { dx: number; dy: number } | null): Promise<ModeResult>;
  onMode?(cb: (m: { mode: WinMode; top: boolean }) => void): void;
  setOnTop?(on: boolean): Promise<boolean>;
  setBg?(color: string): void;
};
export const winApi = typeof window !== 'undefined' ? (window as unknown as { memorasWin?: WinApi }).memorasWin : undefined;
// O app abriu já no Mini-Memoras (foi fechado assim).
export const startsMini = winApi?.mode === 'mini';
