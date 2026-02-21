import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import type { SavedItem } from '../types';
import {
  loadLocalVideoFile,
  parseLocalVideoSource,
  supportsLocalFileHistory,
} from '../lib/localFileHistory';

interface Props {
  item: SavedItem;
  onDelete: (id: string) => void;
}

export default function FlashCard({ item, onDelete }: Props) {
  const localVideoKey = parseLocalVideoSource(item.videoSource);
  const isLegacyLocalBlob = item.videoSource.startsWith('blob:');
  const canResolveLocalFiles = supportsLocalFileHistory();

  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [resolvingVideo, setResolvingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [resolvedVideoSource, setResolvedVideoSource] = useState(
    localVideoKey ? '' : item.videoSource
  );
  const playerRef = useRef<ReactPlayer>(null!);
  const generatedLocalVideoUrlRef = useRef<string | null>(null);
  const stopGuardArmedRef = useRef(false);
  const pendingPlayAfterReadyRef = useRef(false);
  const pendingPlayAfterSeekRef = useRef(false);

  useEffect(() => {
    stopGuardArmedRef.current = false;
    setPlaying(false);
    setVideoError('');
  }, [item.id, item.startTime, item.endTime]);

  useEffect(() => {
    return () => {
      const generatedUrl = generatedLocalVideoUrlRef.current;
      if (generatedUrl) {
        URL.revokeObjectURL(generatedUrl);
      }
    };
  }, []);

  async function resolveLocalVideoSource() {
    if (!localVideoKey || resolvedVideoSource) return resolvedVideoSource;

    if (!canResolveLocalFiles) {
      setVideoError(
        'Cannot reopen local clips automatically in this browser. Save this clip again after opening the local movie.'
      );
      return '';
    }

    setResolvingVideo(true);
    setVideoError('');
    try {
      const videoFile = await loadLocalVideoFile(localVideoKey);
      if (!videoFile) {
        setVideoError(
          'Could not access the local video for this clip. Open the movie again from Local File and save the clip once more.'
        );
        return '';
      }

      const nextUrl = URL.createObjectURL(videoFile);
      const previousUrl = generatedLocalVideoUrlRef.current;
      if (previousUrl && previousUrl !== nextUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      generatedLocalVideoUrlRef.current = nextUrl;
      setResolvedVideoSource(nextUrl);
      return nextUrl;
    } finally {
      setResolvingVideo(false);
    }
  }

  async function handlePlayClip() {
    setVideoError('');
    stopGuardArmedRef.current = false;

    if (localVideoKey && !resolvedVideoSource) {
      // Source not yet loaded — resolve it first. The player will reload with the
      // new URL, so defer seek + play to onReady to avoid starting from frame 0.
      pendingPlayAfterReadyRef.current = true;
      const resolvedSource = await resolveLocalVideoSource();
      if (!resolvedSource) {
        pendingPlayAfterReadyRef.current = false;
      }
      return;
    }

    if (playerRef.current) {
      playerRef.current.seekTo(item.startTime, 'seconds');
    }
    setPlaying(true);
  }

  function handleProgress(progress: { playedSeconds: number }) {
    if (!playing) return;
    const current = progress.playedSeconds;

    // Ignore stale current-time values until seek reaches the selected clip window.
    if (!stopGuardArmedRef.current) {
      const tolerance = 0.5;
      const enteredWindow =
        current >= Math.max(0, item.startTime - tolerance) &&
        current <= item.endTime + tolerance;
      if (!enteredWindow) return;
      stopGuardArmedRef.current = true;
    }

    if (current >= item.endTime) {
      setPlaying(false);
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* Mini video player */}
      <div className="aspect-video bg-black relative">
        <ReactPlayer
          ref={playerRef}
          url={resolvedVideoSource || undefined}
          playing={playing}
          progressInterval={100}
          width="100%"
          height="100%"
          onReady={() => {
            stopGuardArmedRef.current = false;
            if (pendingPlayAfterReadyRef.current) {
              pendingPlayAfterReadyRef.current = false;
              // Seek first; onSeek will start playback once the seek lands.
              pendingPlayAfterSeekRef.current = true;
              playerRef.current?.seekTo(item.startTime, 'seconds');
            }
          }}
          onSeek={() => {
            if (pendingPlayAfterSeekRef.current) {
              pendingPlayAfterSeekRef.current = false;
              setPlaying(true);
            }
          }}
          onProgress={handleProgress}
          onEnded={() => {
            setPlaying(false);
          }}
          onError={() => {
            setPlaying(false);
            if (localVideoKey) {
              setVideoError(
                'Playback failed for this local clip. Open the movie again from Local File and save the clip once more.'
              );
              return;
            }
            if (isLegacyLocalBlob) {
              setVideoError(
                'This clip references an expired local URL. Open the movie again from Local File and save the clip once more.'
              );
              return;
            }
            setVideoError('Playback failed for this clip.');
          }}
        />
        {!playing && (
          <button
            onClick={() => {
              void handlePlayClip();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
            disabled={resolvingVideo}
          >
            <span className="text-white text-4xl">
              {resolvingVideo ? '...' : '\u25B6'}
            </span>
          </button>
        )}
      </div>
      {videoError && (
        <p className="px-4 py-2 text-xs text-red-300 bg-red-900/30 border-t border-red-900/50">
          {videoError}
        </p>
      )}

      <div className="p-4">
        {/* Word / sentence in source language */}
        <p className="text-yellow-300 text-lg font-semibold">
          {item.word || item.sentence}
        </p>
        {item.word && (
          <p className="text-gray-400 text-sm mt-1">{item.sentence}</p>
        )}

        {/* Translation (click to reveal) */}
        <div className="mt-3">
          {revealed ? (
            <p className="text-green-400">{item.translation}</p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Show translation
            </button>
          )}
        </div>

        <div className="mt-3 flex justify-between items-center">
          <span className="text-gray-600 text-xs">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
          <button
            onClick={() => onDelete(item.id)}
            className="text-red-500 hover:text-red-400 text-xs"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
