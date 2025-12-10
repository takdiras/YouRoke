import { useEffect, useCallback, useRef } from 'react';
import { VideoMixer } from './components/VideoMixer';
import { DeckDisplay } from './components/DeckDisplay';
import { MixerCenter } from './components/MixerCenter';
import { PlaylistPanel, type Track } from './components/PlaylistPanel';
import { LyricsPanelCompact } from './components/LyricsPanelCompact';
import { useMidiController } from './hooks/useMidiController';
import { useBroadcastChannel } from './hooks/useBroadcastChannel';
import { useDJStore, getStoreState } from './stores/djStore';
import { useYouTubeMetadata } from './hooks/useYouTubeMetadata';
import { Button } from '@/components/ui/button';

/**
 * Main App component - YouRoke DJ Mixer
 * Professional DJ software UI with dark theme and neon red accents
 */
function App() {
  const projectorWindowRef = useRef<Window | null>(null);

  // Store actions
  const setCrossfader = useDJStore((state) => state.setCrossfader);
  const toggleDeckAPlay = useDJStore((state) => state.toggleDeckAPlay);
  const toggleDeckBPlay = useDJStore((state) => state.toggleDeckBPlay);
  const setMidiConnected = useDJStore((state) => state.setMidiConnected);
  const updateDeckA = useDJStore((state) => state.updateDeckA);
  const updateDeckB = useDJStore((state) => state.updateDeckB);
  const audioEngineStarted = useDJStore((state) => state.audioEngineStarted);
  const startAudioEngine = useDJStore((state) => state.startAudioEngine);

  // YouTube metadata fetcher
  const { fetchMetadata } = useYouTubeMetadata();

  // MIDI callbacks
  const handleCrossfaderChange = useCallback(
    (value: number) => {
      setCrossfader(value);
    },
    [setCrossfader]
  );

  const handleDeckAPlayToggle = useCallback(() => {
    toggleDeckAPlay();
  }, [toggleDeckAPlay]);

  const handleDeckBPlayToggle = useCallback(() => {
    toggleDeckBPlay();
  }, [toggleDeckBPlay]);

  // Initialize MIDI controller
  const { isMidiConnected } = useMidiController({
    onCrossfaderChange: handleCrossfaderChange,
    onDeckAPlayToggle: handleDeckAPlayToggle,
    onDeckBPlayToggle: handleDeckBPlayToggle,
  });

  // Update store with MIDI connection status
  useEffect(() => {
    setMidiConnected(isMidiConnected);
  }, [isMidiConnected, setMidiConnected]);

  // Broadcast channel for projector sync
  const { postMessage } = useBroadcastChannel();

  // Broadcast state changes to projector
  useEffect(() => {
    const unsubscribe = useDJStore.subscribe(() => {
      const state = getStoreState();
      postMessage({ type: 'FULL_STATE', payload: state });
    });

    return unsubscribe;
  }, [postMessage]);

  /**
   * Load track to Deck A
   */
  const handleLoadToDeckA = useCallback(async (track: Track) => {
    updateDeckA({ 
      videoId: track.videoId, 
      title: track.title,
      artist: track.channel 
    });
    
    // Try to fetch better metadata
    const metadata = await fetchMetadata(track.videoId);
    if (metadata && metadata.artist) {
      updateDeckA({
        artist: metadata.artist,
        title: metadata.title,
      });
    }
  }, [updateDeckA, fetchMetadata]);

  /**
   * Load track to Deck B
   */
  const handleLoadToDeckB = useCallback(async (track: Track) => {
    updateDeckB({ 
      videoId: track.videoId, 
      title: track.title,
      artist: track.channel 
    });
    
    // Try to fetch better metadata
    const metadata = await fetchMetadata(track.videoId);
    if (metadata && metadata.artist) {
      updateDeckB({
        artist: metadata.artist,
        title: metadata.title,
      });
    }
  }, [updateDeckB, fetchMetadata]);

  /**
   * Open projector window
   */
  const handleOpenProjector = useCallback(() => {
    if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.focus();
      return;
    }

    const projectorWindow = window.open(
      '?projector=true',
      'YouRoke_Projector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    if (projectorWindow) {
      projectorWindowRef.current = projectorWindow;
      setTimeout(() => {
        const state = getStoreState();
        postMessage({ type: 'FULL_STATE', payload: state });
      }, 1000);
    }
  }, [postMessage]);

  // Cleanup projector window on unmount
  useEffect(() => {
    return () => {
      if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
        projectorWindowRef.current.close();
      }
    };
  }, []);

  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-black/80 border-b border-neutral-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-white">YOU</span>
            <span className="text-red-500">ROKE</span>
          </h1>
          <div className="h-6 w-px bg-neutral-800" />
          <span className="text-xs text-neutral-500 uppercase tracking-widest font-medium">DJ System</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Audio Engine Button */}
          {!audioEngineStarted && (
            <Button
              onClick={startAudioEngine}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold animate-pulse shadow-lg shadow-amber-600/30"
            >
              ⚡ START AUDIO
            </Button>
          )}
          
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${audioEngineStarted ? 'bg-green-900/40 text-green-400 border border-green-700/30' : 'bg-neutral-800/50 text-neutral-500 border border-neutral-700/30'}`}>
              {audioEngineStarted ? '🔊 AUDIO ON' : '🔇 AUDIO OFF'}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isMidiConnected ? 'bg-green-900/40 text-green-400 border border-green-700/30' : 'bg-neutral-800/50 text-neutral-500 border border-neutral-700/30'}`}>
              {isMidiConnected ? '🎛️ MIDI ON' : '🎛️ NO MIDI'}
            </span>
          </div>

          {/* Projector Button */}
          <Button
            onClick={handleOpenProjector}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 hover:shadow-red-500/40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            PROJECTOR
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        {/* Upper Section: Deck A + Mixer + Deck B */}
        <div className="flex gap-4 max-h-[50%]">
          {/* Deck A */}
          <DeckDisplay deck="A"/>

          {/* Mixer Center */}
          <MixerCenter className="flex-shrink-0" />

          {/* Deck B */}
          <DeckDisplay deck="B" />
          {/* Playlist Panel */}
          <PlaylistPanel
            onLoadToDeckA={handleLoadToDeckA}
            onLoadToDeckB={handleLoadToDeckB}
            className="flex-1"
          />
        </div>

        {/* Lower Section: Video Preview + Playlist + Lyrics */}
        <div className="flex gap-4 h-[55%] min-h-0">

          {/* Video Preview */}
          <div className="w-80 flex-shrink-0 relative bg-black rounded-xl overflow-hidden border border-neutral-800/50 shadow-2xl flex-1">
            <VideoMixer />
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-xs text-neutral-400 uppercase tracking-wider font-medium border border-neutral-700/30">
              Preview
            </div>
          </div>

          {/* Lyrics Panel */}
          <LyricsPanelCompact className="w-80 flex-shrink-0" />
        </div>
      </main>
    </div>
  );
}

export default App;
