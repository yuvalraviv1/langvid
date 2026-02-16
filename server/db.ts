import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type MovieSource = 'youtube' | 'local';

export interface SavedWordRecord {
  id: string;
  word: string;
  sentence: string;
  translation: string;
  videoSource: string;
  startTime: number;
  endTime: number;
  createdAt: number;
}

export interface RecentMovieRecord {
  id: number;
  source: MovieSource;
  videoUrl: string;
  sourceLang: string;
  targetLang: string;
  label: string;
  selectedAt: number;
}

export interface RecentMovieInput {
  source: MovieSource;
  videoUrl: string;
  sourceLang: string;
  targetLang: string;
  label?: string;
}

const databasePath = path.resolve(process.cwd(), 'server', 'langvid.sqlite');
const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS memorized_words (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    sentence TEXT NOT NULL,
    translation TEXT NOT NULL,
    video_source TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recent_movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL CHECK(source IN ('youtube', 'local')),
    video_url TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    selected_at INTEGER NOT NULL,
    UNIQUE(source, video_url)
  );
`);

const listWordsStatement = db.prepare(`
  SELECT
    id,
    word,
    sentence,
    translation,
    video_source AS videoSource,
    start_time AS startTime,
    end_time AS endTime,
    created_at AS createdAt
  FROM memorized_words
  ORDER BY created_at DESC
`);

const upsertWordStatement = db.prepare(`
  INSERT INTO memorized_words (
    id,
    word,
    sentence,
    translation,
    video_source,
    start_time,
    end_time,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    word = excluded.word,
    sentence = excluded.sentence,
    translation = excluded.translation,
    video_source = excluded.video_source,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    created_at = excluded.created_at
`);

const deleteWordStatement = db.prepare(`
  DELETE FROM memorized_words
  WHERE id = ?
`);

const listRecentMoviesStatement = db.prepare(`
  SELECT
    id,
    source,
    video_url AS videoUrl,
    source_lang AS sourceLang,
    target_lang AS targetLang,
    label,
    selected_at AS selectedAt
  FROM recent_movies
  ORDER BY selected_at DESC
  LIMIT ?
`);

const upsertRecentMovieStatement = db.prepare(`
  INSERT INTO recent_movies (
    source,
    video_url,
    source_lang,
    target_lang,
    label,
    selected_at
  ) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(source, video_url) DO UPDATE SET
    source_lang = excluded.source_lang,
    target_lang = excluded.target_lang,
    label = excluded.label,
    selected_at = excluded.selected_at
`);

export function listSavedWords(): SavedWordRecord[] {
  return listWordsStatement.all() as SavedWordRecord[];
}

export function saveWord(item: SavedWordRecord): void {
  upsertWordStatement.run(
    item.id,
    item.word,
    item.sentence,
    item.translation,
    item.videoSource,
    item.startTime,
    item.endTime,
    item.createdAt
  );
}

export function deleteWord(id: string): void {
  deleteWordStatement.run(id);
}

export function listRecentMovies(limit = 8): RecentMovieRecord[] {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  return listRecentMoviesStatement.all(safeLimit) as RecentMovieRecord[];
}

export function saveRecentMovie(movie: RecentMovieInput): void {
  upsertRecentMovieStatement.run(
    movie.source,
    movie.videoUrl,
    movie.sourceLang,
    movie.targetLang,
    movie.label || '',
    Date.now()
  );
}
