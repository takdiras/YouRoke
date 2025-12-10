import { useEffect, useRef, useCallback, useState } from 'react';
import { DDJ200 } from '../types';
import { midiToNormalized } from '../utils/crossfaderCurve';

interface MidiControllerCallbacks {
  onCrossfaderChange?: (value: number) => void;
  onDeckAPlayToggle?: () => void;
  onDeckBPlayToggle?: () => void;
  onDeckACue?: () => void;
  onDeckBCue?: () => void;
}

interface UseMidiControllerReturn {
  isMidiConnected: boolean;
  isMidiSupported: boolean;
  midiDeviceName: string | null;
  requestMidiAccess: () => Promise<void>;
}

/**
 * Custom hook for Web MIDI API integration with Pioneer DDJ-200
 *
 * Handles:
 * - MIDI device detection and connection
 * - Crossfader CC messages (CC 51)
 * - Play button Note On messages (Note 11 on Ch1/Ch2)
 * - Console logging for unmapped messages (for future expansion)
 */
export function useMidiController(
  callbacks: MidiControllerCallbacks = {}
): UseMidiControllerReturn {
  const [isMidiConnected, setIsMidiConnected] = useState(false);
  const [isMidiSupported, setIsMidiSupported] = useState(true);
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  /**
   * Parse and handle incoming MIDI messages
   */
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0];
    const data1 = data[1];
    const data2 = data.length > 2 ? data[2] : 0;

    // Extract message type and channel from status byte
    const messageType = status & 0xf0;
    const channel = status & 0x0f;

    // Log all incoming MIDI for debugging/mapping
    console.log(
      `[MIDI] Status: 0x${status.toString(16).toUpperCase()} ` +
        `(Type: 0x${messageType.toString(16).toUpperCase()}, Ch: ${channel + 1}) ` +
        `Data1: ${data1} Data2: ${data2}`
    );

    // Handle Control Change messages
    if (messageType === 0xb0) {
      // CC message
      if (data1 === DDJ200.CROSSFADER_CC) {
        // Crossfader
        const normalizedValue = midiToNormalized(data2);
        console.log(`[MIDI] Crossfader: ${normalizedValue.toFixed(3)}`);
        callbacksRef.current.onCrossfaderChange?.(normalizedValue);
        return;
      }
    }

    // Handle Note On messages (velocity > 0)
    if (messageType === 0x90 && data2 > 0) {
      // Note On (velocity > 0)
      if (data1 === DDJ200.DECK_A_PLAY_NOTE) {
        if (channel === 0) {
          // Channel 1 - Deck A
          console.log('[MIDI] Deck A Play pressed');
          callbacksRef.current.onDeckAPlayToggle?.();
          return;
        } else if (channel === 1) {
          // Channel 2 - Deck B
          console.log('[MIDI] Deck B Play pressed');
          callbacksRef.current.onDeckBPlayToggle?.();
          return;
        }
      }

      if (data1 === DDJ200.DECK_A_CUE_NOTE) {
        if (channel === 0) {
          console.log('[MIDI] Deck A Cue pressed');
          callbacksRef.current.onDeckACue?.();
          return;
        } else if (channel === 1) {
          console.log('[MIDI] Deck B Cue pressed');
          callbacksRef.current.onDeckBCue?.();
          return;
        }
      }
    }

    // Log unmapped messages for future mapping
    console.log('[MIDI] Unmapped message - add handling if needed');
  }, []);

  /**
   * Set up MIDI input listeners
   */
  const setupMidiInputs = useCallback(
    (midiAccess: MIDIAccess) => {
      let foundDevice = false;

      midiAccess.inputs.forEach((input) => {
        console.log(`[MIDI] Found input device: "${input.name}"`);

        // Check if this is the DDJ-200
        if (input.name && DDJ200.DEVICE_NAME_PATTERN.test(input.name)) {
          console.log(`[MIDI] ✓ Connected to DDJ-200: "${input.name}"`);
          input.onmidimessage = handleMidiMessage;
          setMidiDeviceName(input.name);
          foundDevice = true;
        } else {
          // Also connect to other devices for flexibility
          input.onmidimessage = handleMidiMessage;
          if (!foundDevice) {
            setMidiDeviceName(input.name || 'Unknown MIDI Device');
            foundDevice = true;
          }
        }
      });

      setIsMidiConnected(foundDevice);

      if (!foundDevice) {
        console.log('[MIDI] No MIDI input devices found');
        setMidiDeviceName(null);
      }
    },
    [handleMidiMessage]
  );

  /**
   * Handle MIDI device state changes (connect/disconnect)
   */
  const handleStateChange = useCallback(
    (event: MIDIConnectionEvent) => {
      console.log(
        `[MIDI] Device ${event.port?.state}: "${event.port?.name}" (${event.port?.type})`
      );

      if (midiAccessRef.current) {
        setupMidiInputs(midiAccessRef.current);
      }
    },
    [setupMidiInputs]
  );

  /**
   * Request MIDI access from the browser
   */
  const requestMidiAccess = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      console.warn('[MIDI] Web MIDI API not supported in this browser');
      setIsMidiSupported(false);
      return;
    }

    try {
      console.log('[MIDI] Requesting MIDI access...');
      const midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      midiAccessRef.current = midiAccess;
      midiAccess.onstatechange = handleStateChange;

      setupMidiInputs(midiAccess);
      console.log('[MIDI] MIDI access granted');
    } catch (error) {
      console.error('[MIDI] Failed to get MIDI access:', error);
      setIsMidiConnected(false);
    }
  }, [handleStateChange, setupMidiInputs]);

  // Auto-request MIDI access on mount
  useEffect(() => {
    // Use a flag to prevent state updates after unmount
    let mounted = true;

    const initMidi = async () => {
      if (!navigator.requestMIDIAccess) {
        console.warn('[MIDI] Web MIDI API not supported in this browser');
        if (mounted) setIsMidiSupported(false);
        return;
      }

      try {
        console.log('[MIDI] Requesting MIDI access...');
        const midiAccess = await navigator.requestMIDIAccess({ sysex: false });

        if (!mounted) return;

        midiAccessRef.current = midiAccess;
        midiAccess.onstatechange = handleStateChange;

        setupMidiInputs(midiAccess);
        console.log('[MIDI] MIDI access granted');
      } catch (error) {
        console.error('[MIDI] Failed to get MIDI access:', error);
        if (mounted) setIsMidiConnected(false);
      }
    };

    initMidi();

    return () => {
      mounted = false;
      // Cleanup: remove listeners
      if (midiAccessRef.current) {
        midiAccessRef.current.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
        midiAccessRef.current.onstatechange = null;
      }
    };
  }, [handleStateChange, setupMidiInputs]);

  return {
    isMidiConnected,
    isMidiSupported,
    midiDeviceName,
    requestMidiAccess,
  };
}
