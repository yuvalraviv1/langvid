import express from 'express';
import {
  deleteWord,
  listRecentMovies,
  listSavedWords,
  saveRecentMovie,
  saveWord,
} from './db.ts';

const app = express();
const PORT = 3001;

const API_BASE = 'https://www.youtube.com/youtubei/v1';
const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

// Android client bypasses many playability restrictions
const ANDROID_CONTEXT = {
  client: {
    hl: 'en',
    gl: 'US',
    clientName: 'ANDROID',
    clientVersion: '19.35.36',
    androidSdkVersion: 30,
    userAgent: 'com.google.android.youtube/19.35.36(Linux; U; Android 11) gzip',
  },
};

app.use(express.json());

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

async function fetchPlayerData(videoID: string) {
  const payload = {
    context: ANDROID_CONTEXT,
    videoId: videoID,
    racyCheckOk: true,
    contentCheckOk: true,
  };

  const res = await fetch(`${API_BASE}/player?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ANDROID_CONTEXT.client.userAgent,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Player API failed: ${res.status}`);
  return res.json();
}

async function fetchCaptionXml(baseUrl: string, videoID: string): Promise<string> {
  const res = await fetch(baseUrl, {
    headers: {
      'User-Agent': ANDROID_CONTEXT.client.userAgent,
      Referer: `https://www.youtube.com/watch?v=${videoID}`,
    },
  });
  if (!res.ok) throw new Error(`Caption fetch failed: ${res.status}`);
  return res.text();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/<[^>]+>/g, '')
    .trim();
}

function parseXmlCaptions(xml: string) {
  const cues: { startTime: number; endTime: number; text: string }[] = [];

  // Timedtext format 3: <p t="ms" d="ms">text</p>
  const format3Regex = /<p\s[^>]*\bt="(\d+)"[^>]*\bd="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  let found = false;
  while ((match = format3Regex.exec(xml)) !== null) {
    found = true;
    const startTime = parseInt(match[1]) / 1000;
    const dur = parseInt(match[2]) / 1000;
    const text = decodeHtmlEntities(match[3]).replace(/\n+/g, ' ');
    if (text) cues.push({ startTime, endTime: startTime + dur, text });
  }

  // Older format: <text start="s" dur="s">text</text>
  if (!found) {
    const format1Regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = format1Regex.exec(xml)) !== null) {
      const startTime = parseFloat(match[1]);
      const dur = parseFloat(match[2]);
      const text = decodeHtmlEntities(match[3]).replace(/\n+/g, ' ');
      if (text) cues.push({ startTime, endTime: startTime + dur, text });
    }
  }

  return cues;
}

function extractVideoID(urlOrId: string): string {
  try {
    const url = new URL(urlOrId);
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') || urlOrId;
    }
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }
  } catch {
    // Not a URL, use as-is
  }
  return urlOrId;
}

app.get('/api/memorize', (_req, res) => {
  res.json({ items: listSavedWords() });
});

app.post('/api/memorize', (req, res) => {
  const body: unknown = req.body;
  if (
    !body ||
    typeof body !== 'object' ||
    !('id' in body) ||
    !('word' in body) ||
    !('sentence' in body) ||
    !('translation' in body) ||
    !('videoSource' in body) ||
    !('startTime' in body) ||
    !('endTime' in body)
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const payload = body as Record<string, unknown>;
  const startTime = Number(payload.startTime);
  const endTime = Number(payload.endTime);
  const rawCreatedAt = Number(payload.createdAt);
  const createdAt =
    Number.isFinite(rawCreatedAt) && rawCreatedAt > 0
      ? rawCreatedAt
      : Date.now();

  if (
    !isString(payload.id) ||
    !isString(payload.word) ||
    !isString(payload.sentence) ||
    !isString(payload.translation) ||
    !isString(payload.videoSource) ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime)
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  saveWord({
    id: payload.id,
    word: payload.word,
    sentence: payload.sentence,
    translation: payload.translation,
    videoSource: payload.videoSource,
    startTime,
    endTime,
    createdAt,
  });
  res.status(201).json({ ok: true });
});

app.delete('/api/memorize/:id', (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'id is required' });
    return;
  }

  deleteWord(id);
  res.json({ ok: true });
});

app.get('/api/history/movies', (req, res) => {
  const rawLimit = req.query.limit;
  const parsedLimit = Number(rawLimit);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 8;
  res.json({ movies: listRecentMovies(limit) });
});

app.post('/api/history/movies', (req, res) => {
  const body: unknown = req.body;
  if (
    !body ||
    typeof body !== 'object' ||
    !('source' in body) ||
    !('videoUrl' in body) ||
    !('sourceLang' in body) ||
    !('targetLang' in body)
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const payload = body as Record<string, unknown>;
  if (
    (payload.source !== 'youtube' && payload.source !== 'local') ||
    !isString(payload.videoUrl) ||
    !isString(payload.sourceLang) ||
    !isString(payload.targetLang)
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  saveRecentMovie({
    source: payload.source,
    videoUrl: payload.videoUrl,
    sourceLang: payload.sourceLang,
    targetLang: payload.targetLang,
    label: isString(payload.label) ? payload.label : '',
  });

  res.status(201).json({ ok: true });
});

// GET /api/captions/languages?videoId=...
app.get('/api/captions/languages', async (req, res) => {
  const videoId = extractVideoID(req.query.videoId as string);
  if (!videoId) {
    res.status(400).json({ error: 'videoId is required' });
    return;
  }

  try {
    const data = await fetchPlayerData(videoId);
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || !Array.isArray(tracks)) {
      res.json({ languages: [] });
      return;
    }

    const languages = tracks.map(
      (t: { languageCode: string; name?: { simpleText?: string; runs?: { text: string }[] }; kind?: string }) => ({
        lang: t.languageCode,
        name: t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode,
        isAutoGenerated: t.kind === 'asr',
      })
    );
    res.json({ languages });
  } catch (err) {
    console.error('Failed to fetch caption languages:', err);
    res.status(500).json({ error: 'Failed to fetch caption languages' });
  }
});

// GET /api/captions?videoId=...&lang=en
app.get('/api/captions', async (req, res) => {
  const videoId = extractVideoID(req.query.videoId as string);
  const lang = (req.query.lang as string) || 'en';

  if (!videoId) {
    res.status(400).json({ error: 'videoId is required' });
    return;
  }

  try {
    const data = await fetchPlayerData(videoId);
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || !Array.isArray(tracks)) {
      res.json({ cues: [] });
      return;
    }

    // Find the matching track (prefer exact match, then prefix match, fallback to first)
    const track =
      tracks.find((t: { languageCode: string; kind?: string }) => t.languageCode === lang && t.kind !== 'asr') ||
      tracks.find((t: { languageCode: string }) => t.languageCode === lang) ||
      tracks.find((t: { languageCode: string }) => t.languageCode.startsWith(lang)) ||
      tracks[0];

    if (!track?.baseUrl) {
      res.json({ cues: [] });
      return;
    }

    // Strip fmt=srv3 to force XML response instead of binary protobuf
    const xmlUrl = track.baseUrl.replace(/&fmt=srv3/, '').replace(/&fmt=srv[12]/, '');
    const xml = await fetchCaptionXml(xmlUrl, videoId);
    const cues = parseXmlCaptions(xml);
    res.json({ cues });
  } catch (err) {
    console.error('Failed to fetch captions:', err);
    res.status(500).json({ error: 'Failed to fetch captions' });
  }
});

app.listen(PORT, () => {
  console.log(`Caption server running on http://localhost:${PORT}`);
});
