import { useState, useCallback } from 'react';
import { useDJStore } from '../stores/djStore';
import { useYouTubeMetadata, extractVideoId } from '../hooks/useYouTubeMetadata';
import { applyCurve } from '../utils/crossfaderCurve';

interface DeckControlsProps {
  deck: 'A' | 'B';
  className?: string;
}

/**
 * DeckControls component - UI for a single deck
 *
 * Features:
 * - YouTube video ID input with URL support
 * - Auto-fetch video metadata (artist/title)
 * - Editable artist/title fields
 * - Play/pause button
 * - Volume meter showing crossfader-derived volume
 */
export function DeckControls({ deck, className = '' }: DeckControlsProps) {
  const [inputValue, setInputValue] = useState('');

  // Store selectors based on deck
  const deckState = useDJStore((state) => (deck === 'A' ? state.deckA : state.deckB));
  const updateDeck = useDJStore((state) =>
    deck === 'A' ? state.updateDeckA : state.updateDeckB
  );
  const togglePlay = useDJStore((state) =>
    deck === 'A' ? state.toggleDeckAPlay : state.toggleDeckBPlay
  );
  const crossfaderValue = useDJStore((state) => state.crossfaderValue);
  const crossfaderCurve = useDJStore((state) => state.crossfaderCurve);

  // YouTube metadata fetcher
  const { fetchMetadata, loading: metadataLoading } = useYouTubeMetadata();

  // Calculate current volume for this deck
  const mixValues = applyCurve(crossfaderValue, crossfaderCurve);
  const currentVolume = deck === 'A' ? mixValues.deckAVolume : mixValues.deckBVolume;

  /**
   * Handle loading a new video
   */
  const handleLoadVideo = useCallback(async () => {
    const videoId = extractVideoId(inputValue.trim());

    if (!videoId) {
      alert('Invalid YouTube URL or Video ID');
      return;
    }

    // Update video ID in store
    updateDeck({ videoId });

    // Fetch metadata
    const metadata = await fetchMetadata(videoId);
    if (metadata) {
      updateDeck({
        artist: metadata.artist,
        title: metadata.title,
      });
    }

    // Clear input
    setInputValue('');
  }, [inputValue, updateDeck, fetchMetadata]);

  /**
   * Handle Enter key in input
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoadVideo();
    }
  };

  // Deck colors
  const bgColor = deck === 'A' ? 'bg-blue-600' : 'bg-red-600';
  const bgColorHover = deck === 'A' ? 'hover:bg-blue-700' : 'hover:bg-red-700';
  const borderColor = deck === 'A' ? 'border-blue-500' : 'border-red-500';
  const textColor = deck === 'A' ? 'text-blue-400' : 'text-red-400';

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Deck header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${textColor}`}>Deck {deck}</h3>
        <div
          className={`w-3 h-3 rounded-full ${
            deckState.playing ? (deck === 'A' ? 'bg-blue-500' : 'bg-red-500') : 'bg-gray-600'
          } ${deckState.playing ? 'animate-pulse' : ''}`}
        />
      </div>

      {/* Video ID input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="YouTube URL or Video ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:${borderColor}`}
        />
        <button
          onClick={handleLoadVideo}
          disabled={metadataLoading || !inputValue.trim()}
          className={`px-4 py-2 ${bgColor} ${bgColorHover} disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors`}
        >
          {metadataLoading ? '...' : 'Load'}
        </button>
      </div>

      {/* Current video info */}
      {deckState.videoId && (
        <div className="mb-4 p-3 bg-gray-900/50 rounded space-y-2">
          <div className="text-xs text-gray-500">
            Video ID: <span className="text-gray-400 font-mono">{deckState.videoId}</span>
          </div>
          <input
            type="text"
            placeholder="Artist"
            value={deckState.artist}
            onChange={(e) => updateDeck({ artist: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none"
          />
          <input
            type="text"
            placeholder="Title"
            value={deckState.title}
            onChange={(e) => updateDeck({ title: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none"
          />
        </div>
      )}

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={!deckState.videoId}
        className={`w-full py-4 ${bgColor} ${bgColorHover} disabled:bg-gray-700 disabled:text-gray-500 text-white text-xl font-bold rounded transition-colors flex items-center justify-center gap-2`}
      >
        {deckState.playing ? (
          <>
            <span>⏸</span> PAUSE
          </>
        ) : (
          <>
            <span>▶</span> PLAY
          </>
        )}
      </button>

      {/* Volume meter */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Volume</span>
          <span>{Math.round(currentVolume * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              deck === 'A' ? 'bg-blue-500' : 'bg-red-500'
            }`}
            style={{ width: `${currentVolume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
