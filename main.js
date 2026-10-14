const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// ─── Gmail SMTP ───────────────────────────────────────────────────────────────
// The address is not secret. The App Password is NOT stored in the code: it lives in a local file on each
// computer (userData/gmail.config.json), entered in Settings → Business Identity → Email.
const GMAIL_USER = 'kevin@integritykansascity.com';

// ─── Auto-update ─────────────────────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `Integrity Bookkeeping ${app.getVersion()} has been downloaded.`,
    detail: 'The update will be installed when you restart the app.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall(false, true);
  });
});

autoUpdater.on('error', err => {
  console.error('Auto-update error:', err?.message || err);
});

// ─── Paths ───────────────────────────────────────────────────────────────────
const DATA_FILE   = path.join(app.getPath('userData'), 'integrity-data.json');
const LOGO_DIR    = path.join(app.getPath('userData'), 'assets');
const DOCS_DIR    = path.join(app.getPath('userData'), 'documents');
const CONFIG_FILE = path.join(app.getPath('userData'), 'supabase.config.json');
const GMAIL_FILE  = path.join(app.getPath('userData'), 'gmail.config.json');
const loadGmailPassword = () => {
  try { return JSON.parse(fs.readFileSync(GMAIL_FILE, 'utf8')).password || ''; } catch (_) { return ''; }
};

// ─── Window ──────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Integrity Bookkeeping',
    backgroundColor: '#f7f5f2',   // matches the startup animation, so no white flash before it
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('app.html');

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [
      { role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }
    ] }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Snapshot',
          submenu: [
            {
              label: 'All Data',
              click: () => { if (mainWindow) mainWindow.webContents.send('trigger-export-all'); },
            },
            {
              id: 'export-client',
              label: 'Current Client',
              enabled: false,
              click: () => { if (mainWindow) mainWindow.webContents.send('trigger-export-client'); },
            },
          ],
        },
        {
          label: 'Import & Sync…',
          click: async () => {
            if (!mainWindow) return;
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              title: 'Import Snapshot',
              filters: [{ name: 'Integrity Snapshot', extensions: ['json'] }],
              properties: ['openFile'],
            });
            if (canceled || !filePaths.length) return;
            try {
              const raw = fs.readFileSync(filePaths[0], 'utf8');
              const snapshot = JSON.parse(raw);
              if (snapshot.snapshotVersion !== 1) throw new Error('Unrecognized snapshot format.');
              mainWindow.webContents.send('import-snapshot-data', snapshot);
            } catch (e) {
              dialog.showErrorBox('Import failed', e.message);
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      ...(isMac ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }]
                : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      { type: 'separator' },
      { label: 'Keyboard Shortcuts…', accelerator: 'CmdOrCtrl+/',
        click: () => { if (mainWindow) mainWindow.webContents.send('open-shortcuts-prefs'); } }
    ] },
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
      { role: 'togglefullscreen' }
    ] },
    { label: 'Window', submenu: [ { role: 'minimize' }, { role: 'zoom' },
      ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]) ] },
    { label: 'Help', submenu: [
      { label: 'Check for Updates…', click: () => { if (app.isPackaged) autoUpdater.checkForUpdates(); } },
      { label: `Version ${app.getVersion()}`, enabled: false },
    ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  // Check for updates after window loads (only in packaged app)
  if (app.isPackaged) {
    mainWindow.webContents.once('did-finish-load', () => {
      autoUpdater.checkForUpdatesAndNotify();
    });
  }
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Data persistence ────────────────────────────────────────────────────
ipcMain.handle('save-data', (_event, json) => {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, json, 'utf8');
});

ipcMain.handle('load-data', () => {
  try {
    if (fs.existsSync(DATA_FILE)) return fs.readFileSync(DATA_FILE, 'utf8');
  } catch (e) {
    console.error('load-data error:', e);
  }
  return null;
});

// ─── IPC: Logo ────────────────────────────────────────────────────────────────
ipcMain.handle('save-logo', (_event, dataUrl, filename) => {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  const ext = path.extname(filename) || '.png';
  const dest = path.join(LOGO_DIR, 'logo' + ext);
  // Strip data URL header and write binary
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(dest, Buffer.from(base64, 'base64'));
  return `file://${dest.replace(/\\/g, '/')}`;
});

// The Integrity logo that ships with the app. Returned as a data URL so it also works inside the temporary
// HTML files used for PDF / email (a relative path would not resolve there).
ipcMain.handle('get-brand-logo', () => {
  try {
    const buf = fs.readFileSync(path.join(__dirname, 'assets', 'integrity-logo-sbs.png'));
    return 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) { return null; }
});

ipcMain.handle('load-logo-path', () => {
  // Return the path of the saved logo if it exists
  for (const ext of ['.png', '.svg', '.jpg', '.jpeg', '.webp']) {
    const candidate = path.join(LOGO_DIR, 'logo' + ext);
    if (fs.existsSync(candidate)) return `file://${candidate.replace(/\\/g, '/')}`;
  }
  return null;
});

// ─── IPC: Documents ──────────────────────────────────────────────────────────
ipcMain.handle('save-doc', (_event, dataUrl, originalName) => {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const ext = path.extname(originalName) || '';
  const storedName = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext;
  const dest = path.join(DOCS_DIR, storedName);
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  fs.writeFileSync(dest, Buffer.from(base64, 'base64'));
  return storedName;
});

ipcMain.handle('open-doc', (_event, storedName) => {
  const filePath = path.join(DOCS_DIR, storedName);
  if (fs.existsSync(filePath)) shell.openPath(filePath);
});

ipcMain.handle('get-doc-url', (_event, storedName) => {
  const filePath = path.join(DOCS_DIR, storedName);
  if (fs.existsSync(filePath)) return `file://${filePath.replace(/\\/g, '/')}`;
  return null;
});

ipcMain.handle('delete-doc', (_event, storedName) => {
  const filePath = path.join(DOCS_DIR, storedName);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
});

// ─── IPC: Supabase config ────────────────────────────────────────────────────
ipcMain.handle('load-supabase-config', () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (_) {}
  return null;
});

ipcMain.handle('save-supabase-config', (_event, config) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config), 'utf8');
});

// ─── IPC: Gmail App Password (local file only; the renderer can only ask if one is saved, never read it) ──
ipcMain.handle('has-gmail-password', () => !!loadGmailPassword());
ipcMain.handle('save-gmail-password', (_event, password) => {
  fs.mkdirSync(path.dirname(GMAIL_FILE), { recursive: true });
  fs.writeFileSync(GMAIL_FILE, JSON.stringify({ password: String(password || '').trim() }), 'utf8');
  return true;
});

// ─── IPC: Send email with PDF attachment ─────────────────────────────────────
ipcMain.handle('send-email-pdf', async (_event, { to, subject, body, html, filename }) => {
  const tmpPath = path.join(app.getPath('temp'), '_integrity_email.html');
  const gmailPassword = loadGmailPassword();
  if (!gmailPassword) return { success: false, error: 'Gmail App Password not set. Go to Settings → Business Identity → Email to add it.' };
  try {
    fs.writeFileSync(tmpPath, html, 'utf8');
    const win = new BrowserWindow({ show: false, skipTaskbar: true, parent: mainWindow, webPreferences: { javascript: false } });
    await win.loadFile(tmpPath);
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    win.close();
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: gmailPassword },
    });
    await transporter.sendMail({
      from: `"Integrity Estate Liquidation" <${GMAIL_USER}>`,
      to,
      subject,
      text: body,
      attachments: [{ filename, content: Buffer.from(pdfData), contentType: 'application/pdf' }],
    });
    return { success: true };
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('send-email-pdf error:', e);
    return { success: false, error: e.message };
  }
});

// ─── IPC: Direct print (system print dialog) ─────────────────────────────────
ipcMain.handle('print-direct', (_event, { html }) => {
  return new Promise((resolve) => {
    const tmpPath = path.join(app.getPath('temp'), '_integrity_print.html');
    fs.writeFileSync(tmpPath, html, 'utf8');
    const win = new BrowserWindow({ show: false, skipTaskbar: true, parent: mainWindow, webPreferences: { javascript: false } });
    win.loadFile(tmpPath).then(() => {
      win.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
        try { win.close(); } catch (_) {}
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        resolve({ success, errorType });
      });
    }).catch(e => {
      try { win.close(); } catch (_) {}
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      resolve({ success: false, error: e.message });
    });
  });
});

// ─── IPC: Snapshot export ─────────────────────────────────────────────────────
ipcMain.handle('export-snapshot', async (_event, { json, filename }) => {
  const baseDir = app.getPath('documents');
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Snapshot',
    defaultPath: path.join(baseDir, filename),
    filters: [{ name: 'Integrity Snapshot', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { success: false };
  try {
    fs.writeFileSync(filePath, json, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── IPC: View changed — enables/disables the "Current Client" export item ────
ipcMain.on('view-changed', (_event, view) => {
  const menu = Menu.getApplicationMenu();
  const item = menu && menu.getMenuItemById('export-client');
  if (item) item.enabled = (view === 'client');
});

// ─── IPC: Folder picker ───────────────────────────────────────────────────────
ipcMain.handle('pick-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose save folder',
  });
  if (canceled || !filePaths.length) return null;
  return filePaths[0];
});

// ─── IPC: PDF export ─────────────────────────────────────────────────────────
ipcMain.handle('print-invoice-pdf', async (_event, { html, suggestedName, defaultDir }) => {
  const baseDir = (defaultDir && fs.existsSync(defaultDir)) ? defaultDir : app.getPath('documents');
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(baseDir, (suggestedName || 'invoice') + '.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { success: false, reason: 'canceled' };

  const tmpPath = path.join(app.getPath('temp'), '_integrity_print.html');
  fs.writeFileSync(tmpPath, html, 'utf8');

  const win = new BrowserWindow({ show: false, skipTaskbar: true, parent: mainWindow, webPreferences: { javascript: false } });
  try {
    await win.loadFile(tmpPath);
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    win.close();
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    fs.writeFileSync(filePath, pdfData);
    shell.openPath(filePath);
    return { success: true };
  } catch (e) {
    try { win.close(); } catch (_) {}
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('print-invoice-pdf error:', e);
    return { success: false, reason: e.message };
  }
});
