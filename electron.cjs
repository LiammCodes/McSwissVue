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
    // Multilingual model supports Canadian French and English (no separate “Canadian” model).
    const WHISPER_MODEL = 'Xenova/whisper-tiny'; // or Xenova/whisper-small for better quality
    const WHISPER_LANGUAGE = null; // 'en' | 'fr' | null (null = auto-detect from first N seconds)
    const WHISPER_DETECT_SEC = 90; // seconds of audio used for language detection (e.g. skip music intro)

    console.log('[transcribe] app.isPackaged:', app.isPackaged);
    console.log('[transcribe] __dirname:', __dirname);
    console.log('[transcribe] process.resourcesPath:', process.resourcesPath);

    const sharpUnpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sharp');
    const imgUnpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@img');
    console.log('[transcribe] sharp unpacked exists:', fs.existsSync(sharpUnpackedPath));
    console.log('[transcribe] @img unpacked exists:', fs.existsSync(imgUnpackedPath));

    if (fs.existsSync(imgUnpackedPath)) {
      console.log('[transcribe] @img contents:', fs.readdirSync(imgUnpackedPath));
    }

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
            return reject(new Error('This file has no audio track.'));
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

    /**
     * Detect spoken language from the given audio slice.
     * Whisper prefix order is: <|startoftranscript|> <|lang_id|> <|task|> ...
     * So we pass only [start] and generate 1 token; that token is the language id.
     */
    async function detectWhisperLanguage(transcriber, audioSlice, sampleRate) {
      const model = transcriber.model;
      const processor = transcriber.processor;
      const gc = model.generation_config;
      if (!gc?.is_multilingual || !gc.lang_to_id) return 'en';

      const processed = await processor(audioSlice);
      const inputFeatures = processed.input_features;

      const startId = gc.decoder_start_token_id;
      const initTokens = [startId]; // only start — next token generated is the language token

      const out = await model.generate({
        inputs: inputFeatures,
        decoder_input_ids: initTokens,
        max_new_tokens: 1,
        return_timestamps: false,
      });

      const sequences = out.sequences?.tolist ? out.sequences.tolist() : (Array.isArray(out.sequences) ? out.sequences : [out[0]?.tolist?.() ?? out[0]]);
      const seq = Array.isArray(sequences[0]) ? sequences[0] : sequences;
      const langTokenId = seq?.length ? seq[seq.length - 1] : null;
      if (langTokenId == null) return 'en';

      const idToLang = Object.fromEntries(Object.entries(gc.lang_to_id).map(([k, v]) => [v, k]));
      const token = idToLang[langTokenId];
      if (!token || typeof token !== 'string') return 'en';
      const code = token.replace(/^\<\|/, '').replace(/\|\>$/, '');
      console.log('[transcribe] Detected language:', code);
      return code;
    }

    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath, path.extname(videoPath));
    const rawPath = path.join(dir, base + '_whisper_audio.raw');

    try {
      await extractAudioToRaw(videoPath, rawPath);
      const audio = loadRawF32(rawPath);

      if (app.isPackaged) {
        const Module = require('module');
        const originalResolve = Module._resolveFilename;
        Module._resolveFilename = function(request, ...args) {
          if (request.includes('sharp') || request.includes('@img')) {
            const patched = request.replace('app.asar', 'app.asar.unpacked');
            console.log('[transcribe] Patching module path:', request, '->', patched);
            request = patched;
          }
          return originalResolve.call(this, request, ...args);
        };
      }

      console.log('[transcribe] Loading @huggingface/transformers...');
      const transformers = require('@huggingface/transformers');
      console.log('[transcribe] Transformers loaded OK');

      const cacheDir = path.join(app.getPath('userData'), 'transformers-cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      transformers.env.cacheDir = cacheDir;

      console.log('[transcribe] Loading pipeline...');
      console.log('[transcribe] Model:', WHISPER_MODEL);
      const transcriber = await transformers.pipeline('automatic-speech-recognition', WHISPER_MODEL);
      console.log('[transcribe] Pipeline loaded OK');

      // task: 'transcribe' = output in source language (e.g. French). 'translate' would output English only.
      const opts = {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        task: 'transcribe',
      };
      let language = WHISPER_LANGUAGE;

      if (language == null) {
        console.log('[transcribe] Language: auto-detect (window =', WHISPER_DETECT_SEC, 's)');
        try {
          const detectSamples = Math.min(audio.length, WHISPER_DETECT_SEC * SAMPLE_RATE);
          const detectSlice = audio.slice(0, detectSamples);
          language = await detectWhisperLanguage(transcriber, detectSlice, SAMPLE_RATE);
          console.log('[transcribe] Detected:', language);
        } catch (err) {
          console.warn('[transcribe] Language detection failed, defaulting to en:', err?.message ?? err);
          language = 'en';
        }
      } else {
        console.log('[transcribe] Language: fixed =', language);
      }

      opts.language = language;
      const output = await transcriber(audio, opts);
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
