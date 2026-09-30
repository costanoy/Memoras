const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

const ROOT = path.join(__dirname, '..', 'dist-desktop');
const ORIGIN = 'app://memoras';

// Endereço próprio e estável: a criptografia do navegador exige contexto seguro
// e o IndexedDB fica preso a esta origem entre versões.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win = null;
const external = url => { if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url); };

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 800, minWidth: 360, minHeight: 520,
    backgroundColor: '#1fd0c8', autoHideMenuBar: true, title: 'Memoras',
    icon: path.join(ROOT, 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) { e.preventDefault(); external(url); } });
  win.on('closed', () => { win = null; });
  void win.loadURL(ORIGIN + '/');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('app', req => {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (p === '/' || !path.extname(p)) p = '/index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) return new Response('', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    Menu.setApplicationMenu(null);
    createWindow();

    // Baixa a versão nova em segundo plano e instala ao fechar o app.
    if (app.isPackaged) {
      const check = () => autoUpdater.checkForUpdatesAndNotify().catch(e => console.warn('Memoras: atualização falhou', e));
      void check();
      setInterval(check, 4 * 60 * 60 * 1000);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
