import { useState, useCallback } from 'react';
import { useDJStore } from '../stores/djStore';
import { applyCurve } from '../utils/crossfaderCurve';
import { Button } from '@/components/ui/button';
import { WaveformSeekBar } from './WaveformSeekBar';

interface DeckDisplayProps {
  deck: 'A' | 'B';
  className?: string;
}

/**
 * DeckDisplay component - Professional DJ deck UI
 *
 * Features:
 * - Real YouTube waveform visualization with seeking
 * - Track info display with BPM
 * - Play/pause/cue controls
 * - Volume/level meters
 */
export function DeckDisplay({ deck, className = '' }: DeckDisplayProps) {
  const deckState = useDJStore((state) => (deck === 'A' ? state.deckA : state.deckB));
  const togglePlay = useDJStore((state) =>
    deck === 'A' ? state.toggleDeckAPlay : state.toggleDeckBPlay
  );
  const seekDeck = useDJStore((state) =>
    deck === 'A' ? state.seekDeckA : state.seekDeckB
  );
  const crossfaderValue = useDJStore((state) => state.crossfaderValue);
  const crossfaderCurve = useDJStore((state) => state.crossfaderCurve);
  
  const [bpm, setBpm] = useState<number>(0);

  const mixValues = applyCurve(crossfaderValue, crossfaderCurve);
  const currentVolume = deck === 'A' ? mixValues.deckAVolume : mixValues.deckBVolume;

  // Deck accent colors
  const accentColor = deck === 'A' ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)';
  const playedColor = deck === 'A' ? 'rgb(96, 165, 250)' : 'rgb(248, 113, 113)';
  const accentClass = deck === 'A' ? 'text-blue-500' : 'text-red-500';
  const bgAccent = deck === 'A' ? 'bg-blue-500' : 'bg-red-500';

  const handleSeek = (time: number) => {
    seekDeck(time);
  };
  
  const handleBpmDetected = useCallback((detectedBpm: number) => {
    setBpm(detectedBpm);
  }, []);

  return (
    <div className={`bg-neutral-900/95 border border-neutral-700/50 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden ${className}`}>
      {/* Deck Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-neutral-700/50">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${accentClass}`}>DECK {deck}</span>
          <div
            className={`w-2.5 h-2.5 rounded-full ${deckState.playing ? bgAccent : 'bg-neutral-600'} ${
              deckState.playing ? 'animate-pulse shadow-lg' : ''
            }`}
            style={{ boxShadow: deckState.playing ? `0 0 10px ${accentColor}` : 'none' }}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* BPM Display */}
          {bpm > 0 && (
            <div className={`flex items-center gap-1 ${accentClass}`}>
              <span className="text-lg font-bold font-mono">{bpm}</span>
              <span className="text-xs text-neutral-400">BPM</span>
            </div>
          )}
          <span className="text-xs text-neutral-400 font-mono bg-neutral-800/50 px-2 py-0.5 rounded">
            {Math.round(currentVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Waveform SeekBar */}
      <div className="relative h-20 bg-neutral-950/80 border-b border-neutral-700/50">
        <WaveformSeekBar
          videoId={deckState.videoId || null}
          currentTime={deckState.currentTime}
          duration={deckState.duration}
          color={accentColor}
          playedColor={playedColor}
          height={80}
          onSeek={handleSeek}
          onBpmDetected={handleBpmDetected}
          className="h-full"
        />
      </div>

      {/* Track Info */}
      <div className="px-4 py-3 bg-black/20 border-b border-neutral-700/50">
        {deckState.videoId ? (
          <div className="space-y-1">
            <div className="text-sm text-white font-medium truncate">
              {deckState.title || 'Unknown Title'}
            </div>
            <div className="text-xs text-neutral-400 truncate">
              {deckState.artist || 'Unknown Artist'}
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500 italic">No track loaded</div>
        )}
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-3 p-4 bg-black/20">
        {/* Cue Button */}
        <Button
          variant="ghost"
          disabled={!deckState.videoId}
          className="w-14 h-14 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 border border-neutral-600/50 text-neutral-400 hover:text-white shadow-lg"
        >
          <span className="text-xs font-bold">CUE</span>
        </Button>

        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          onClick={togglePlay}
          disabled={!deckState.videoId}
          className={`w-16 h-16 rounded-full ${
            deckState.playing ? bgAccent : 'bg-neutral-800/80 hover:bg-neutral-700'
          } disabled:opacity-30 border-2 ${
            deckState.playing ? 'border-white/30' : 'border-neutral-600/50'
          } shadow-xl`}
          style={{
            boxShadow: deckState.playing ? `0 0 25px ${accentColor}` : 'none',
          }}
        >
          {deckState.playing ? (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </Button>

        {/* Sync Button */}
        <Button
          variant="ghost"
          disabled={!deckState.videoId}
          className="w-14 h-14 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 border border-neutral-600/50 text-neutral-400 hover:text-white shadow-lg"
        >
          <span className="text-xs font-bold">SYNC</span>
        </Button>
      </div>

      {/* Level Meter */}
      <div className="px-4 pb-4">
        <div className="h-2 bg-neutral-800/80 rounded-full overflow-hidden">
          <div
            className={`h-full ${bgAccent} transition-all duration-100 rounded-full`}
            style={{
              width: `${currentVolume * 100}%`,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
