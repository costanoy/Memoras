// Ponte mínima com o app: os três botões da barra de título e os links memoras://.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memorasWin', {
  minimize: () => ipcRenderer.send('win', 'min'),
  toggleMaximize: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  onMaximized: cb => ipcRenderer.on('win-max', (_e, maximized) => cb(maximized)),
  // Links memoras:// recebidos pelo app (ver electron/main.cjs).
  onLink: cb => ipcRenderer.on('link', (_e, url) => cb(url)),
});
