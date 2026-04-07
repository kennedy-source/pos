const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.log("Updater not available");
}

const isDev = !app.isPackaged;
let mainWindow;
let backendProcess = null;

// Safe updater
if (autoUpdater) {
  autoUpdater.checkForUpdatesAndNotify();
}

// 🔥 START BACKEND (FIXED)
async function startBackend() {
  try {
    const response = await axios.get('http://localhost:3000/health', { timeout: 2000 }).catch(() => null);
    if (response) {
      console.log('✅ Backend already running');
      return;
    }
  } catch {}

  try {
    console.log('🚀 Starting backend...');

    const backendPath = isDev
      ? path.join(__dirname, '../../api/dist/main.js')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'api', 'dist', 'main.js');

    backendProcess = spawn('node', [backendPath], {
      stdio: 'ignore',
      shell: true,
      detached: true,
    });

    backendProcess.unref();

    console.log('✅ Backend process started');

    let retries = 0;
    while (retries < 20) {
      try {
        await axios.get('http://localhost:3000/health', { timeout: 1000 });
        console.log('✅ Backend is ready');
        return;
      } catch {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
    }

    console.warn('⚠️ Backend startup timeout');
  } catch (error) {
    console.error('❌ Backend failed:', error);
  }
}

// 🖥 CREATE WINDOW
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'UniForm POS',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });
}

// 🚀 APP READY
app.whenReady().then(async () => {
  await startBackend();
  createWindow();
});

// 🛑 CLEANUP
app.on('window-all-closed', () => {
  if (backendProcess) {
    try {
      process.kill(-backendProcess.pid);
    } catch {}
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    try {
      process.kill(-backendProcess.pid);
    } catch {}
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 🔄 AUTO UPDATE EVENTS
if (autoUpdater) {
  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded');
  });

  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        updateAvailable: result.updateInfo !== null,
        currentVersion: app.getVersion(),
        newVersion: result.updateInfo?.version,
      };
    } catch (error) {
      return { updateAvailable: false };
    }
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

// 🧾 PRINT
ipcMain.handle('print-receipt', async (event, html) => {
  const win = new BrowserWindow({ show: false });
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.webContents.on('did-finish-load', () => {
    win.webContents.print({ printBackground: true }, () => win.close());
  });
});

// 🌐 EXTERNAL LINKS
ipcMain.handle('open-external', (e, url) => shell.openExternal(url));

// 💾 SAVE DIALOG
ipcMain.handle('show-save-dialog', (e, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

// 📦 VERSION
ipcMain.handle('get-version', () => app.getVersion());