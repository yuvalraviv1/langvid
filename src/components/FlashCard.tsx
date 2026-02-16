import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import type { SavedItem } from '../types';

interface Props {
  item: SavedItem;
  onDelete: (id: string) => void;
}

export default function FlashCard({ item, onDelete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<ReactPlayer>(null!);

  // Stop playback when clip end is reached
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      if (playerRef.current) {
        const current = playerRef.current.getCurrentTime();
        if (current >= item.endTime) {
          setPlaying(false);
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [playing, item.endTime]);

  function handlePlayClip() {
    if (playerRef.current) {
      playerRef.current.seekTo(item.startTime, 'seconds');
    }
    setPlaying(true);
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* Mini video player */}
      <div className="aspect-video bg-black relative">
        <ReactPlayer
          ref={playerRef}
          url={item.videoSource}
          playing={playing}
          width="100%"
          height="100%"
          onReady={() => {
            playerRef.current?.seekTo(item.startTime, 'seconds');
          }}
        />
        {!playing && (
          <button
            onClick={handlePlayClip}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
          >
            <span className="text-white text-4xl">&#9654;</span>
          </button>
        )}
      </div>

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
