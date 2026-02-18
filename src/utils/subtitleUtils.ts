/**
 * Subtitle cue: start/end in seconds for sync; text for display/edit.
 */
export interface SubtitleCue {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/** Parse SRT timestamp (00:00:00,000) to seconds. */
function parseSrtTime(timeStr: string): number {
  const [hms, ms] = timeStr.trim().replace(',', '.').split('.');
  const [h, m, sec] = hms.split(':').map(Number);
  const msVal = ms ? parseInt(ms.padEnd(3, '0').slice(0, 3), 10) : 0;
  return (h || 0) * 3600 + (m || 0) * 60 + (sec || 0) + msVal / 1000;
}

/** Parse VTT timestamp (00:00:00.000) to seconds. */
function parseVttTime(timeStr: string): number {
  const [hms, ms] = timeStr.trim().split('.');
  const [h, m, sec] = hms.split(':').map(Number);
  const msVal = ms ? parseInt(ms.slice(0, 3).padEnd(3, '0'), 10) : 0;
  return (h || 0) * 3600 + (m || 0) * 60 + (sec || 0) + msVal / 1000;
}

/** Format seconds to SRT timestamp 00:00:00,000 */
export function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0');
}

/** Format seconds to VTT timestamp 00:00:00.000 */
export function secondsToVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':') + '.' + String(ms).padStart(3, '0');
}

const SRT_TIMECODE = /^(\d{2}:\d{2}:\d{2}[,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,]\d{3})/;
const VTT_TIMECODE = /^(\d{2}:\d{2}:\d{2}[.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.]\d{3})/;

export function parseSrt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    const timeLine = lines.find((l) => SRT_TIMECODE.test(l));
    if (!timeLine) continue;
    const match = timeLine.match(SRT_TIMECODE);
    if (!match) continue;
    const startSeconds = parseSrtTime(match[1]);
    const endSeconds = parseSrtTime(match[2]);
    const text = lines
      .slice(lines.indexOf(timeLine) + 1)
      .join('\n')
      .trim();
    cues.push({
      index: cues.length + 1,
      startSeconds,
      endSeconds,
      text,
    });
  }
  return cues;
}

export function parseVtt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const raw = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const body = raw.startsWith('WEBVTT') ? raw.replace(/^WEBVTT\s*\n?/, '').trim() : raw;
  const blocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    const timeLine = lines.find((l) => VTT_TIMECODE.test(l));
    if (!timeLine) continue;
    const match = timeLine.match(VTT_TIMECODE);
    if (!match) continue;
    const startSeconds = parseVttTime(match[1]);
    const endSeconds = parseVttTime(match[2]);
    const text = lines
      .slice(lines.indexOf(timeLine) + 1)
      .join('\n')
      .trim();
    cues.push({
      index: cues.length + 1,
      startSeconds,
      endSeconds,
      text,
    });
  }
  return cues;
}

export function parseSubtitle(content: string, filename: string): SubtitleCue[] {
  const ext = filename.toLowerCase().slice(-4);
  if (ext === '.vtt') return parseVtt(content);
  if (ext === '.srt') return parseSrt(content);
  if (filename.toLowerCase().endsWith('.vtt')) return parseVtt(content);
  return parseSrt(content);
}

export function serializeSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (c) =>
        `${c.index}\n${secondsToSrtTime(c.startSeconds)} --> ${secondsToSrtTime(c.endSeconds)}\n${c.text}\n`
    )
    .join('\n');
}

export function serializeVtt(cues: SubtitleCue[]): string {
  const header = 'WEBVTT\n\n';
  const body = cues
    .map(
      (c) =>
        `${secondsToVttTime(c.startSeconds)} --> ${secondsToVttTime(c.endSeconds)}\n${c.text}\n`
    )
    .join('\n');
  return header + body;
}

export function serializeSubtitle(cues: SubtitleCue[], filename: string): string {
  if (filename.toLowerCase().endsWith('.vtt')) return serializeVtt(cues);
  return serializeSrt(cues);
}
