import { useState, useCallback } from 'react';
import { useDJStore } from '../stores/djStore';
import { Button } from '@/components/ui/button';

interface LyricsPanelCompactProps {
  className?: string;
}

/**
 * LyricsPanelCompact - Compact lyrics panel for side placement
 */
export function LyricsPanelCompact({ className = '' }: LyricsPanelCompactProps) {
  const deckA = useDJStore((state) => state.deckA);
  const deckB = useDJStore((state) => state.deckB);
  const updateDeckA = useDJStore((state) => state.updateDeckA);
  const updateDeckB = useDJStore((state) => state.updateDeckB);

  const [activeDeck, setActiveDeck] = useState<'A' | 'B'>('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const currentDeck = activeDeck === 'A' ? deckA : deckB;
  const updateCurrentDeck = activeDeck === 'A' ? updateDeckA : updateDeckB;

  const fetchLyrics = useCallback(async () => {
    const artist = currentDeck.artist.trim();
    const title = currentDeck.title.trim();

    if (!artist || !title) {
      setError('Enter artist & title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      );

      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Not found' : `Error ${response.status}`);
      }

      const data = await response.json();
      if (data.lyrics) {
        updateCurrentDeck({ lyrics: data.lyrics });
        setManualMode(false);
      } else {
        throw new Error('No lyrics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  }, [currentDeck.artist, currentDeck.title, updateCurrentDeck]);

  const handleLyricsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCurrentDeck({ lyrics: e.target.value });
  };

  return (
    <div className={`flex flex-col bg-neutral-900/95 border border-neutral-700/50 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-black/30 border-b border-neutral-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Lyrics</span>
          </div>
          <div className="flex gap-1 p-0.5 bg-neutral-800/50 rounded-md">
            <Button
              variant="ghost"
              onClick={() => setActiveDeck('A')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                activeDeck === 'A'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-600'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              A
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveDeck('B')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                activeDeck === 'B'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-600'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              B
            </Button>
          </div>
        </div>

        {/* Artist/Title display */}
        <div className="text-sm text-neutral-300 truncate font-medium">
          {currentDeck.artist && currentDeck.title
            ? `${currentDeck.artist} - ${currentDeck.title}`
            : 'No track loaded'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-b border-neutral-700/50">
        <Button
          onClick={fetchLyrics}
          disabled={loading}
          className="flex-1 py-2 text-xs bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 text-white font-semibold shadow-lg shadow-red-600/20 disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </span>
          ) : 'FETCH LYRICS'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setManualMode(!manualMode)}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            manualMode
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 hover:bg-amber-600'
              : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 border border-neutral-700/50'
          }`}
        >
          {manualMode ? 'SAVE' : 'EDIT'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-3 px-3 py-2 text-xs text-red-300 bg-red-900/30 border border-red-700/30 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Lyrics content */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {manualMode ? (
          <textarea
            placeholder="Paste or type lyrics here..."
            value={currentDeck.lyrics}
            onChange={handleLyricsChange}
            className="w-full h-full p-4 bg-transparent text-neutral-300 text-sm resize-none focus:outline-none leading-relaxed"
          />
        ) : currentDeck.lyrics ? (
          <div className="p-4">
            <pre className="text-neutral-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {currentDeck.lyrics}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-6 text-center">
            <svg className="w-10 h-10 mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">No lyrics loaded</span>
            <span className="text-xs text-neutral-600 mt-1">Click FETCH or EDIT to add lyrics</span>
          </div>
        )}
      </div>
    </div>
  );
}
