export type Tool = 'Preview Generator' | 'Segment Generator' | 'Thumbnail Generator' | 'Hyper Thumbnail Generator' | 'Transcript Generator' | 'Video Converter';

export type Toast = {
  message: string,
  kind: string,
  timeout: number
}

export type FileData = {
  bitrate: string,
  duration: string,
  file: null | File,
  thumbnailPath: string
}

export type Segment = {
  name: string,
  startTime: string,
  endTime: string,
}