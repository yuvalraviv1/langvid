import { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoConfig } from './types';
import { getSavedItems } from './lib/storage';
import SetupForm from './components/SetupForm';
import PlayerPage from './pages/PlayerPage';
import ReviewPage from './pages/ReviewPage';

type Page = 'setup' | 'player' | 'review';

function App() {
  const [page, setPage] = useState<Page>('setup');
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const playerPositionRef = useRef(0);
  const [lastPlayerState, setLastPlayerState] = useState<{ config: VideoConfig; position: number } | null>(null);
  const [playerInitialTime, setPlayerInitialTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    void getSavedItems()
      .then((items) => {
        if (isMounted) setSavedCount(items.length);
      })
      .catch(() => {
        if (isMounted) setSavedCount(0);
      });
    return () => {
      isMounted = false;
    };
  }, [page]);

  function handleStart(config: VideoConfig) {
    setVideoConfig(config);
    setPlayerInitialTime(undefined);
    setLastPlayerState(null);
    setPage('player');
  }

  const handlePlayerTimeUpdate = useCallback((time: number) => {
    playerPositionRef.current = time;
  }, []);

  function handleGoToReview() {
    if (page === 'player' && videoConfig) {
      setLastPlayerState({ config: videoConfig, position: playerPositionRef.current });
    }
    setPage('review');
  }

  function handleReturnToPlayer() {
    if (lastPlayerState) {
      setVideoConfig(lastPlayerState.config);
      setPlayerInitialTime(lastPlayerState.position);
      setPage('player');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex justify-between items-center">
        <button
          onClick={() => setPage('setup')}
          className="text-lg font-bold text-white hover:text-blue-400 transition-colors"
        >
          LangVid
        </button>
        <button
          onClick={handleGoToReview}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          Review
          {savedCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
              {savedCount}
            </span>
          )}
        </button>
      </nav>

      {/* Pages */}
      {page === 'setup' && <SetupForm onStart={handleStart} />}
      {page === 'player' && videoConfig && (
        <PlayerPage
          config={videoConfig}
          onBack={() => setPage('setup')}
          onTimeUpdate={handlePlayerTimeUpdate}
          initialTime={playerInitialTime}
        />
      )}
      {page === 'review' && (
        <ReviewPage onReturnToPlayer={lastPlayerState ? handleReturnToPlayer : undefined} />
      )}
    </div>
  );
}

export default App;
