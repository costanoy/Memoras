const { app, BrowserWindow, Menu, dialog, ipcMain, net, powerMonitor, protocol, screen, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

const ROOT = path.join(__dirname, '..', 'dist-desktop');
// NUNCA mude este endereço: as anotações (IndexedDB) ficam presas a ele.
// Trocar o esquema ou o nome faria o app abrir vazio depois de uma atualização.
const ORIGIN = 'app://memoras';

// Endereço próprio e estável: a criptografia do navegador exige contexto seguro
// e o IndexedDB fica preso a esta origem entre versões. codeCache: o Chromium guarda o código
// já compilado do app entre uma abertura e outra (não muda a origem).
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } }]);

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

// Menu do botão direito com recortar, copiar e colar (o Electron não traz um pronto).
// Sem corretor: o sublinhado de ortografia atrapalhava a leitura do diário.
function contextMenu(p) {
  const items = [];
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

// Janela completa e Mini-Memoras. O mini tem o tamanho da janela padrão do Cynote (643 × 523).
// O modo, o tamanho das duas janelas e a cor de fundo do tema ficam em janela.json, na pasta de
// dados do app, fora do IndexedDB. O modo nunca vai na URL: a origem app://memoras não pode mudar.
const FULL = { width: 1180, height: 800, minWidth: 360, minHeight: 520 };
const MINI = { width: 643, height: 523, minWidth: 520, minHeight: 420 };
const LOOSE = [360, 420];   // mínimo folgado durante a troca, para o Windows não esbarrar no mínimo antigo
const janFile = () => path.join(app.getPath('userData'), 'janela.json');
const jan = { v: 1, mode: 'full', full: null, mini: null, bg: null, tip: false, zoom: 0 };
let switching = false, topOn = false, saveTimer = null;

const rectOf = r => ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) });
// -32000 é a posição que o Windows informa para janela minimizada: nunca vale.
const validRect = (r, m) => !!r && [r.x, r.y, r.width, r.height].every(Number.isFinite)
  && r.x > -10000 && r.y > -10000 && r.width >= m.minWidth && r.height >= m.minHeight && r.width <= 10000 && r.height <= 10000;
function loadJan() {
  try {
    const j = JSON.parse(fs.readFileSync(janFile(), 'utf8'));
    if (!j || j.v !== 1) return;
    jan.mode = j.mode === 'mini' ? 'mini' : 'full';
    jan.full = validRect(j.full, FULL) ? { ...rectOf(j.full), maximized: j.full.maximized === true } : null;
    jan.mini = validRect(j.mini, MINI) ? rectOf(j.mini) : null;
    jan.bg = typeof j.bg === 'string' && /^#[0-9a-f]{6}$/i.test(j.bg) ? j.bg : null;
    jan.tip = j.tip === true;
    jan.zoom = Number.isFinite(j.zoom) && j.zoom >= -2 && j.zoom <= 3 ? j.zoom : 0;
  } catch { /* sem arquivo ou ilegível: começa do padrão */ }
}
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  try { const f = janFile(); fs.writeFileSync(f + '.tmp', JSON.stringify(jan)); fs.renameSync(f + '.tmp', f); } catch { /* sem gravar, segue */ }
}
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); };

// Visível: a faixa de cima da janela (onde fica a barra de título) aparece em alguma tela.
function visible(r) {
  return screen.getAllDisplays().some(({ workArea: a }) => {
    const w = Math.min(r.x + r.width, a.x + a.width) - Math.max(r.x, a.x), h = Math.min(r.y + 30, a.y + a.height) - Math.max(r.y, a.y);
    return w >= 120 && h >= 20;
  });
}
// Dentro da área de trabalho da tela (sem cobrir a barra de tarefas).
function clamp(r, a) {
  const width = Math.min(r.width, a.width), height = Math.min(r.height, a.height);
  return { x: Math.round(Math.min(Math.max(r.x, a.x), a.x + a.width - width)), y: Math.round(Math.min(Math.max(r.y, a.y), a.y + a.height - height)), width, height };
}
// Com a tela em 125% ou 150%, o Windows arredonda posição e tamanho em 1 ou 2 pixels: diferença assim é
// só arredondamento (guardar o valor arredondado faria a janela crescer um pouco a cada troca).
const near = (a, b) => !!a && !!b && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2 && Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= 2;
// Entre telas com escalas diferentes, o Windows às vezes aplica o tamanho errado na primeira vez.
function setBoundsSafe(r) {
  win.setBounds(r);
  if (!near(win.getBounds(), r)) win.setBounds(r);
}
const sameDisplay = (r, d) => screen.getDisplayMatching(r).id === d.id;

// Onde a janela pequena aparece: onde ficou da última vez (se for na mesma tela); entrando pelo
// clique, com o botão de voltar bem embaixo do ponteiro; senão, no canto de cima à direita.
function placeMini(from, anchor, wasMax) {
  const d = screen.getDisplayMatching(from), a = d.workArea;
  if (jan.mini && visible(jan.mini) && sameDisplay(jan.mini, d)) return clamp(jan.mini, a);
  const size = { width: jan.mini?.width ?? MINI.width, height: jan.mini?.height ?? MINI.height };
  const c = screen.getCursorScreenPoint();
  const inside = c.x >= from.x && c.x < from.x + from.width && c.y >= from.y && c.y < from.y + from.height;
  if (anchor && inside) return clamp({ x: c.x - size.width + anchor.dx, y: c.y - anchor.dy, ...size }, a);
  if (wasMax) return clamp({ x: a.x + a.width - size.width - 16, y: a.y + 16, ...size }, a);
  return clamp({ x: from.x + from.width - size.width, y: from.y, ...size }, a);
}
// A janela completa volta para onde estava; se o mini foi para outra tela, abre nela, centralizada.
function placeFull(from) {
  const d = screen.getDisplayMatching(from), a = d.workArea;
  if (jan.full && visible(jan.full) && sameDisplay(jan.full, d)) return clamp(jan.full, a);
  const width = jan.full?.width ?? FULL.width, height = jan.full?.height ?? FULL.height;
  return clamp({ x: a.x + (a.width - width) / 2, y: a.y + (a.height - height) / 2, width, height }, a);
}

// O tamanho de cada modo, guardado sempre que a pessoa move ou redimensiona (nunca durante a troca).
function track() {
  if (!win || switching || win.isMinimized()) return;
  if (jan.mode === 'mini') { const b = rectOf(win.getBounds()); if (!near(b, jan.mini)) jan.mini = b; }
  else {
    const max = win.isMaximized(), b = rectOf(max ? win.getNormalBounds() : win.getBounds());
    jan.full = { ...(near(b, jan.full) ? rectOf(jan.full) : b), maximized: max };
  }
  saveSoon();
}

function setMode(mode, anchor) {
  if (!win || switching || mode === jan.mode) return { mode: jan.mode, first: false, top: jan.mode === 'mini' && topOn };
  switching = true;
  let first = false;
  try {
    if (mode === 'mini') {
      const max = win.isMaximized(), from = win.getBounds();
      if (!win.isMinimized()) { const nb = rectOf(max ? win.getNormalBounds() : from); jan.full = { ...(near(nb, jan.full) ? rectOf(jan.full) : nb), maximized: max }; }
      if (max) win.unmaximize();
      win.setMinimumSize(...LOOSE);
      win.setMaximizable(false);
      const target = placeMini(from, anchor, max);
      setBoundsSafe(target);
      win.setMinimumSize(MINI.minWidth, MINI.minHeight);
      win.setAlwaysOnTop(topOn);
      jan.mode = 'mini'; jan.mini = target;
      first = !jan.tip; jan.tip = true;
    } else {
      const b = rectOf(win.getBounds());
      if (!near(b, jan.mini)) jan.mini = b;
      win.setAlwaysOnTop(false);
      win.setMaximizable(true);
      win.setMinimumSize(...LOOSE);
      setBoundsSafe(placeFull(jan.mini));
      win.setMinimumSize(FULL.minWidth, FULL.minHeight);
      if (jan.full?.maximized) win.maximize();
      jan.mode = 'full';
    }
    saveNow();
  } finally {
    // Os eventos de mover e redimensionar da própria troca chegam depois: só então volta a guardar.
    setTimeout(() => { switching = false; track(); }, 150);
  }
  return { mode: jan.mode, first, top: jan.mode === 'mini' && topOn };
}

// Janela que ficou fora de todas as telas (monitor desligado, escala mudada): volta para a principal.
function rescue() {
  if (!win || win.isMinimized() || win.isMaximized()) return;
  const b = win.getBounds();
  if (!visible(b)) setBoundsSafe(clamp(b, screen.getPrimaryDisplay().workArea));
}

function createWindow() {
  const mini = jan.mode === 'mini', m = mini ? MINI : FULL;
  let r = mini ? jan.mini : jan.full;
  if (r && !visible(r)) r = null;
  if (mini && !r) { const a = screen.getPrimaryDisplay().workArea; r = { x: a.x + a.width - MINI.width - 16, y: a.y + 16, width: MINI.width, height: MINI.height }; }
  // Sem a moldura do Windows: o app desenha a própria barra de título, em vidro. Nasce escondida e
  // aparece pronta, já na cor do tema e no modo em que foi fechada.
  win = new BrowserWindow({
    ...(r ? { x: r.x, y: r.y, width: r.width, height: r.height } : { width: FULL.width, height: FULL.height }),
    minWidth: m.minWidth, minHeight: m.minHeight, maximizable: !mini, show: false, frame: false,
    backgroundColor: jan.bg || '#1fd0c8', autoHideMenuBar: true, title: 'Memoras',
    icon: path.join(ROOT, 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, preload: path.join(__dirname, 'preload.cjs') },
  });
  // Criada já sem o botão de maximizar (mini), o Windows calcula a borda de outro jeito e a janela nasce
  // alguns pixels maior: o tamanho é aplicado de novo antes de ela aparecer.
  if (r) setBoundsSafe(r);
  let shown = false;
  const reveal = () => {
    if (shown || !win) return;
    shown = true;
    if (!mini && jan.full?.maximized) win.maximize();
    win.show();
  };
  win.once('ready-to-show', reveal);
  setTimeout(reveal, 3000);

  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN + '/')) { e.preventDefault(); external(url); } });
  win.webContents.on('context-menu', (_e, p) => {
    const items = contextMenu(p);
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
  // Tamanho do texto (sem o menu do Electron, os atalhos de zoom não existem): Ctrl + = ou +,
  // Ctrl + -, Ctrl + 0 e Ctrl + roda do mouse. O nível fica guardado em janela.json.
  const zoom = d => {
    const wc = win.webContents;
    wc.setZoomLevel(d === 0 ? 0 : Math.min(3, Math.max(-2, wc.getZoomLevel() + d)));
    jan.zoom = wc.getZoomLevel(); saveSoon();
  };
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown' || !i.control || i.alt || i.meta) return;
    if (i.key === '=' || i.key === '+') zoom(0.5);
    else if (i.key === '-') zoom(-0.5);
    else if (i.key === '0') zoom(0);
    else return;
    e.preventDefault();
  });
  win.webContents.on('zoom-changed', (_e, dir) => zoom(dir === 'in' ? 0.5 : -0.5));
  // A página caiu (falta de memória, defeito do Chromium): a janela sem moldura ficaria sem botões.
  // Recarrega (o PIN é pedido de novo); se cair de novo logo em seguida, avisa e fecha.
  let crashes = [];
  win.webContents.on('render-process-gone', (_e, d) => {
    if (d.reason === 'clean-exit') return;
    const t = Date.now();
    crashes = crashes.filter(x => t - x < 60000).concat(t);
    if (crashes.length <= 2) { win?.webContents.reload(); return; }
    void dialog.showMessageBox({ type: 'error', title: 'Memoras', message: 'O Memoras parou de funcionar.', detail: 'Suas anotações continuam guardadas. Abra o app de novo.', buttons: ['Fechar'] }).then(() => app.quit());
  });

  const sendMax = () => win?.webContents.send('win-max', win.isMaximized());
  win.on('maximize', () => {
    sendMax();
    // Rede de segurança: se o Windows maximizar a janela pequena mesmo assim, ela vira o Memoras completo.
    if (jan.mode === 'mini' && !switching) {
      jan.mini = rectOf(win.getNormalBounds());
      win.setAlwaysOnTop(false); win.setMaximizable(true); win.setMinimumSize(FULL.minWidth, FULL.minHeight);
      jan.mode = 'full';
      win.webContents.send('win-mode', { mode: 'full', top: false });
    }
    track();
  });
  win.on('unmaximize', () => { sendMax(); track(); });
  win.on('moved', track);
  win.on('resized', track);
  win.on('close', () => { track(); saveNow(); });
  win.webContents.on('did-finish-load', () => {
    if (jan.zoom) win.webContents.setZoomLevel(jan.zoom);
    sendMax();
    if (pendingLink) { win.webContents.send('link', pendingLink); pendingLink = null; }
  });
  win.on('closed', () => { win = null; });
  void win.loadURL(ORIGIN + '/');
}

// Só a página desta janela fala com o main.
const own = e => !!win && BrowserWindow.fromWebContents(e.sender) === win;
ipcMain.on('win', (e, action) => {
  if (!own(e)) return;
  if (action === 'min') win.minimize();
  else if (action === 'max') { if (jan.mode === 'mini') return; if (win.isMaximized()) win.unmaximize(); else win.maximize(); }
  else if (action === 'close') win.close();
});
ipcMain.on('win-mode-get', e => { e.returnValue = own(e) ? jan.mode : 'full'; });
// anchor: onde fica o botão de voltar, a partir do canto de cima à direita da janela pequena.
const validAnchor = a => a && Number.isFinite(a.dx) && Number.isFinite(a.dy) && a.dx >= 0 && a.dx <= 400 && a.dy >= 0 && a.dy <= 60 ? { dx: a.dx, dy: a.dy } : null;
ipcMain.handle('win-mode', (e, mode, anchor) => own(e) ? setMode(mode === 'mini' ? 'mini' : 'full', validAnchor(anchor)) : null);
// "Manter por cima" só existe no mini e só vale enquanto o app está aberto.
ipcMain.handle('win-top', (e, on) => {
  if (!own(e) || jan.mode !== 'mini') return false;
  topOn = on === true;
  win.setAlwaysOnTop(topOn);
  return topOn;
});
// Cor de fundo do tema: a janela nasce nela e não pisca turquesa ao abrir ou ao trocar de modo.
ipcMain.on('win-bg', (e, c) => {
  if (!own(e) || typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) return;
  win.setBackgroundColor(c);
  if (jan.bg !== c) { jan.bg = c; saveSoon(); }
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
ipcMain.on('upd-install', () => { if (upd.state === 'ready') { saveNow(); autoUpdater.quitAndInstall(true, true); } });

if (!app.requestSingleInstanceLock()) app.quit();
else {
  if (app.isPackaged) app.setAsDefaultProtocolClient(SCHEME);
  app.on('second-instance', (_e, argv) => {
    const link = linkIn(argv);
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
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
    // O app não usa câmera, microfone, localização nem notificações, e o Electron liberaria tudo
    // sem perguntar. Ficam: guardar as anotações sem o sistema apagar quando falta espaço
    // (persistent-storage), copiar as chaves e abrir o app de email.
    // (O Electron chama a cópia de "clipboard-read" quando ela não vem direto de um clique.)
    const ALLOWED = ['persistent-storage', 'clipboard-sanitized-write', 'clipboard-read'];
    const allowed = (perm, url) => ALLOWED.includes(perm) || (perm === 'openExternal' && /^mailto:/i.test(url ?? ''));
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb, details) => cb(allowed(perm, details?.externalURL)));
    // Computador bloqueado ou em suspensão conta como app fora da tela (com PIN, ele trava depois do
    // tempo escolhido nos Ajustes). Voltar da suspensão com a tela ainda bloqueada não conta como volta.
    let screenLocked = false;
    const away = v => win?.webContents.send('away', v);
    powerMonitor.on('lock-screen', () => { screenLocked = true; away(true); });
    powerMonitor.on('suspend', () => away(true));
    powerMonitor.on('unlock-screen', () => { screenLocked = false; away(false); });
    powerMonitor.on('resume', () => { if (!screenLocked) away(false); });
    loadJan();
    screen.on('display-removed', rescue);
    screen.on('display-metrics-changed', rescue);
    createWindow();

    // Procura versão nova ao abrir e a cada 4 horas. Se a pessoa não reiniciar pelo botão,
    // a versão baixada entra ao fechar o app, como antes.
    if (updOn) {
      checkUpd();
      setInterval(checkUpd, 4 * 60 * 60 * 1000);
    }
  });
  app.on('before-quit', saveNow);
  app.on('window-all-closed', () => app.quit());
}
