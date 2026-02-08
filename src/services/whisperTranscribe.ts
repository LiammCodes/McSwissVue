/**
 * Transcription runs in the Electron main process via ipc 'transcribe-video'.
 * This file is kept for types only; the implementation lives in electron.cjs.
 */

/** No-op: actual transcription is done in main process. Use ipcRenderer.invoke('transcribe-video', { videoPath }). */
export async function transcribeVideoToVtt(
  _videoPath: string,
  _ffmpegPath: string,
  _options?: { onProgress?: (phase: string) => void }
): Promise<string> {
  throw new Error('Transcription runs in the main process. Use ipcRenderer.invoke("transcribe-video", { videoPath }).');
}
