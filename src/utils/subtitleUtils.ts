/**
 * Subtitle cue: start/end in seconds for sync; text for display/edit.
 */
export interface SubtitleCue {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

function parseTimecode(timeStr: string): number {
  const normalized = timeStr.trim().replace(',', '.');
  const [clockPart, msPart = '0'] = normalized.split('.');
  const pieces = clockPart.split(':').map((p) => Number(p));
  if (pieces.some((n) => Number.isNaN(n))) return 0;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (pieces.length === 3) {
    [hours, minutes, seconds] = pieces;
  } else if (pieces.length === 2) {
    [minutes, seconds] = pieces;
  } else {
    return 0;
  }

  const parsedMs = Number(msPart.slice(0, 3).padEnd(3, '0'));
  const milliseconds = Number.isNaN(parsedMs) ? 0 : parsedMs;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/** Parse SRT timestamp (00:00:00,000) to seconds. */
function parseSrtTime(timeStr: string): number {
  return parseTimecode(timeStr);
}

/** Parse VTT timestamp (00:00:00.000) to seconds. */
function parseVttTime(timeStr: string): number {
  return parseTimecode(timeStr);
}

function normalizeSeconds(seconds: number): { h: number; m: number; s: number; ms: number } {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  let totalMs = Math.round(safeSeconds * 1000);

  const h = Math.floor(totalMs / 3600000);
  totalMs -= h * 3600000;
  const m = Math.floor(totalMs / 60000);
  totalMs -= m * 60000;
  const s = Math.floor(totalMs / 1000);
  totalMs -= s * 1000;

  return { h, m, s, ms: totalMs };
}

/** Format seconds to SRT timestamp 00:00:00,000 */
export function secondsToSrtTime(seconds: number): string {
  const { h, m, s, ms } = normalizeSeconds(seconds);
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0');
}

/** Format seconds to VTT timestamp 00:00:00.000 */
export function secondsToVttTime(seconds: number): string {
  const { h, m, s, ms } = normalizeSeconds(seconds);
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':') + '.' + String(ms).padStart(3, '0');
}

const TIMECODE_PATTERN = '(?:\\d{1,3}:)?\\d{2}:\\d{2}[,.]\\d{1,3}';
const SRT_TIMECODE = new RegExp(`^(${TIMECODE_PATTERN})\\s*-->\\s*(${TIMECODE_PATTERN})`);
const VTT_TIMECODE = new RegExp(`^(${TIMECODE_PATTERN})\\s*-->\\s*(${TIMECODE_PATTERN})`);

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
