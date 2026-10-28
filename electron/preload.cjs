// Ponte mínima com o app: os botões da barra de título, o Mini-Memoras, os links memoras://,
// o aviso de computador bloqueado e as atualizações.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memorasWin', {
  minimize: () => ipcRenderer.send('win', 'min'),
  toggleMaximize: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  onMaximized: cb => ipcRenderer.on('win-max', (_e, maximized) => cb(maximized)),
  // Modo da janela ('full' ou 'mini'), já na carga da página: o primeiro desenho sai no modo certo.
  mode: ipcRenderer.sendSync('win-mode-get'),
  setMode: (mode, anchor) => ipcRenderer.invoke('win-mode', mode, anchor ?? null),
  onMode: cb => ipcRenderer.on('win-mode', (_e, m) => cb(m)),
  setOnTop: on => ipcRenderer.invoke('win-top', on === true),
  setBg: c => ipcRenderer.send('win-bg', String(c)),
  // Links memoras:// recebidos pelo app (ver electron/main.cjs).
  onLink: cb => ipcRenderer.on('link', (_e, url) => cb(url)),
  // Computador bloqueado ou em suspensão (true) e de volta (false), para o PIN.
  onAway: cb => ipcRenderer.on('away', (_e, away) => cb(away)),
  // Atualizações: andamento, procurar agora e reiniciar para instalar.
  update: {
    get: () => ipcRenderer.invoke('upd-get'),
    check: () => ipcRenderer.send('upd-check'),
    install: () => ipcRenderer.send('upd-install'),
    on: cb => ipcRenderer.on('upd', (_e, s) => cb(s)),
  },
});
