const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;
let mainWindow;

// Configure and check for updates
autoUpdater.checkForUpdatesAndNotify();

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
    titleBarStyle: 'default',
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Auto-update event handlers
let updateAvailable = false;

autoUpdater.on('update-available', () => {
  updateAvailable = true;
  if (mainWindow) {
    mainWindow.webContents.send('update-available');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

// IPC: Check for updates
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      updateAvailable: result.updateInfo !== null,
      currentVersion: app.getVersion(),
      newVersion: result.updateInfo?.version,
    };
  } catch (error) {
    return { updateAvailable: false, error: error.message };
  }
});

// IPC: Install update and restart
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// IPC: Print receipt
ipcMain.handle('print-receipt', async (event, receiptHtml) => {
  const printWindow = new BrowserWindow({ show: false });
  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print(
      { silent: false, printBackground: true, copies: 1 },
      (success, errorType) => {
        printWindow.close();
      }
    );
  });
});

// IPC: Open external link
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// IPC: Show save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

// IPC: App version
ipcMain.handle('get-version', () => app.getVersion());

// IPC: Fullscreen toggle
ipcMain.handle('toggle-fullscreen', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
