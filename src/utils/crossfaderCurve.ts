import type { CrossfaderCurve, CrossfaderOutput } from '../types';

/**
 * Apply crossfader curve to get opacity and volume values for both decks
 * 
 * Uses a "both full in center" curve:
 * - At center (0.5): both decks at 100% volume, 50% opacity each
 * - Moving left: Deck B fades out, Deck A stays at 100%
 * - Moving right: Deck A fades out, Deck B stays at 100%
 *
 * @param value - Crossfader position (0.0 = full Deck A, 1.0 = full Deck B)
 * @param _curve - Curve type (ignored, always uses center-full curve)
 * @returns Opacity and volume values for both decks
 */
export function applyCurve(
  value: number,
  _curve: CrossfaderCurve
): CrossfaderOutput {
  // Clamp value to valid range
  const clampedValue = Math.max(0, Math.min(1, value));

  return applyCenterFullCurve(clampedValue);
}

/**
 * Center-full crossfade - both decks at 100% in the middle
 * - Center (0.5): A=100%, B=100% volume; A=50%, B=50% opacity
 * - Left (0.0): A=100%, B=0% volume; A=100%, B=0% opacity
 * - Right (1.0): A=0%, B=100% volume; A=0%, B=100% opacity
 * 
 * Opacity is normalized so total opacity = 100% (for proper blending)
 */
function applyCenterFullCurve(value: number): CrossfaderOutput {
  let deckAVolume: number;
  let deckBVolume: number;

  if (value <= 0.5) {
    // Left half: A stays at 100%, B fades in from 0% to 100%
    deckAVolume = 1;
    deckBVolume = value * 2; // 0 at 0, 1 at 0.5
  } else {
    // Right half: B stays at 100%, A fades out from 100% to 0%
    deckAVolume = (1 - value) * 2; // 1 at 0.5, 0 at 1
    deckBVolume = 1;
  }

  // Calculate opacity: normalize so total = 1 (100%)
  // This ensures proper visual blending
  const totalVolume = deckAVolume + deckBVolume;
  const deckAOpacity = totalVolume > 0 ? deckAVolume / totalVolume : 0.5;
  const deckBOpacity = totalVolume > 0 ? deckBVolume / totalVolume : 0.5;

  return {
    deckAOpacity,
    deckBOpacity,
    deckAVolume,
    deckBVolume,
  };
}

/**
 * Convert a 7-bit MIDI value (0-127) to normalized float (0.0-1.0)
 */
export function midiToNormalized(midiValue: number): number {
  return Math.max(0, Math.min(127, midiValue)) / 127;
}

/**
 * Convert normalized float (0.0-1.0) to volume percentage (0-100)
 */
export function normalizedToVolume(normalized: number): number {
  return Math.round(normalized * 100);
}
