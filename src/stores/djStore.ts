import { create } from 'zustand';
import type { DJStore, DeckState, CrossfaderCurve, DJStoreState, EQSettings } from '../types';
import { DEFAULT_DECK_STATE, DEFAULT_MASTER } from '../types';

/**
 * Main Zustand store for YouRoke DJ application
 *
 * Manages:
 * - Crossfader position and curve type
 * - Both deck states (video, metadata, playback)
 * - EQ and gain per deck + master
 * - MIDI connection status
 * - Audio engine initialization state
 */
export const useDJStore = create<DJStore>((set) => ({
  // ============================================================================
  // Initial State
  // ============================================================================

  crossfaderValue: 0.5,
  crossfaderCurve: 'linear',

  deckA: { ...DEFAULT_DECK_STATE },
  deckB: { ...DEFAULT_DECK_STATE },
  master: { ...DEFAULT_MASTER },

  audioEngineStarted: false,
  isMidiConnected: false,

  // ============================================================================
  // Crossfader Actions
  // ============================================================================

  setCrossfader: (value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    set({ crossfaderValue: clampedValue });
  },

  setCurve: (curve: CrossfaderCurve) => {
    set({ crossfaderCurve: curve });
  },

  // ============================================================================
  // Deck Actions
  // ============================================================================

  updateDeckA: (updates: Partial<DeckState>) => {
    set((state) => ({
      deckA: { ...state.deckA, ...updates },
    }));
  },

  updateDeckB: (updates: Partial<DeckState>) => {
    set((state) => ({
      deckB: { ...state.deckB, ...updates },
    }));
  },

  toggleDeckAPlay: () => {
    set((state) => ({
      deckA: { ...state.deckA, playing: !state.deckA.playing },
    }));
  },

  toggleDeckBPlay: () => {
    set((state) => ({
      deckB: { ...state.deckB, playing: !state.deckB.playing },
    }));
  },

  setDeckAPlaying: (playing: boolean) => {
    set((state) => ({
      deckA: { ...state.deckA, playing },
    }));
  },

  setDeckBPlaying: (playing: boolean) => {
    set((state) => ({
      deckB: { ...state.deckB, playing },
    }));
  },

  // ============================================================================
  // System Actions
  // ============================================================================

  setMidiConnected: (connected: boolean) => {
    set({ isMidiConnected: connected });
  },

  startAudioEngine: () => {
    // Create and resume audio context to satisfy browser autoplay policy
    try {
      const audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create a silent oscillator to kick-start the audio context
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Silent
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.001);

      audioContext.resume();

      console.log('[Audio] Audio engine started');
      set({ audioEngineStarted: true });
    } catch (error) {
      console.error('[Audio] Failed to start audio engine:', error);
    }
  },

  // ============================================================================
  // EQ Actions
  // ============================================================================

  setDeckAEQ: (eq: Partial<EQSettings>) => {
    set((state) => ({
      deckA: { ...state.deckA, eq: { ...state.deckA.eq, ...eq } },
    }));
  },

  setDeckBEQ: (eq: Partial<EQSettings>) => {
    set((state) => ({
      deckB: { ...state.deckB, eq: { ...state.deckB.eq, ...eq } },
    }));
  },

  setDeckAGain: (gain: number) => {
    set((state) => ({
      deckA: { ...state.deckA, gain: Math.max(0, Math.min(1.5, gain)) },
    }));
  },

  setDeckBGain: (gain: number) => {
    set((state) => ({
      deckB: { ...state.deckB, gain: Math.max(0, Math.min(1.5, gain)) },
    }));
  },

  setMasterEQ: (eq: Partial<EQSettings>) => {
    set((state) => ({
      master: { ...state.master, eq: { ...state.master.eq, ...eq } },
    }));
  },

  setMasterVolume: (volume: number) => {
    set((state) => ({
      master: { ...state.master, volume: Math.max(0, Math.min(1, volume)) },
    }));
  },

  // ============================================================================
  // Seek Actions
  // ============================================================================

  seekDeckA: (time: number) => {
    set((state) => ({
      deckA: { ...state.deckA, seekTo: time },
    }));
  },

  seekDeckB: (time: number) => {
    set((state) => ({
      deckB: { ...state.deckB, seekTo: time },
    }));
  },

  clearSeekA: () => {
    set((state) => ({
      deckA: { ...state.deckA, seekTo: null },
    }));
  },

  clearSeekB: () => {
    set((state) => ({
      deckB: { ...state.deckB, seekTo: null },
    }));
  },
}));

/**
 * Get the current store state snapshot (for broadcasting)
 */
export function getStoreState(): DJStoreState {
  const state = useDJStore.getState();
  return {
    crossfaderValue: state.crossfaderValue,
    crossfaderCurve: state.crossfaderCurve,
    deckA: state.deckA,
    deckB: state.deckB,
    master: state.master,
    audioEngineStarted: state.audioEngineStarted,
    isMidiConnected: state.isMidiConnected,
  };
}

/**
 * Apply a partial state update (from broadcast messages)
 */
export function applyStateUpdate(updates: Partial<DJStoreState>): void {
  useDJStore.setState(updates);
}
