import { useEffect, useRef, useCallback } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';

interface VideoPlayerProps {
  videoId: string;
  opacity: number;
  volume: number; // 0-1 normalized
  playing: boolean;
  seekTo?: number | null; // Target time to seek to
  onReady?: (player: YouTubePlayer) => void;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSeekComplete?: () => void;
  className?: string;
}

/**
 * VideoPlayer component - wrapper around react-youtube
 *
 * Handles:
 * - YouTube IFrame player embedding
 * - Play/pause control via props
 * - Volume control via props
 * - Opacity styling for visual crossfade
 * - Time tracking and seeking
 */
export function VideoPlayer({
  videoId,
  opacity,
  volume,
  playing,
  seekTo,
  onReady,
  onStateChange,
  onTimeUpdate,
  onSeekComplete,
  className = '',
}: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isReadyRef = useRef(false);
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Start time tracking interval
   */
  const startTimeTracking = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    timeUpdateIntervalRef.current = setInterval(() => {
      if (!playerRef.current || !isReadyRef.current) return;

      try {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const duration = playerRef.current.getDuration() || 0;
        onTimeUpdate?.(currentTime, duration);
      } catch (error) {
        // Player might not be ready
      }
    }, 250); // Update 4 times per second
  }, [onTimeUpdate]);

  /**
   * Stop time tracking interval
   */
  const stopTimeTracking = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle player ready event
   */
  const handleReady = useCallback(
    (event: YouTubeEvent) => {
      playerRef.current = event.target;
      isReadyRef.current = true;

      // Set initial volume
      event.target.setVolume(Math.round(volume * 100));

      // Get initial duration
      const duration = event.target.getDuration() || 0;
      onTimeUpdate?.(0, duration);

      // Start time tracking
      startTimeTracking();

      onReady?.(event.target);
    },
    [volume, onReady, onTimeUpdate, startTimeTracking]
  );

  /**
   * Handle player state change
   */
  const handleStateChange = useCallback(
    (event: YouTubeEvent) => {
      onStateChange?.(event.data);

      // Update time on state change
      if (playerRef.current && isReadyRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime() || 0;
          const duration = playerRef.current.getDuration() || 0;
          onTimeUpdate?.(currentTime, duration);
        } catch (error) {
          // Ignore
        }
      }
    },
    [onStateChange, onTimeUpdate]
  );

  /**
   * Handle seeking
   */
  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return;
    if (!playerRef.current || !isReadyRef.current) return;

    try {
      playerRef.current.seekTo(seekTo, true);
      console.log(`[VideoPlayer] Seeking to ${seekTo}s`);
      onSeekComplete?.();
    } catch (error) {
      console.error('[VideoPlayer] Seek error:', error);
    }
  }, [seekTo, onSeekComplete]);

  /**
   * Control playback based on playing prop
   */
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;

    try {
      if (playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('[VideoPlayer] Playback control error:', error);
    }
  }, [playing]);

  /**
   * Control volume based on volume prop
   */
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;

    try {
      const volumePercent = Math.round(volume * 100);
      playerRef.current.setVolume(volumePercent);
    } catch (error) {
      console.error('[VideoPlayer] Volume control error:', error);
    }
  }, [volume]);

  /**
   * Cleanup time tracking on unmount
   */
  useEffect(() => {
    return () => {
      stopTimeTracking();
    };
  }, [stopTimeTracking]);

  // YouTube player options
  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3, // Hide annotations
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      playsinline: 1,
    },
  };

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-100 ${className}`}
      style={{ opacity }}
    >
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="w-full h-full"
          iframeClassName="w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black text-gray-600">
          <span className="text-xl">No video loaded</span>
        </div>
      )}
    </div>
  );
}
