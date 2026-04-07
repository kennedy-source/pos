const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;
let mainWindow;
let backendProcess = null;

// Configure and check for updates
autoUpdater.checkForUpdatesAndNotify();

// Start backend server
async function startBackend() {
  try {
    // Check if backend is already running
    const response = await axios.get('http://localhost:3000/health', { timeout: 2000 }).catch(() => null);
    if (response) {
      console.log('✅ Backend already running on port 3000');
      return;
    }
  } catch (e) {
    // Backend not running, start it
  }

  try {
    console.log('🚀 Starting backend server...');
    const apiPath = isDev 
      ? path.join(__dirname, '../../api')
      : path.join(process.resourcesPath, 'api');

    // Start backend process
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: apiPath,
      stdio: 'ignore',
      shell: true,
      detached: true,
    });

    backendProcess.unref();
    
    console.log('✅ Backend started successfully');

    // Wait for backend to be ready
    let retries = 0;
    const maxRetries = 30;
    while (retries < maxRetries) {
      try {
        await axios.get('http://localhost:3000/health', { timeout: 1000 });
        console.log('✅ Backend is ready!');
        return;
      } catch (e) {
        retries++;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.warn('⚠️ Backend started but health check timeout');
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
  }
}

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

app.whenReady().then(async () => {
  await startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    try {
      process.kill(-backendProcess.pid);
    } catch (e) {
      console.log('Backend process already terminated');
    }
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Ensure backend is killed
  if (backendProcess) {
    try {
      process.kill(-backendProcess.pid);
    } catch (e) {}
  }
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
