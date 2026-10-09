// Ponte mínima com o app: os botões da barra de título, os links memoras:// e as atualizações.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memorasWin', {
  minimize: () => ipcRenderer.send('win', 'min'),
  toggleMaximize: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  onMaximized: cb => ipcRenderer.on('win-max', (_e, maximized) => cb(maximized)),
  // Links memoras:// recebidos pelo app (ver electron/main.cjs).
  onLink: cb => ipcRenderer.on('link', (_e, url) => cb(url)),
  // Atualizações: andamento, procurar agora e reiniciar para instalar.
  update: {
    get: () => ipcRenderer.invoke('upd-get'),
    check: () => ipcRenderer.send('upd-check'),
    install: () => ipcRenderer.send('upd-install'),
    on: cb => ipcRenderer.on('upd', (_e, s) => cb(s)),
  },
});
