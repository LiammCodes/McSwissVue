export type View = 'Preview Generator' | 'Segment Generator' | 'Thumbnail Generator' | 'Hyper Thumbnail Generator' | 'Transcript Generator' | 'Video Converter' | 'Settings';

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
  id: number,
  startTime: string,
  endTime: string,
}