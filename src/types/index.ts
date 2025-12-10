// ============================================================================
// YouRoke - Type Definitions
// ============================================================================

/**
 * Crossfader curve type for audio/visual mixing
 * - 'linear': Straight interpolation (smooth DJ mixing)
 * - 'cut': Sharp transitions near edges (scratch/cut style)
 */
export type CrossfaderCurve = 'linear' | 'cut';

/**
 * EQ settings for a channel (deck or master)
 * Values range from -1 (full cut) to 1 (full boost), 0 = neutral
 */
export interface EQSettings {
  high: number;
  mid: number;
  low: number;
}

/**
 * Master channel settings
 */
export interface MasterSettings {
  volume: number; // 0 to 1
  eq: EQSettings;
}

/**
 * State for a single deck (A or B)
 */
export interface DeckState {
  videoId: string;
  title: string;
  artist: string;
  playing: boolean;
  lyrics: string;
  eq: EQSettings;
  gain: number; // 0 to 1.5 (1 = unity)
  filter: number; // -1 (LPF) to 1 (HPF), 0 = off
  currentTime: number; // Current playback position in seconds
  duration: number; // Total duration in seconds
  seekTo: number | null; // Target seek time (null = no seek pending)
  playbackRate: number; // Playback speed (0.5 to 2.0, 1.0 = normal)
}

/**
 * Complete DJ store state
 */
export interface DJStoreState {
  // Crossfader
  crossfaderValue: number; // 0.0 (Deck A) to 1.0 (Deck B)
  crossfaderCurve: CrossfaderCurve;

  // Decks
  deckA: DeckState;
  deckB: DeckState;

  // Master
  master: MasterSettings;

  // System state
  audioEngineStarted: boolean;
  isMidiConnected: boolean;
}

/**
 * Actions for DJ store
 */
export interface DJStoreActions {
  setCrossfader: (value: number) => void;
  setCurve: (curve: CrossfaderCurve) => void;
  updateDeckA: (updates: Partial<DeckState>) => void;
  updateDeckB: (updates: Partial<DeckState>) => void;
  toggleDeckAPlay: () => void;
  toggleDeckBPlay: () => void;
  setDeckAPlaying: (playing: boolean) => void;
  setDeckBPlaying: (playing: boolean) => void;
  setMidiConnected: (connected: boolean) => void;
  startAudioEngine: () => void;
  // EQ Actions
  setDeckAEQ: (eq: Partial<EQSettings>) => void;
  setDeckBEQ: (eq: Partial<EQSettings>) => void;
  setDeckAGain: (gain: number) => void;
  setDeckBGain: (gain: number) => void;
  setMasterEQ: (eq: Partial<EQSettings>) => void;
  setMasterVolume: (volume: number) => void;
  // Seek Actions
  seekDeckA: (time: number) => void;
  seekDeckB: (time: number) => void;
  clearSeekA: () => void;
  clearSeekB: () => void;
}

/**
 * Combined store type
 */
export type DJStore = DJStoreState & DJStoreActions;

/**
 * Output from crossfader curve calculation
 */
export interface CrossfaderOutput {
  deckAOpacity: number;
  deckBOpacity: number;
  deckAVolume: number;
  deckBVolume: number;
}

/**
 * YouTube metadata parsed from video title
 */
export interface YouTubeMetadata {
  artist: string;
  title: string;
  rawTitle: string;
}

/**
 * Broadcast channel message types for cross-window sync
 */
export type BroadcastMessage =
  | { type: 'STATE_UPDATE'; payload: Partial<DJStoreState> }
  | { type: 'FULL_STATE'; payload: DJStoreState };

/**
 * MIDI message structure
 */
export interface MidiMessage {
  status: number;
  data1: number;
  data2: number;
  channel: number;
  type: 'noteOn' | 'noteOff' | 'controlChange' | 'unknown';
}

// ============================================================================
// DDJ-200 MIDI Constants
// ============================================================================

export const DDJ200 = {
  // Control Change numbers
  CROSSFADER_CC: 51,

  // Note numbers
  DECK_A_PLAY_NOTE: 11,
  DECK_A_CUE_NOTE: 12,
  DECK_B_PLAY_NOTE: 11, // Same note, different channel
  DECK_B_CUE_NOTE: 12,

  // MIDI status bytes (high nibble = message type, low nibble = channel)
  // Channel 1 (0x00) - Deck A
  NOTE_ON_CH1: 0x90,
  NOTE_OFF_CH1: 0x80,
  CC_CH1: 0xb0,

  // Channel 2 (0x01) - Deck B
  NOTE_ON_CH2: 0x91,
  NOTE_OFF_CH2: 0x81,
  CC_CH2: 0xb1,

  // Device name pattern for detection
  DEVICE_NAME_PATTERN: /DDJ-200/i,
} as const;

// ============================================================================
// Default States
// ============================================================================

export const DEFAULT_EQ: EQSettings = {
  high: 0,
  mid: 0,
  low: 0,
};

export const DEFAULT_MASTER: MasterSettings = {
  volume: 1,
  eq: { ...DEFAULT_EQ },
};

export const DEFAULT_DECK_STATE: DeckState = {
  videoId: '',
  title: '',
  artist: '',
  playing: false,
  lyrics: '',
  eq: { ...DEFAULT_EQ },
  gain: 1,
  filter: 0,
  currentTime: 0,
  duration: 0,
  seekTo: null,
  playbackRate: 1.0,
};

export const DEFAULT_DJ_STATE: DJStoreState = {
  crossfaderValue: 0.5,
  crossfaderCurve: 'linear',
  deckA: { ...DEFAULT_DECK_STATE },
  deckB: { ...DEFAULT_DECK_STATE },
  master: { ...DEFAULT_MASTER },
  audioEngineStarted: false,
  isMidiConnected: false,
};
