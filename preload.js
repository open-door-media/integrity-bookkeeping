const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, narrow API to the renderer (app.html)
// All calls go through contextBridge — no direct Node access in renderer
contextBridge.exposeInMainWorld('electronAPI', {

  // ── Data persistence (local fallback / migration source) ────────────────
  saveData: (json)        => ipcRenderer.invoke('save-data', json),
  loadData: ()            => ipcRenderer.invoke('load-data'),

  // ── Supabase config ─────────────────────────────────────────────────────
  loadSupabaseConfig: ()         => ipcRenderer.invoke('load-supabase-config'),
  saveSupabaseConfig: (config)   => ipcRenderer.invoke('save-supabase-config', config),

  // ── Logo ────────────────────────────────────────────────────────────────
  // saveLogo: saves the uploaded image to userData/assets/, returns file:// path
  saveLogo: (dataUrl, filename) => ipcRenderer.invoke('save-logo', dataUrl, filename),
  // loadLogoPath: returns file:// path of previously saved logo, or null
  loadLogoPath: ()        => ipcRenderer.invoke('load-logo-path'),
  // getBrandLogo: the bundled Integrity logo as a data URL (used on invoices and statements)
  getBrandLogo: ()        => ipcRenderer.invoke('get-brand-logo'),

  // ── Folder picker ───────────────────────────────────────────────────────
  pickFolder: ()          => ipcRenderer.invoke('pick-folder'),

  // ── PDF export ──────────────────────────────────────────────────────────
  // printInvoicePDF: renders the provided HTML in a hidden window, saves as PDF
  printInvoicePDF: (html, suggestedName, defaultDir) => ipcRenderer.invoke('print-invoice-pdf', { html, suggestedName, defaultDir }),
  // printDirect: renders HTML in a hidden window and opens the system print dialog
  printDirect: (html) => ipcRenderer.invoke('print-direct', { html }),
  // sendEmailPdf: generates PDF from HTML and sends it via Gmail SMTP with nodemailer
  sendEmailPdf: (opts) => ipcRenderer.invoke('send-email-pdf', opts),
  // Gmail App Password lives in a local file; the page can only check whether one is saved or replace it
  hasGmailPassword:  ()   => ipcRenderer.invoke('has-gmail-password'),
  saveGmailPassword: (pw) => ipcRenderer.invoke('save-gmail-password', pw),

  // ── Documents ───────────────────────────────────────────────────────────
  saveDoc:   (dataUrl, originalName) => ipcRenderer.invoke('save-doc', dataUrl, originalName),
  openDoc:   (storedName)            => ipcRenderer.invoke('open-doc', storedName),
  getDocUrl: (storedName)            => ipcRenderer.invoke('get-doc-url', storedName),
  deleteDoc: (storedName)            => ipcRenderer.invoke('delete-doc', storedName),

  // ── Menu-triggered navigation ────────────────────────────────────────────
  onOpenShortcutsPrefs: (callback) => ipcRenderer.on('open-shortcuts-prefs', () => callback()),

  // ── Snapshot export / import ─────────────────────────────────────────────
  exportSnapshot: (json, filename) => ipcRenderer.invoke('export-snapshot', { json, filename }),
  notifyViewChanged: (view) => ipcRenderer.send('view-changed', view),
  onTriggerExportAll: (cb) => ipcRenderer.on('trigger-export-all', () => cb()),
  onTriggerExportClient: (cb) => ipcRenderer.on('trigger-export-client', () => cb()),
  onImportSnapshotData: (cb) => ipcRenderer.on('import-snapshot-data', (_e, data) => cb(data)),

});
