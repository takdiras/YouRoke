import { useState, useCallback } from 'react';
import { useDJStore } from '../stores/djStore';

interface LyricsPanelProps {
  className?: string;
}

/**
 * LyricsPanel component - fetch and display lyrics with manual fallback
 *
 * Features:
 * - Auto-fetch from lyrics.ovh API
 * - Manual artist/title input
 * - Fallback textarea for manual lyrics entry
 * - Collapsible UI
 */
export function LyricsPanel({ className = '' }: LyricsPanelProps) {
  const deckA = useDJStore((state) => state.deckA);
  const deckB = useDJStore((state) => state.deckB);
  const updateDeckA = useDJStore((state) => state.updateDeckA);
  const updateDeckB = useDJStore((state) => state.updateDeckB);

  const [activeDeck, setActiveDeck] = useState<'A' | 'B'>('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get current deck data based on active selection
  const currentDeck = activeDeck === 'A' ? deckA : deckB;
  const updateCurrentDeck = activeDeck === 'A' ? updateDeckA : updateDeckB;

  /**
   * Fetch lyrics from lyrics.ovh API
   */
  const fetchLyrics = useCallback(async () => {
    const artist = currentDeck.artist.trim();
    const title = currentDeck.title.trim();

    if (!artist || !title) {
      setError('Please enter both artist and title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Lyrics not found. Try manual entry.');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.lyrics) {
        updateCurrentDeck({ lyrics: data.lyrics });
        setManualMode(false);
      } else {
        throw new Error('No lyrics in response');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lyrics';
      setError(message);
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  }, [currentDeck.artist, currentDeck.title, updateCurrentDeck]);

  /**
   * Handle artist input change
   */
  const handleArtistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCurrentDeck({ artist: e.target.value });
  };

  /**
   * Handle title input change
   */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCurrentDeck({ title: e.target.value });
  };

  /**
   * Handle manual lyrics input
   */
  const handleLyricsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCurrentDeck({ lyrics: e.target.value });
  };

  if (isCollapsed) {
    return (
      <div className={`bg-gray-800 rounded-lg ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full px-4 py-2 flex items-center justify-between text-gray-300 hover:text-white"
        >
          <span className="font-medium">Lyrics</span>
          <span>▼</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">Lyrics</span>
          {/* Deck selector */}
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setActiveDeck('A')}
              className={`px-2 py-1 text-xs rounded ${
                activeDeck === 'A'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              Deck A
            </button>
            <button
              onClick={() => setActiveDeck('B')}
              className={`px-2 py-1 text-xs rounded ${
                activeDeck === 'B'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              Deck B
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white"
        >
          ▲
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Artist/Title inputs */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Artist"
            value={currentDeck.artist}
            onChange={handleArtistChange}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Title"
            value={currentDeck.title}
            onChange={handleTitleChange}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Fetch button */}
        <div className="flex gap-2">
          <button
            onClick={fetchLyrics}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
          >
            {loading ? 'Fetching...' : 'Fetch Lyrics'}
          </button>
          <button
            onClick={() => setManualMode(!manualMode)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              manualMode
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/30 px-3 py-2 rounded">
            {error}
          </div>
        )}

        {/* Lyrics display/edit area */}
        {manualMode ? (
          <textarea
            placeholder="Paste lyrics here..."
            value={currentDeck.lyrics}
            onChange={handleLyricsChange}
            className="w-full h-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-blue-500"
          />
        ) : currentDeck.lyrics ? (
          <div className="h-48 overflow-y-auto bg-gray-900/50 rounded p-3">
            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {currentDeck.lyrics}
            </pre>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-900/50 rounded text-gray-500 text-sm">
            No lyrics loaded. Fetch from API or enter manually.
          </div>
        )}
      </div>
    </div>
  );
}
