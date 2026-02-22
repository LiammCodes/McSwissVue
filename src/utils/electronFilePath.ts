/**
 * Get filesystem path for a File in the Electron renderer.
 * Electron 33+ removed the File.path property; use webUtils.getPathForFile instead.
 */
export function getFilePath(file: File): string {
  const f = file as File & { path?: string };
  if (f.path) return f.path;
  try {
    const electron = require('electron');
    if (electron.webUtils?.getPathForFile) return electron.webUtils.getPathForFile(file);
  } catch (_) {}
  return '';
}
