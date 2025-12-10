import { useDJStore } from '../stores/djStore';
import { EQKnobGroup } from './EQKnob';
import { Button } from '@/components/ui/button';

interface MixerCenterProps {
  className?: string;
}

/**
 * MixerCenter component - Central mixer controls
 *
 * Features:
 * - Horizontal crossfader
 * - MIDI status
 * - Functional EQ knobs for each deck and master
 */
export function MixerCenter({ className = '' }: MixerCenterProps) {
  const crossfaderValue = useDJStore((state) => state.crossfaderValue);
  const isMidiConnected = useDJStore((state) => state.isMidiConnected);
  const deckA = useDJStore((state) => state.deckA);
  const deckB = useDJStore((state) => state.deckB);
  const master = useDJStore((state) => state.master);
  const setCrossfader = useDJStore((state) => state.setCrossfader);
  const setDeckAEQ = useDJStore((state) => state.setDeckAEQ);
  const setDeckBEQ = useDJStore((state) => state.setDeckBEQ);
  const setMasterEQ = useDJStore((state) => state.setMasterEQ);

  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCrossfader(parseFloat(e.target.value));
  };

  return (
    <div className={`flex flex-col bg-neutral-900/95 border border-neutral-700/50 rounded-xl shadow-2xl backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-neutral-700/50">
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Mixer</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isMidiConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'
            }`}
          />
          <span className="text-[10px] text-neutral-500">
            {isMidiConnected ? 'MIDI' : ''}
          </span>
        </div>
      </div>

      {/* EQ Section */}
      <div className="flex-1 flex items-start justify-center gap-3 p-4 border-b border-neutral-700/50">
        {/* Deck A EQ */}
        <EQKnobGroup
          label="DECK A"
          high={deckA.eq.high}
          mid={deckA.eq.mid}
          low={deckA.eq.low}
          onHighChange={(v) => setDeckAEQ({ high: v })}
          onMidChange={(v) => setDeckAEQ({ mid: v })}
          onLowChange={(v) => setDeckAEQ({ low: v })}
          color="blue"
        />

        {/* Master EQ */}
        <EQKnobGroup
          label="MASTER"
          high={master.eq.high}
          mid={master.eq.mid}
          low={master.eq.low}
          onHighChange={(v) => setMasterEQ({ high: v })}
          onMidChange={(v) => setMasterEQ({ mid: v })}
          onLowChange={(v) => setMasterEQ({ low: v })}
          color="red"
        />

        {/* Deck B EQ */}
        <EQKnobGroup
          label="DECK B"
          high={deckB.eq.high}
          mid={deckB.eq.mid}
          low={deckB.eq.low}
          onHighChange={(v) => setDeckBEQ({ high: v })}
          onMidChange={(v) => setDeckBEQ({ mid: v })}
          onLowChange={(v) => setDeckBEQ({ low: v })}
          color="red"
        />
      </div>

      {/* Crossfader Section */}
      <div className="flex flex-col items-center p-4 space-y-3">
        {/* Crossfader track */}
        <div className="relative w-full h-14 py-2">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 bg-gradient-to-r from-blue-600 via-neutral-700 to-red-600 rounded-full shadow-inner" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={crossfaderValue}
            onChange={handleCrossfaderChange}
            aria-label="Crossfader"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          {/* Custom thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-12 bg-gradient-to-b from-neutral-100 to-neutral-300 rounded-md shadow-xl pointer-events-none border border-neutral-400"
            style={{ left: `calc(${crossfaderValue * 100}% - 10px)` }}
          />
        </div>

        {/* Value display */}
        <div className="text-sm font-mono font-medium flex gap-4">
          <span className="text-blue-400">A: {Math.round((crossfaderValue <= 0.5 ? 1 : 1 - (crossfaderValue - 0.5) * 2) * 100)}%</span>
          <span className="text-red-400">B: {Math.round((crossfaderValue >= 0.5 ? 1 : crossfaderValue * 2) * 100)}%</span>
        </div>

        {/* Quick position buttons */}
        <div className="flex gap-2 w-full mt-1">
          <Button
            variant="ghost"
            onClick={() => setCrossfader(0)}
            className="flex-1 py-2 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/30 hover:border-blue-500"
          >
            ◀ A
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCrossfader(0.5)}
            className="flex-1 py-2 text-xs font-semibold bg-neutral-700/50 hover:bg-neutral-600 text-neutral-400 hover:text-white border border-neutral-600/30 hover:border-neutral-500"
          >
            MID
          </Button>
          <Button
            variant="ghost"
            onClick={() => setCrossfader(1)}
            className="flex-1 py-2 text-xs font-semibold bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 hover:border-red-500"
          >
            B ▶
          </Button>
        </div>
      </div>
    </div>
  );
}
