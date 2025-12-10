import { useDJStore } from '../stores/djStore';
import { DeckControls } from './DeckControls';
import type { CrossfaderCurve } from '../types';

interface MixerControlsProps {
  className?: string;
}

/**
 * MixerControls component - main DJ mixer interface
 *
 * Features:
 * - Dual deck controls (A and B)
 * - Visual crossfader slider (mouse control)
 * - Crossfader curve selection (linear/cut)
 * - MIDI connection status indicator
 */
export function MixerControls({ className = '' }: MixerControlsProps) {
  const crossfaderValue = useDJStore((state) => state.crossfaderValue);
  const crossfaderCurve = useDJStore((state) => state.crossfaderCurve);
  const isMidiConnected = useDJStore((state) => state.isMidiConnected);
  const setCrossfader = useDJStore((state) => state.setCrossfader);
  const setCurve = useDJStore((state) => state.setCurve);

  /**
   * Handle crossfader slider change
   */
  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCrossfader(parseFloat(e.target.value));
  };

  /**
   * Handle curve selection
   */
  const handleCurveChange = (curve: CrossfaderCurve) => {
    setCurve(curve);
  };

  return (
    <div className={`${className}`}>
      {/* Main mixer layout */}
      <div className="flex gap-4">
        {/* Deck A Controls */}
        <DeckControls deck="A" className="flex-1" />

        {/* Center - Crossfader and controls */}
        <div className="w-48 flex flex-col items-center gap-4">
          {/* MIDI Status */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
            <div
              className={`w-3 h-3 rounded-full ${
                isMidiConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-400">
              {isMidiConnected ? 'MIDI Connected' : 'No MIDI'}
            </span>
          </div>

          {/* Crossfader */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="text-xs text-gray-500 mb-2">CROSSFADER</div>

            {/* Deck indicators */}
            <div className="flex justify-between w-full text-xs mb-1">
              <span className="text-blue-400 font-bold">A</span>
              <span className="text-red-400 font-bold">B</span>
            </div>

            {/* Slider track with gradient */}
            <div className="relative w-full">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={crossfaderValue}
                onChange={handleCrossfaderChange}
                aria-label="Crossfader"
                className="w-full h-8 cursor-pointer appearance-none bg-transparent
                  [&::-webkit-slider-runnable-track]:h-2 
                  [&::-webkit-slider-runnable-track]:rounded-full 
                  [&::-webkit-slider-runnable-track]:bg-gradient-to-r 
                  [&::-webkit-slider-runnable-track]:from-blue-600 
                  [&::-webkit-slider-runnable-track]:to-red-600
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-8 
                  [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:rounded 
                  [&::-webkit-slider-thumb]:cursor-pointer 
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:-mt-3
                  [&::-moz-range-track]:h-2 
                  [&::-moz-range-track]:rounded-full 
                  [&::-moz-range-track]:bg-gradient-to-r 
                  [&::-moz-range-track]:from-blue-600 
                  [&::-moz-range-track]:to-red-600
                  [&::-moz-range-thumb]:w-4 
                  [&::-moz-range-thumb]:h-8 
                  [&::-moz-range-thumb]:bg-white 
                  [&::-moz-range-thumb]:rounded 
                  [&::-moz-range-thumb]:cursor-pointer 
                  [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* Value display */}
            <div className="text-sm text-gray-400 mt-2 font-mono">
              {crossfaderValue < 0.5 ? (
                <span className="text-blue-400">
                  A: {Math.round((1 - crossfaderValue) * 100)}%
                </span>
              ) : crossfaderValue > 0.5 ? (
                <span className="text-red-400">
                  B: {Math.round(crossfaderValue * 100)}%
                </span>
              ) : (
                <span className="text-gray-400">CENTER</span>
              )}
            </div>
          </div>

          {/* Curve selector */}
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2 text-center">CURVE</div>
            <div className="flex gap-1">
              <button
                onClick={() => handleCurveChange('linear')}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                  crossfaderCurve === 'linear'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Linear
              </button>
              <button
                onClick={() => handleCurveChange('cut')}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                  crossfaderCurve === 'cut'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Cut
              </button>
            </div>
          </div>

          {/* Quick position buttons */}
          <div className="flex gap-1 w-full">
            <button
              onClick={() => setCrossfader(0)}
              className="flex-1 px-2 py-1 text-xs bg-blue-600/50 hover:bg-blue-600 text-white rounded transition-colors"
            >
              ← A
            </button>
            <button
              onClick={() => setCrossfader(0.5)}
              className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
            >
              MID
            </button>
            <button
              onClick={() => setCrossfader(1)}
              className="flex-1 px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 text-white rounded transition-colors"
            >
              B →
            </button>
          </div>
        </div>

        {/* Deck B Controls */}
        <DeckControls deck="B" className="flex-1" />
      </div>
    </div>
  );
}
