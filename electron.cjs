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

app.whenReady().then(() => {
  require('@electron/remote/main').initialize()
  createWindow();

  // Forward autoUpdater events to renderer (window must exist)
  function sendToRenderer(channel, ...args) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  }
  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update-available', { version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-not-available');
  });
  autoUpdater.on('download-progress', () => {
    sendToRenderer('update-downloading');
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update-downloaded', { version: info.version });
  });
  autoUpdater.on('error', (err) => {
    sendToRenderer('update-error', { message: err.message });
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  ipcMain.handle('check-for-updates', async () => {
    if (isDev) {
      sendToRenderer('update-not-available');
      return { ok: true };
    }
    autoUpdater.checkForUpdates();
    return { ok: true };
  });

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });

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

  // Whisper transcription (runs in main process so Node/onnxruntime-node works)
  ipcMain.handle('transcribe-video', async (event, { videoPath }) => {
    const { spawn } = require('child_process');
    const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
    const SAMPLE_RATE = 16000;
    const WHISPER_MODEL = 'Xenova/whisper-tiny.en';

    function formatVttTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      const hrs = String(h).padStart(2, '0');
      const min = String(m).padStart(2, '0');
      const sec = String(Math.floor(s)).padStart(2, '0');
      const ms = String(Math.round((s % 1) * 1000)).padStart(3, '0');
      return hrs + ':' + min + ':' + sec + '.' + ms;
    }

    function transcriptionToVtt(output) {
      const lines = ['WEBVTT', ''];
      if (output.chunks && output.chunks.length > 0) {
        output.chunks.forEach((chunk, i) => {
          const [start, end] = chunk.timestamp;
          lines.push(String(i + 1));
          lines.push(formatVttTime(start) + ' --> ' + formatVttTime(end));
          lines.push(chunk.text.trim());
          lines.push('');
        });
      } else {
        lines.push('1');
        lines.push('00:00:00.000 --> 99:59:59.999');
        lines.push((output.text || '').trim());
        lines.push('');
      }
      return lines.join('\n');
    }

    function extractAudioToRaw(videoPath, outputPath) {
      return new Promise((resolve, reject) => {
        const args = ['-i', videoPath, '-map', '0:a:0', '-vn', '-ar', String(SAMPLE_RATE), '-ac', '1', '-f', 'f32le', '-y', outputPath];
        const proc = spawn(ffmpegPath, args);
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
          if (code === 0) return resolve();
          if (/matched no streams|does not contain any stream|Invalid data found/i.test(stderr)) {
            return reject(new Error('This file has no audio track. Only video files with an audio stream can be transcribed.'));
          }
          reject(new Error('ffmpeg exited ' + code + ': ' + stderr.slice(-500)));
        });
        proc.on('error', reject);
      });
    }

    function loadRawF32(filePath) {
      const buffer = fs.readFileSync(filePath);
      return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
    }

    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath, path.extname(videoPath));
    const rawPath = path.join(dir, base + '_whisper_audio.raw');

    try {
      await extractAudioToRaw(videoPath, rawPath);
      const audio = loadRawF32(rawPath);
      // Package exports: require('@huggingface/transformers') resolves to Node build in Node/Electron
      const { pipeline } = require('@huggingface/transformers');
      const transcriber = await pipeline('automatic-speech-recognition', WHISPER_MODEL);
      const output = await transcriber(audio, { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
      const vtt = transcriptionToVtt(output);
      return { vtt };
    } finally {
      try { fs.unlinkSync(rawPath); } catch (_) {}
    }
  });

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

app.on('window-all-closed', () => {
  clearTempFiles();
  app.quit();
});
