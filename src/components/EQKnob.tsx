import { useCallback, useRef, useState, useEffect } from 'react';

interface EQKnobProps {
  label: string;
  value: number; // -1 to 1 (0 = neutral)
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'neutral';
  className?: string;
}

/**
 * EQKnob component - Rotary knob for EQ/gain control
 *
 * Features:
 * - Drag to rotate (vertical mouse movement)
 * - Double-click to reset to center
 * - Visual indicator line showing position
 * - Color feedback based on value
 */
export function EQKnob({
  label,
  value,
  onChange,
  size = 'md',
  color = 'red',
  className = '',
}: EQKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Size configurations
  const sizeConfig = {
    sm: { knob: 'w-6 h-6', label: 'text-[8px]', indicator: 'h-2 w-0.5' },
    md: { knob: 'w-8 h-8', label: 'text-[9px]', indicator: 'h-2.5 w-0.5' },
    lg: { knob: 'w-10 h-10', label: 'text-[10px]', indicator: 'h-3 w-1' },
  };

  // Color configurations
  const colorConfig = {
    red: {
      ring: 'border-red-600',
      indicator: 'bg-red-500',
      glow: 'shadow-red-500/50',
      label: 'text-red-400',
    },
    blue: {
      ring: 'border-blue-600',
      indicator: 'bg-blue-500',
      glow: 'shadow-blue-500/50',
      label: 'text-blue-400',
    },
    neutral: {
      ring: 'border-neutral-600',
      indicator: 'bg-neutral-400',
      glow: 'shadow-neutral-500/50',
      label: 'text-neutral-400',
    },
  };

  const config = sizeConfig[size];
  const colors = colorConfig[color];

  // Convert value (-1 to 1) to rotation angle (-135deg to 135deg)
  const rotation = value * 135;

  // Handle mouse down - start dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
    },
    [value]
  );

  // Handle double click - reset to center
  const handleDoubleClick = useCallback(() => {
    onChange(0);
  }, [onChange]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Vertical movement: up = increase, down = decrease
      const deltaY = dragStartY.current - e.clientY;
      // Sensitivity: 100px of movement = full range (-1 to 1)
      const sensitivity = 0.02;
      const newValue = Math.max(-1, Math.min(1, dragStartValue.current + deltaY * sensitivity));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  // Determine if value is boosted, cut, or neutral
  const isActive = Math.abs(value) > 0.05;
  const isBoosted = value > 0.05;
  const isCut = value < -0.05;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Label */}
      <span className={`${config.label} ${colors.label} uppercase tracking-wider font-medium`}>
        {label}
      </span>

      {/* Knob */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className={`
          ${config.knob} 
          rounded-full 
          bg-gradient-to-b from-neutral-700 to-neutral-900
          border-2 ${isActive ? colors.ring : 'border-neutral-700'}
          ${isActive ? `shadow-md ${colors.glow}` : ''}
          cursor-pointer 
          select-none
          transition-all duration-100
          flex items-center justify-center
          relative
          ${isDragging ? 'scale-110' : 'hover:scale-105'}
        `}
        title={`${label}: ${value > 0 ? '+' : ''}${(value * 100).toFixed(0)}%\nDouble-click to reset`}
      >
        {/* Center dot */}
        <div className="absolute w-1 h-1 rounded-full bg-neutral-600" />

        {/* Indicator line */}
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div
            className={`
              ${config.indicator}
              rounded-full
              ${isBoosted ? colors.indicator : isCut ? 'bg-orange-500' : 'bg-neutral-500'}
            `}
          />
        </div>
      </div>

      {/* Value display (on hover/drag) */}
      {isDragging && (
        <span className="text-[8px] text-white font-mono bg-black/80 px-1 rounded">
          {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

/**
 * EQKnobGroup - A group of HI/MID/LOW knobs for a channel
 */
interface EQKnobGroupProps {
  label: string;
  high: number;
  mid: number;
  low: number;
  onHighChange: (value: number) => void;
  onMidChange: (value: number) => void;
  onLowChange: (value: number) => void;
  color?: 'red' | 'blue' | 'neutral';
  className?: string;
}

export function EQKnobGroup({
  label,
  high,
  mid,
  low,
  onHighChange,
  onMidChange,
  onLowChange,
  color = 'neutral',
  className = '',
}: EQKnobGroupProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
      <div className="flex flex-col gap-1">
        <EQKnob label="HI" value={high} onChange={onHighChange} size="sm" color={color} />
        <EQKnob label="MID" value={mid} onChange={onMidChange} size="sm" color={color} />
        <EQKnob label="LOW" value={low} onChange={onLowChange} size="sm" color={color} />
      </div>
    </div>
  );
}
