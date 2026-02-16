import type { RecentMovie, SavedItem, VideoConfig } from '../types';

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getSavedItems(): Promise<SavedItem[]> {
  const data = await fetchJson<{ items: SavedItem[] }>('/api/memorize');
  return data.items;
}

export async function saveItem(item: SavedItem): Promise<void> {
  await fetchJson<{ ok: boolean }>('/api/memorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
}

export async function deleteItem(id: string): Promise<void> {
  await fetchJson<{ ok: boolean }>(`/api/memorize/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getRecentMovies(limit = 8): Promise<RecentMovie[]> {
  const data = await fetchJson<{ movies: RecentMovie[] }>(
    `/api/history/movies?limit=${encodeURIComponent(String(limit))}`
  );
  return data.movies;
}

export async function saveRecentMovieSelection(
  config: Pick<VideoConfig, 'source' | 'videoUrl' | 'sourceLang' | 'targetLang'>,
  label = ''
): Promise<void> {
  await fetchJson<{ ok: boolean }>('/api/history/movies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: config.source,
      videoUrl: config.videoUrl,
      sourceLang: config.sourceLang,
      targetLang: config.targetLang,
      label,
    }),
  });
}
