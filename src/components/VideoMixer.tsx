import { useMemo, useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { useDJStore } from '../stores/djStore';
import { applyCurve } from '../utils/crossfaderCurve';

interface VideoMixerProps {
  className?: string;
}

/**
 * VideoMixer component - the core visual mixing engine
 *
 * Contains two overlapping YouTube players with opacity and volume
 * controlled by the crossfader position and curve type.
 */
export function VideoMixer({ className = '' }: VideoMixerProps) {
  const crossfaderValue = useDJStore((state) => state.crossfaderValue);
  const crossfaderCurve = useDJStore((state) => state.crossfaderCurve);
  const deckA = useDJStore((state) => state.deckA);
  const deckB = useDJStore((state) => state.deckB);
  const updateDeckA = useDJStore((state) => state.updateDeckA);
  const updateDeckB = useDJStore((state) => state.updateDeckB);
  const clearSeekA = useDJStore((state) => state.clearSeekA);
  const clearSeekB = useDJStore((state) => state.clearSeekB);

  // Calculate opacity and volume based on crossfader
  const mixValues = useMemo(
    () => applyCurve(crossfaderValue, crossfaderCurve),
    [crossfaderValue, crossfaderCurve]
  );

  // Time update handlers
  const handleDeckATimeUpdate = useCallback((currentTime: number, duration: number) => {
    updateDeckA({ currentTime, duration });
  }, [updateDeckA]);

  const handleDeckBTimeUpdate = useCallback((currentTime: number, duration: number) => {
    updateDeckB({ currentTime, duration });
  }, [updateDeckB]);

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      {/* Deck A - Bottom layer */}
      <VideoPlayer
        videoId={deckA.videoId}
        opacity={mixValues.deckAOpacity}
        volume={mixValues.deckAVolume}
        playing={deckA.playing}
        seekTo={deckA.seekTo}
        playbackRate={deckA.playbackRate}
        onTimeUpdate={handleDeckATimeUpdate}
        onSeekComplete={clearSeekA}
        className="z-10"
      />

      {/* Deck B - Top layer */}
      <VideoPlayer
        videoId={deckB.videoId}
        opacity={mixValues.deckBOpacity}
        volume={mixValues.deckBVolume}
        playing={deckB.playing}
        seekTo={deckB.seekTo}
        playbackRate={deckB.playbackRate}
        onTimeUpdate={handleDeckBTimeUpdate}
        onSeekComplete={clearSeekB}
        className="z-20"
      />
    </div>
  );
}
