import { useRef, useCallback, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';

interface Props {
  url: string;
  onTimeUpdate: (time: number) => void;
  seekTo?: number | null;
  onReady?: () => void;
}

export default function VideoPlayer({ url, onTimeUpdate, seekTo, onReady }: Props) {
  const playerRef = useRef<ReactPlayer>(null!);
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef<number>(0);

  const handleReady = useCallback(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    // Poll current time while playing
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current) {
        onTimeUpdate(playerRef.current.getCurrentTime());
      }
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [onTimeUpdate]);

  useEffect(() => {
    if (seekTo != null && playerRef.current) {
      playerRef.current.seekTo(seekTo, 'seconds');
    }
  }, [seekTo]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        controls
        width="100%"
        height="100%"
        onReady={handleReady}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
