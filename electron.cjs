const { app, BrowserWindow, Notification, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const isDev = !app.isPackaged;

const NOTIFICATION_TITLE = 'Basic Notification';
const NOTIFICATION_BODY = 'Notification from the Main process';

function showNotification () {
  new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
}

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1200,
    minWidth: 1200,
    height: 800,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    show: false
  });

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

app.whenReady().then(() => {
  require('@electron/remote/main').initialize()
  createWindow();

  ipcMain.handle('get-app-path', async (event) => {
    const result = isDev ? 'src/temp' : app.getPath("temp");
    return result;
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

}).then(showNotification);

app.on('window-all-closed', () => {
  clearTempFiles();
  app.quit();
});
