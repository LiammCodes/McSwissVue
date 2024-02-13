import path from 'path';
import fs from 'fs';

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

// returns progress percent
export function parseFFmpegProgress(data: string, startTime: string, endTime: string): number {
  return (getSeconds(parseOutTime(data)) / (getSeconds(endTime) - getSeconds(startTime))) * 100;
}

export function parseOutTime(output: string): string | null {
  if (output) {
    const pattern = /out_time=(\d+:\d+:\d+\.\d+)/;
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
  const extension = filename.slice(dotIndex);

  return baseName;
}

export function fileAlreadyExists(files: File[], outputFilePath: string, fileExtension: string): boolean {
  for (const file of files) {
    const newFile = path.join(outputFilePath, (removeExtension(file.name) + " Prev" + fileExtension))
    if (fs.existsSync(newFile)) {
      return true;
    }
  }
  return false;
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
