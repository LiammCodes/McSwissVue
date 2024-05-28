// const { setupTitlebar, attachTitlebarToWindow } = require('custom-electron-titlebar/main');
const { app, BrowserWindow, Notification, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path')
const packagejs = require('./package.json');
const isDev = !app.isPackaged;
const { autoUpdater, AppUpdater } = require('electron-updater')

// setup the titlebar main process
// setupTitlebar();

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function showNotification (title, body) {
  new Notification({ title: title, body: body }).show()
}

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    // titleBarStyle: 'hidden',
    // titleBarOverlay: true,
    width: 1200,
    minWidth: 1200,
    height: 800,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      // sandbox: false,
      // preload: path.join(__dirname, 'preload.ts')
    },
    show: false
  });

  // attach fullScreen(f11 and not 'maximized') && focus listeners
  // attachTitlebarToWindow(mainWindow);

  if (isDev) {
    // set timer to allow vite to launch before trying to serve electron app
    setTimeout(function() {
      console.log('starting vite...');
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools({ mode: 'right'});
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // solution to flashing white screen on app load
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

}

function clearTempFiles() {
  // only necessary for dev env
  if (isDev) {
    const directory = "src/temp/";

    fs.readdir(directory, (err, files) => {
      if (err) throw err;
  
      for (const file of files) {
        fs.unlink(path.join(directory, file), (err) => {
          if (err) throw err;
        });
      }
    });
  }
}

app.on('ready', function()  {
  autoUpdater.checkForUpdatesAndNotify();
});

app.whenReady().then(() => {
  // autoUpdater.checkForUpdates()
  // Menu.setApplicationMenu(Menu.buildFromTemplate([]));
  require('@electron/remote/main').initialize()
  createWindow();

  ipcMain.handle('get-app-path', async (event) => {
    const result = isDev ? 'src/temp' : app.getPath("temp");
    return result;
  })

  ipcMain.handle('get-version', async (event) => {
    return packagejs.version;
  })

  ipcMain.handle('get-version-release', async (event) => {
    return packagejs.versionReleased;
  })

  ipcMain.handle('dialog', async (event, method, params) => {       
    // If the platform is 'darwin' (macOS)
    try {
      const file = await dialog.showOpenDialog({
        title: 'Select a directory to output the results to.',
        buttonLabel: 'Save',
        properties: ['openDirectory']
      });
      
      if (file.filePaths && file.filePaths.length > 0) {
        return file.filePaths[0];
      } else {
        // Handle the case where the user canceled the dialog or no files were selected.
        return null;
      }
    } catch (error) {
      // Handle any errors that may occur during the dialog.
      console.error(error);
      throw error; // You can choose to rethrow the error or handle it as needed.
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

});

// autoUpdater.on("update-available", (info) => {
//   showNotification('Update Available', 'Downloading the newest update')
//   autoUpdater.downloadUpdate();
// })

// autoUpdater.on("update-downloaded", (info) => {
//   showNotification('Update Downloaded', `Version ${pythonjs.version} has been installed`)
//   autoUpdater.downloadUpdate();
// })

// autoUpdater.on("error", (info) => {
//   showNotification('Error Updating', `${info}`)
//   autoUpdater.downloadUpdate();
// })

app.on('window-all-closed', () => {
  clearTempFiles();
  app.quit();
});
