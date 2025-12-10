import { useState, useCallback } from 'react';
import type { YouTubeMetadata } from '../types';

interface UseYouTubeMetadataReturn {
  metadata: YouTubeMetadata | null;
  loading: boolean;
  error: string | null;
  fetchMetadata: (videoId: string) => Promise<YouTubeMetadata | null>;
  clearMetadata: () => void;
}

/**
 * Patterns to match artist and title from video titles
 * Ordered by specificity - more specific patterns first
 */
const TITLE_PATTERNS = [
  // "Artist - Title (Official Video)" or similar
  /^(.+?)\s*[-–—]\s*(.+?)\s*(?:\((?:Official|Music|Lyric|Audio|Video|HD|HQ|4K|Karaoke|Lyrics?).*?\))*\s*$/i,
  // "Artist - Title | Something"
  /^(.+?)\s*[-–—]\s*(.+?)\s*\|/i,
  // "Artist - Title [Something]"
  /^(.+?)\s*[-–—]\s*(.+?)\s*\[/i,
  // Simple "Artist - Title"
  /^(.+?)\s*[-–—]\s*(.+)$/,
];

/**
 * Cleanup patterns to remove from parsed titles
 */
const CLEANUP_PATTERNS = [
  /\s*\((?:Official|Music|Lyric|Audio|Video|HD|HQ|4K|Karaoke|Lyrics?|ft\.?|feat\.?).*?\)\s*/gi,
  /\s*\[(?:Official|Music|Lyric|Audio|Video|HD|HQ|4K|Karaoke|Lyrics?).*?\]\s*/gi,
  /\s*(?:Official|Music|Lyric|Audio)\s*(?:Video|Audio)?\s*$/i,
  /\s*\|\s*.*$/,
];

/**
 * Parse artist and title from a YouTube video title
 */
function parseVideoTitle(rawTitle: string): { artist: string; title: string } {
  let artist = '';
  let title = rawTitle;

  // Try each pattern until one matches
  for (const pattern of TITLE_PATTERNS) {
    const match = rawTitle.match(pattern);
    if (match) {
      artist = match[1].trim();
      title = match[2].trim();
      break;
    }
  }

  // Clean up the title
  for (const pattern of CLEANUP_PATTERNS) {
    title = title.replace(pattern, '').trim();
    artist = artist.replace(pattern, '').trim();
  }

  return { artist, title };
}

/**
 * Hook to fetch and parse YouTube video metadata
 * Uses noembed.com as a free proxy to YouTube's oEmbed API
 */
export function useYouTubeMetadata(): UseYouTubeMetadataReturn {
  const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(
    async (videoId: string): Promise<YouTubeMetadata | null> => {
      if (!videoId) {
        setError('No video ID provided');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(youtubeUrl)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const rawTitle = data.title || '';
        const { artist, title } = parseVideoTitle(rawTitle);

        const result: YouTubeMetadata = {
          artist,
          title,
          rawTitle,
        };

        setMetadata(result);
        setLoading(false);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch metadata';
        console.error('[YouTube] Failed to fetch metadata:', errorMessage);
        setError(errorMessage);
        setLoading(false);
        return null;
      }
    },
    []
  );

  const clearMetadata = useCallback(() => {
    setMetadata(null);
    setError(null);
  }, []);

  return {
    metadata,
    loading,
    error,
    fetchMetadata,
    clearMetadata,
  };
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(input: string): string | null {
  // Already a video ID (11 characters, alphanumeric with - and _)
  if (/^[\w-]{11}$/.test(input)) {
    return input;
  }

  // Full URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
