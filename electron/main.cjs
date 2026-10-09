const { app, BrowserWindow, Menu, ipcMain, net, protocol, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

const ROOT = path.join(__dirname, '..', 'dist-desktop');
// NUNCA mude este endereço: as anotações (IndexedDB) ficam presas a ele.
// Trocar o esquema ou o nome faria o app abrir vazio depois de uma atualização.
const ORIGIN = 'app://memoras';

// Endereço próprio e estável: a criptografia do navegador exige contexto seguro
// e o IndexedDB fica preso a esta origem entre versões.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// Links memoras:// (o do email de "Esqueci minha senha") abrem o app e seguem para a tela certa.
const SCHEME = 'memoras';
const linkIn = argv => argv.find(a => a.startsWith(SCHEME + '://'));
let pendingLink = linkIn(process.argv);

let win = null;
const external = url => { if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url); };
const sendLink = link => {
  if (!win || win.webContents.isLoading()) pendingLink = link;
  else win.webContents.send('link', link);
};

// Menu do botão direito com corretor, recortar, copiar e colar (o Electron não traz um pronto).
function contextMenu(p) {
  const items = p.dictionarySuggestions.slice(0, 4).map(w => ({ label: w, click: () => win?.webContents.replaceMisspelling(w) }));
  if (p.misspelledWord) items.push({ label: 'Adicionar ao dicionário', click: () => win?.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) }, { type: 'separator' });
  if (p.isEditable) {
    const f = p.editFlags;
    items.push(
      { role: 'undo', label: 'Desfazer', enabled: f.canUndo }, { role: 'redo', label: 'Refazer', enabled: f.canRedo }, { type: 'separator' },
      { role: 'cut', label: 'Recortar', enabled: f.canCut }, { role: 'copy', label: 'Copiar', enabled: f.canCopy }, { role: 'paste', label: 'Colar', enabled: f.canPaste },
      { type: 'separator' }, { role: 'selectAll', label: 'Selecionar tudo', enabled: f.canSelectAll },
    );
  } else if (p.selectionText.trim()) items.push({ role: 'copy', label: 'Copiar' });
  return items;
}

function createWindow() {
  // Sem a moldura do Windows: o app desenha a própria barra de título, em vidro.
  win = new BrowserWindow({
    width: 1180, height: 800, minWidth: 360, minHeight: 520, frame: false,
    backgroundColor: '#1fd0c8', autoHideMenuBar: true, title: 'Memoras',
    icon: path.join(ROOT, 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) { e.preventDefault(); external(url); } });
  win.webContents.on('context-menu', (_e, p) => {
    const items = contextMenu(p);
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
  const sendMax = () => win?.webContents.send('win-max', win.isMaximized());
  win.on('maximize', sendMax);
  win.on('unmaximize', sendMax);
  win.webContents.on('did-finish-load', () => {
    sendMax();
    if (pendingLink) { win.webContents.send('link', pendingLink); pendingLink = null; }
  });
  win.on('closed', () => { win = null; });
  void win.loadURL(ORIGIN + '/');
}

ipcMain.on('win', (e, action) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (action === 'min') w.minimize();
  else if (action === 'max') { if (w.isMaximized()) w.unmaximize(); else w.maximize(); }
  else if (action === 'close') w.close();
});

// Atualizações: a versão nova baixa em segundo plano e o app mostra o andamento, com um botão
// "Reiniciar e atualizar". Antes ela só entrava ao fechar o app, sem aviso nenhum na tela.
const updOn = app.isPackaged && !process.env.MEMORAS_NO_UPDATE;
const upd = { state: 'idle', version: '', percent: 0 };
const setUpd = patch => { Object.assign(upd, patch); win?.webContents.send('upd', upd); };
// Registro em atualizacao.log (pasta de dados do app), para entender um problema de atualização.
const updLog = level => (...a) => {
  try {
    const f = path.join(app.getPath('userData'), 'atualizacao.log');
    if (fs.existsSync(f) && fs.statSync(f).size > 200000) fs.writeFileSync(f, '');
    fs.appendFileSync(f, new Date().toISOString() + ' ' + level + ' ' + a.map(x => x instanceof Error ? x.stack : String(x)).join(' ') + '\n');
  } catch { /* sem registro, segue */ }
};
autoUpdater.logger = { info: updLog('info'), warn: updLog('aviso'), error: updLog('erro'), debug: () => {} };
autoUpdater.on('checking-for-update', () => { if (upd.state !== 'ready') setUpd({ state: 'checking' }); });
autoUpdater.on('update-not-available', () => setUpd({ state: 'latest' }));
autoUpdater.on('update-available', i => setUpd({ state: 'downloading', version: i.version, percent: 0 }));
autoUpdater.on('download-progress', p => setUpd({ state: 'downloading', percent: Math.round(p.percent) }));
autoUpdater.on('update-downloaded', i => setUpd({ state: 'ready', version: i.version }));
autoUpdater.on('error', () => { if (upd.state !== 'ready') setUpd({ state: 'error' }); });
const checkUpd = () => { if (upd.state !== 'downloading' && upd.state !== 'ready') autoUpdater.checkForUpdates().catch(e => updLog('erro')(e)); };
ipcMain.handle('upd-get', () => ({ ...upd, current: app.getVersion(), on: updOn }));
ipcMain.on('upd-check', () => { if (updOn) checkUpd(); });
// Fecha, instala em silêncio e abre o app de novo.
ipcMain.on('upd-install', () => { if (upd.state === 'ready') autoUpdater.quitAndInstall(true, true); });

if (!app.requestSingleInstanceLock()) app.quit();
else {
  if (app.isPackaged) app.setAsDefaultProtocolClient(SCHEME);
  app.on('second-instance', (_e, argv) => {
    const link = linkIn(argv);
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    if (link) sendLink(link);
  });
  app.whenReady().then(() => {
    protocol.handle('app', req => {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (p === '/' || !path.extname(p)) p = '/index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT + path.sep)) return new Response('', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    Menu.setApplicationMenu(null);
    createWindow();

    // Procura versão nova ao abrir e a cada 4 horas. Se a pessoa não reiniciar pelo botão,
    // a versão baixada entra ao fechar o app, como antes.
    if (updOn) {
      checkUpd();
      setInterval(checkUpd, 4 * 60 * 60 * 1000);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
