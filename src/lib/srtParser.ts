import type { SubtitleCue } from '../types';

function timeToSeconds(time: string): number {
  // Format: HH:MM:SS,mmm or HH:MM:SS.mmm
  const [hms, ms] = time.replace(',', '.').split('.');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + (parseInt(ms || '0') / 1000);
}

export function parseSRT(srtText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize line endings and split into blocks
  const blocks = srtText.replace(/\r\n/g, '\n').trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    // Line 0: index number (skip)
    // Line 1: timestamps
    const timeLine = lines[1];
    const match = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/
    );
    if (!match) continue;

    const startTime = timeToSeconds(match[1]);
    const endTime = timeToSeconds(match[2]);
    // Lines 2+: subtitle text
    const text = lines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim();

    if (text) {
      cues.push({ startTime, endTime, text });
    }
  }

  return cues;
}
