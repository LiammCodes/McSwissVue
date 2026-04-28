import path from 'path';
import fs from 'fs';
import { FileData } from '../types/Types';

/** Converts a timestamp (HH:MM:SS or H:MM:SS.ff) to total seconds. */
export function getSeconds(time: string | null | undefined): number {
  if (time) {
    // Split the input string into hours, minutes, and seconds
    let [hours, minutes, seconds] = time.split(":").map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
  } else {
    return 0;
  }
}

export function parseFfmpegConvertProgress(data: string, duration: string): number {
  if (!data) return 0;
  const pattern = /time=(\d{2}):(\d{2}):(\d{2})\.(\d+)/;
  const match = pattern.exec(data);
  if (!match) return 0;
  const outSec = getSeconds(`${match[1]}:${match[2]}:${match[3]}.${match[4]}`);
  const durSec = getSeconds(duration);
  if (!Number.isFinite(durSec) || durSec <= 0) return 0;
  return (outSec / durSec) * 100;
}

/** Returns progress percent (0–100). */
export function parseFFmpegProgress(data: string, startTime: string, endTime: string, pattern: RegExp): number {
  const outTime = parseOutTime(data, pattern);
  const duration = getSeconds(endTime) - getSeconds(startTime);
  return duration > 0 && outTime ? (getSeconds(outTime) / duration) * 100 : 0;
}

export function parseOutTime(output: string, pattern: RegExp): string | null {
  if (!output) return null;
  const match = pattern.exec(output);
  return match ? match[1] : null;
}

export function removeExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex === -1 ? filename : filename.slice(0, dotIndex);
}

export function fileAlreadyExists(filepath: string): boolean {
  return fs.existsSync(filepath);
}

export interface WithDuration {
  duration: string;
}

export function getShortestVideoDuration(fileObjects: WithDuration[]): number | null {
  if (fileObjects.length === 0) return null;
  return Math.min(...fileObjects.map((obj) => getSeconds(obj.duration)));
}

export function metaDataMissing(selectedFile: FileData): boolean {
  return !selectedFile.bitrate || !selectedFile.duration || !selectedFile.thumbnailPath;
}

export { getTitlebarColor } from '../constants';
