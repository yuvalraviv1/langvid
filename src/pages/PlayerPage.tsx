import { useState, useCallback } from 'react';
import type { VideoConfig } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import SubtitleOverlay from '../components/SubtitleOverlay';

interface Props {
  config: VideoConfig;
  onBack: () => void;
}

export default function PlayerPage({ config, onBack }: Props) {
  const [currentTime, setCurrentTime] = useState(0);
  const [toast, setToast] = useState('');

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  function handleSaved() {
    setToast('Saved!');
    setTimeout(() => setToast(''), 1500);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm"
        >
          &larr; Back
        </button>
        <span className="text-gray-500 text-xs">
          {config.sourceLang} / {config.targetLang}
        </span>
      </div>

      <div className="relative">
        <VideoPlayer url={config.videoUrl} onTimeUpdate={handleTimeUpdate} />
        <SubtitleOverlay
          currentTime={currentTime}
          sourceCues={config.sourceLangCues}
          targetCues={config.targetLangCues}
          videoSource={config.videoUrl}
          onSaved={handleSaved}
        />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
