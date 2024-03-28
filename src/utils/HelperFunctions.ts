import path from 'path';
import fs from 'fs';
import { FileData } from '../types/Types';

// breaks down time stamp into total number of seconds
export function getSeconds(time: string | null){
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
  if (data) {
    const pattern = /time=(\d{2}):(\d{2}):(\d{2}).(\d{2})/;
    console.log(typeof pattern)
    const match = RegExp(pattern).exec(data);
    if (match) {
      console.log(match[1] + " / " + getSeconds(duration))
      return (getSeconds(match[1]) / getSeconds(duration)) * 100;
    } else {
      return 0;
    }
  } else {
    return 0
  }
  
}

// returns progress percent
export function parseFFmpegProgress(data: string, startTime: string, endTime: string, pattern: RegExp): number {
  console.log((getSeconds(parseOutTime(data, pattern))) + " / " + (getSeconds(endTime) - getSeconds(startTime)))
  return (getSeconds(parseOutTime(data, pattern)) / (getSeconds(endTime) - getSeconds(startTime))) * 100;
}

export function parseOutTime(output: string, pattern: RegExp): string | null {
  if (output) {
    const match = RegExp(pattern).exec(output);
    return match ? match[1] : null;  
  } else {
    return null
  }
}

export function removeExtension(filename: string) {
  // Split the filename into base name and extension
  const dotIndex = filename.lastIndexOf('.');
  const baseName = filename.slice(0, dotIndex);

  return baseName;
}

export function fileAlreadyExists(fileName: string, outputFilePath: string, fileExtension: string): boolean {
  const newFile = path.join(outputFilePath, (fileName + fileExtension))
  if (fs.existsSync(newFile)) {
    return true;
  } else {
    return false;
  }
}

export function getShortestVideoDuration(fileObjects: object[]) {
  let shortestDuration = null as null | number;
  fileObjects.forEach((fileObj: any) => {
    if (shortestDuration === null || getSeconds(fileObj.duration) < shortestDuration) {
      shortestDuration = getSeconds(fileObj.duration);
    } 
  })
  return shortestDuration;
}

export function metaDataMissing(selectedFile: FileData): boolean {
  if (selectedFile.bitrate == '' || selectedFile.duration == '' || selectedFile.thumbnailPath == '') {
    return true;
  } else {
    return false;
  }
}
