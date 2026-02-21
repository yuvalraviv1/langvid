import { useRef, useCallback, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';

interface Props {
  source: 'youtube' | 'local';
  url: string;
  onTimeUpdate: (time: number) => void;
  seekTo?: number | null;
  onReady?: () => void;
  initialTime?: number;
}

export default function VideoPlayer({ source, url, onTimeUpdate, seekTo, onReady, initialTime }: Props) {
  const playerRef = useRef<ReactPlayer>(null!);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef<number>(0);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  const handleReady = useCallback(() => {
    if (initialTime != null && initialTime > 0) {
      if (source === 'local') {
        if (localVideoRef.current) localVideoRef.current.currentTime = initialTime;
      } else {
        playerRef.current?.seekTo(initialTime, 'seconds');
      }
    }
    onReady?.();
  }, [onReady, initialTime, source]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!playing) return;

    // Poll current time for subtitle sync on both playback paths.
    const tick = () => {
      if (source === 'local') {
        const localVideo = localVideoRef.current;
        if (localVideo) {
          onTimeUpdateRef.current(localVideo.currentTime);
        }
        return;
      }
      if (playerRef.current) {
        onTimeUpdateRef.current(playerRef.current.getCurrentTime());
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, 100);

    return () => clearInterval(intervalRef.current);
  }, [source, playing]);

  useEffect(() => {
    if (seekTo == null) return;
    if (source === 'local') {
      if (localVideoRef.current) {
        localVideoRef.current.currentTime = seekTo;
      }
      return;
    }
    if (playerRef.current) {
      playerRef.current.seekTo(seekTo, 'seconds');
    }
  }, [seekTo, source]);

  useEffect(() => {
    if (source !== 'local') return;
    const localVideo = localVideoRef.current;
    if (!localVideo) return;
    if (playing) {
      void localVideo.play().catch(() => {
        // Ignore autoplay promise rejection.
      });
      return;
    }
    localVideo.pause();
  }, [playing, source, url]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {source === 'local' ? (
        <video
          ref={localVideoRef}
          src={url}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="w-full h-full"
          onLoadedMetadata={handleReady}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      ) : (
        <ReactPlayer
          ref={playerRef}
          url={url}
          playing={playing}
          stopOnUnmount
          controls
          width="100%"
          height="100%"
          onReady={handleReady}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}
    </div>
  );
}
