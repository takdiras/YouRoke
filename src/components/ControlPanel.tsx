import { useCallback } from 'react';
import { MixerControls } from './MixerControls';
import { LyricsPanel } from './LyricsPanel';
import { useDJStore } from '../stores/djStore';

interface ControlPanelProps {
  onOpenProjector: () => void;
  className?: string;
}

/**
 * ControlPanel component - bottom section of the main app
 *
 * Assembles:
 * - MixerControls (decks + crossfader)
 * - LyricsPanel (collapsible)
 * - System controls (Start Audio, Open Projector)
 */
export function ControlPanel({ onOpenProjector, className = '' }: ControlPanelProps) {
  const audioEngineStarted = useDJStore((state) => state.audioEngineStarted);
  const startAudioEngine = useDJStore((state) => state.startAudioEngine);

  /**
   * Handle audio engine start
   */
  const handleStartAudio = useCallback(() => {
    startAudioEngine();
  }, [startAudioEngine]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Audio engine warning */}
      {!audioEngineStarted && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <span className="text-yellow-200 text-sm">
              Click "Start Audio Engine" to enable audio playback (required by browser
              autoplay policy)
            </span>
          </div>
          <button
            onClick={handleStartAudio}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors"
          >
            Start Audio Engine
          </button>
        </div>
      )}

      {/* Mixer controls */}
      <MixerControls />

      {/* Lyrics panel */}
      <LyricsPanel />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
        {/* Left: App info */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">
            You<span className="text-purple-500">Roke</span>
          </h1>
          <span className="text-xs text-gray-500">YouTube DJ Mixer</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Audio engine status */}
          <div
            className={`px-3 py-1 rounded text-xs ${
              audioEngineStarted
                ? 'bg-green-900/50 text-green-400'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            {audioEngineStarted ? '🔊 Audio Ready' : '🔇 Audio Off'}
          </div>

          {/* Open projector button */}
          <button
            onClick={onOpenProjector}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
          >
            <span>📺</span>
            Open Projector
          </button>
        </div>
      </div>
    </div>
  );
}
