// Ponte mínima para a barra de título própria: só os três botões da janela.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memorasWin', {
  minimize: () => ipcRenderer.send('win', 'min'),
  toggleMaximize: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  onMaximized: cb => ipcRenderer.on('win-max', (_e, maximized) => cb(maximized)),
});
