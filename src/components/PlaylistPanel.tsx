import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Track {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
}

interface PlaylistPanelProps {
  onLoadToDeckA: (track: Track) => void;
  onLoadToDeckB: (track: Track) => void;
  className?: string;
}

/**
 * PlaylistPanel component - YouTube search and playlist management
 *
 * Features:
 * - YouTube search via local Vite server API (using youtube-sr)
 * - Search results display with thumbnails
 * - Load to Deck A/B buttons
 * - Playlist queue management
 */
export function PlaylistPanel({
  onLoadToDeckA,
  onLoadToDeckB,
  className = '',
}: PlaylistPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'playlist'>('search');

  /**
   * Search YouTube using local API server
   */
  const searchYouTube = async (query: string): Promise<Track[]> => {
    const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  };

  /**
   * Lookup a single video by ID using local API
   */
  const lookupVideoById = async (videoId: string): Promise<Track | null> => {
    try {
      const response = await fetch(`/api/youtube/video?id=${encodeURIComponent(videoId)}`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    } catch {
      return null;
    }
  };

  /**
   * Extract video ID from YouTube URL
   */
  const extractVideoId = (input: string): string | null => {
    // Check if it's already a video ID (11 characters)
    if (/^[\w-]{11}$/.test(input)) {
      return input;
    }
    
    // Try to extract from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([\w-]{11})/,
      /youtube\.com\/shorts\/([\w-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  /**
   * Handle search action
   */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // First, check if input is a YouTube URL or video ID
      const videoId = extractVideoId(searchQuery.trim());
      
      if (videoId) {
        // Direct video lookup
        const track = await lookupVideoById(videoId);
        if (track) {
          setSearchResults([track]);
        } else {
          // Fallback: create basic track with thumbnail
          setSearchResults([{
            id: videoId,
            videoId: videoId,
            title: 'Video (loading...)',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            duration: '--:--',
            channel: 'YouTube',
          }]);
        }
      } else {
        // Regular search
        const tracks = await searchYouTube(searchQuery);
        setSearchResults(tracks);
        
        if (tracks.length === 0) {
          setError('No results found. Try different keywords.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  /**
   * Handle Enter key in search input
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /**
   * Add track to playlist
   */
  const addToPlaylist = (track: Track) => {
    setPlaylist((prev) => [...prev, { ...track, id: `${track.videoId}-${Date.now()}` }]);
  };

  /**
   * Remove track from playlist
   */
  const removeFromPlaylist = (trackId: string) => {
    setPlaylist((prev) => prev.filter((t) => t.id !== trackId));
  };

  const displayTracks = activeTab === 'search' ? searchResults : playlist;

  return (
    <div className={`flex flex-col bg-neutral-900/95 border border-neutral-700/50 rounded-xl shadow-2xl backdrop-blur-sm ${className}`}>
      {/* Header with search */}
      <div className="p-4 border-b border-neutral-700/50">
        {/* Search Title */}
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Track Browser</span>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search YouTube or paste video URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 !p-3 bg-neutral-800/80 border-neutral-600/50 text-white placeholder-neutral-500 focus:border-red-500/70 focus:ring-red-500/20"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="h-10 !px-5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 shadow-lg shadow-red-600/20 hover:shadow-red-500/30 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
            ) : 'Search'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-800/50 rounded-lg">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'search'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-600'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            SEARCH ({searchResults.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('playlist')}
            className={`flex-1 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'playlist'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-600'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            QUEUE ({playlist.length})
          </Button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {error && (
          <div className="mx-4 mt-3 px-3 py-2.5 text-xs text-amber-300 bg-amber-900/30 border border-amber-700/30 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
        {displayTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8">
            <svg className="w-12 h-12 mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-sm font-medium">
              {activeTab === 'search'
                ? 'Search for tracks'
                : 'Queue is empty'}
            </span>
            <span className="text-xs text-neutral-600 mt-1">
              {activeTab === 'search'
                ? 'Enter a search term or paste a YouTube URL'
                : 'Add tracks from search results'}
            </span>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {displayTracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                onLoadToDeckA={() => onLoadToDeckA(track)}
                onLoadToDeckB={() => onLoadToDeckB(track)}
                onAddToPlaylist={
                  activeTab === 'search' ? () => addToPlaylist(track) : undefined
                }
                onRemove={
                  activeTab === 'playlist'
                    ? () => removeFromPlaylist(track.id)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual track item component
 */
function TrackItem({
  track,
  onLoadToDeckA,
  onLoadToDeckB,
  onAddToPlaylist,
  onRemove,
}: {
  track: Track;
  onLoadToDeckA: () => void;
  onLoadToDeckB: () => void;
  onAddToPlaylist?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 bg-neutral-800/40 hover:bg-neutral-800/80 rounded-lg transition-all group cursor-pointer border border-transparent hover:border-neutral-700/50">
      {/* Thumbnail */}
      <div className="relative w-20 h-14 flex-shrink-0 bg-neutral-900 rounded-md overflow-hidden shadow-md">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/90 text-[10px] text-white font-medium rounded">
          {track.duration}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="text-sm text-white font-medium truncate leading-tight" title={track.title}>
          {track.title}
        </div>
        <div className="text-xs text-neutral-400 truncate mt-0.5">{track.channel}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
        {onAddToPlaylist && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); }}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-700/50 hover:bg-neutral-600"
            title="Add to queue"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-2 text-neutral-400 hover:text-red-400 bg-neutral-700/50 hover:bg-red-900/50"
            title="Remove from queue"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        )}
        <Button
          onClick={(e) => { e.stopPropagation(); onLoadToDeckA(); }}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40"
          title="Load to Deck A"
        >
          DECK A
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); onLoadToDeckB(); }}
          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 hover:shadow-red-500/40"
          title="Load to Deck B"
        >
          DECK B
        </Button>
      </div>
    </div>
  );
}

export type { Track };
