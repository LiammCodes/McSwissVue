export type Tool = 'Preview Generator' | 'Segment Generator' | 'Thumbnail Generator' | 'Hyper Thumbnail Generator' | 'Transcript Generator' | 'Video Converter';

export type Toast = {
  message: string,
  kind: string,
  timeout: number
}