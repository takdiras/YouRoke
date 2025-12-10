import { useState, useEffect, useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { useBroadcastChannel } from '../hooks/useBroadcastChannel';
import { applyCurve } from '../utils/crossfaderCurve';
import { DEFAULT_DJ_STATE } from '../types';
import type { DJStoreState, BroadcastMessage } from '../types';

/**
 * ProjectorView component - fullscreen display for external monitor
 *
 * This component is designed to be opened in a separate window and
 * displayed on a projector or secondary monitor. It receives state
 * updates from the main control window via BroadcastChannel.
 *
 * Features:
 * - Fullscreen video display (user presses F11)
 * - Dual YouTube players with crossfade
 * - No UI controls - pure visual output
 * - Syncs state from main window
 */
export function ProjectorView() {
  // Local state that mirrors the main store
  const [state, setState] = useState<DJStoreState>(DEFAULT_DJ_STATE);

  /**
   * Handle incoming broadcast messages
   */
  const handleBroadcastMessage = useCallback((message: BroadcastMessage) => {
    switch (message.type) {
      case 'FULL_STATE':
        setState(message.payload);
        break;
      case 'STATE_UPDATE':
        setState((prev) => ({ ...prev, ...message.payload }));
        break;
    }
  }, []);

  // Set up broadcast channel listener
  const { postMessage } = useBroadcastChannel(handleBroadcastMessage);

  // Request full state on mount
  useEffect(() => {
    // Notify main window that projector is ready
    postMessage({ type: 'STATE_UPDATE', payload: {} });

    // Set page title
    document.title = 'YouRoke Projector';

    // Add keyboard shortcut hint
    console.log('[Projector] Press F11 for fullscreen');
  }, [postMessage]);

  // Calculate mix values
  const mixValues = applyCurve(state.crossfaderValue, state.crossfaderCurve);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {/* Video container - fills entire screen */}
      <div className="relative w-full h-full">
        {/* Deck A */}
        <VideoPlayer
          videoId={state.deckA.videoId}
          opacity={mixValues.deckAOpacity}
          volume={mixValues.deckAVolume}
          playing={state.deckA.playing}
          className="z-10"
        />

        {/* Deck B */}
        <VideoPlayer
          videoId={state.deckB.videoId}
          opacity={mixValues.deckBOpacity}
          volume={mixValues.deckBVolume}
          playing={state.deckB.playing}
          className="z-20"
        />
      </div>

      {/* Minimal status indicator (fades out after a few seconds) */}
      <ProjectorStatusOverlay
        deckAPlaying={state.deckA.playing}
        deckBPlaying={state.deckB.playing}
        crossfaderValue={state.crossfaderValue}
      />
    </div>
  );
}

/**
 * Status overlay that fades out after inactivity
 */
function ProjectorStatusOverlay({
  deckAPlaying,
  deckBPlaying,
  crossfaderValue,
}: {
  deckAPlaying: boolean;
  deckBPlaying: boolean;
  crossfaderValue: number;
}) {
  const [visible, setVisible] = useState(true);

  // Hide after 3 seconds of no changes
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [deckAPlaying, deckBPlaying, crossfaderValue]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 transition-opacity duration-500 bg-black/60 px-3 py-2 rounded-lg">
      <div className="flex items-center gap-3 text-sm text-white/80">
        <span className={deckAPlaying ? 'text-blue-400' : 'text-gray-500'}>
          A {deckAPlaying ? '▶' : '⏸'}
        </span>
        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-red-500 transition-all duration-100"
            style={{ width: `${crossfaderValue * 100}%` }}
          />
        </div>
        <span className={deckBPlaying ? 'text-red-400' : 'text-gray-500'}>
          {deckBPlaying ? '▶' : '⏸'} B
        </span>
      </div>
    </div>
  );
}
