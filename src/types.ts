export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

export interface SavedItem {
  id: string;
  word: string;
  sentence: string;
  translation: string;
  videoSource: string;
  startTime: number;
  endTime: number;
  createdAt: number;
}

export interface RecentMovie {
  id: number;
  source: 'youtube' | 'local';
  videoUrl: string;
  sourceLang: string;
  targetLang: string;
  label: string;
  selectedAt: number;
}

export interface VideoConfig {
  source: 'youtube' | 'local';
  videoUrl: string;
  sourceLangCues: SubtitleCue[];
  targetLangCues: SubtitleCue[];
  sourceLang: string;
  targetLang: string;
}
