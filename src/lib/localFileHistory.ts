interface LocalSelectionRecord {
  video: FileSystemFileHandle;
  sourceSrt: FileSystemFileHandle;
  targetSrt: FileSystemFileHandle;
}

interface LocalSelectionFiles {
  videoFile: File;
  sourceSrtFile: File;
  targetSrtFile: File;
}

const DB_NAME = 'langvid-local-history';
const DB_VERSION = 1;
const STORE_NAME = 'local-selections';

export function supportsLocalFileHistory(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    typeof indexedDB !== 'undefined'
  );
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord(key: string, record: LocalSelectionRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put(record, key);
  });
  db.close();
}

async function getRecord(key: string): Promise<LocalSelectionRecord | null> {
  const db = await openDb();
  const record = await new Promise<LocalSelectionRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () =>
      resolve((request.result as LocalSelectionRecord | undefined) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record;
}

async function ensureReadPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const current = await handle.queryPermission({ mode: 'read' });
  if (current === 'granted') return true;
  const requested = await handle.requestPermission({ mode: 'read' });
  return requested === 'granted';
}

export async function saveLocalSelection(
  key: string,
  handles: LocalSelectionRecord
): Promise<void> {
  if (!supportsLocalFileHistory()) return;
  await putRecord(key, handles);
}

export async function loadLocalSelectionFiles(
  key: string
): Promise<LocalSelectionFiles | null> {
  if (!supportsLocalFileHistory()) return null;
  const record = await getRecord(key);
  if (!record) return null;

  const hasPermission = await Promise.all([
    ensureReadPermission(record.video),
    ensureReadPermission(record.sourceSrt),
    ensureReadPermission(record.targetSrt),
  ]);
  if (hasPermission.some((value) => !value)) return null;

  try {
    const [videoFile, sourceSrtFile, targetSrtFile] = await Promise.all([
      record.video.getFile(),
      record.sourceSrt.getFile(),
      record.targetSrt.getFile(),
    ]);
    return { videoFile, sourceSrtFile, targetSrtFile };
  } catch {
    return null;
  }
}

interface PickedFile {
  file: File;
  handle: FileSystemFileHandle;
}

type PickedVideoFile = PickedFile;
type PickedSubtitleFile = PickedFile;

export async function pickVideoFile(): Promise<PickedVideoFile | null> {
  if (!supportsLocalFileHistory()) return null;

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'Video files',
          accept: {
            'video/*': ['.mp4', '.mkv', '.mov', '.avi', '.webm'],
          },
        },
      ],
    });
    const file = await handle.getFile();
    return { file, handle };
  } catch {
    return null;
  }
}

export async function pickSubtitleFile(): Promise<PickedSubtitleFile | null> {
  if (!supportsLocalFileHistory()) return null;

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'SubRip subtitles',
          accept: {
            'application/x-subrip': ['.srt'],
            'text/plain': ['.srt'],
          },
        },
      ],
    });
    const file = await handle.getFile();
    return { file, handle };
  } catch {
    return null;
  }
}
