const { app, BrowserWindow, Notification, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

const NOTIFICATION_TITLE = 'Basic Notification';
const NOTIFICATION_BODY = 'Notification from the Main process';

function showNotification () {
  new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
}

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 1200,
    height: 800,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
  mainWindow.webContents.openDevTools({ mode: 'right'});
}

function clearTempFiles() {
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

app.whenReady().then(() => {
  require('@electron/remote/main').initialize()
  createWindow();

  ipcMain.handle('get-app-path', async (event) => {
    const result = app.getAppPath();
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
  // if (process.platform !== 'darwin') {
  //   fs.unlink(directoryPath + fileName, (err) => {
  //     if (err) {
  //         throw err;
  //     }
  //     console.log("Delete File successfully.");
  //   });
  //   app.quit();
  // }
  clearTempFiles();
  app.quit();
});
