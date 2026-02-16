import { useState, useEffect } from 'react';
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

  useEffect(() => {
    setSavedCount(getSavedItems().length);
  }, [page]);

  function handleStart(config: VideoConfig) {
    setVideoConfig(config);
    setPage('player');
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
          onClick={() => setPage('review')}
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
        <PlayerPage config={videoConfig} onBack={() => setPage('setup')} />
      )}
      {page === 'review' && <ReviewPage />}
    </div>
  );
}

export default App;
