import { useEffect, useRef, useState, useCallback } from 'react';

interface WaveformSeekBarProps {
  videoId: string | null;
  currentTime: number;
  duration: number;
  color: string;
  playedColor?: string;
  backgroundColor?: string;
  height?: number;
  onSeek: (time: number) => void;
  onBpmDetected?: (bpm: number) => void;
  className?: string;
  /** Zoom level - how many seconds of audio visible on screen (default: 30) */
  zoomSeconds?: number;
}

interface WaveformData {
  videoId: string;
  waveform: number[];
  duration: number;
  bpm?: number;
  cached: boolean;
  synthetic?: boolean;
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * WaveformSeekBar - DJ-style scrolling waveform visualization
 * 
 * The playhead stays fixed in the center while the waveform scrolls past.
 * Click anywhere to seek to that position.
 */
export function WaveformSeekBar({
  videoId,
  currentTime,
  duration,
  color,
  playedColor,
  backgroundColor = 'transparent',
  height = 60,
  onSeek,
  onBpmDetected,
  className = '',
  zoomSeconds = 30,
}: WaveformSeekBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const [containerWidth, setContainerWidth] = useState(300);
  
  // Smooth animation state
  const smoothTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // Very high sample count for detailed waveform
  const sampleCount = 8000;

  // Cubic interpolation for smooth analog wave
  const cubicInterpolate = useCallback((p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }, []);

  // Get interpolated value at any position in the waveform
  const getInterpolatedValue = useCallback((data: number[], position: number): number => {
    if (data.length === 0) return 0.5;
    
    const idx = Math.floor(position);
    const t = position - idx;
    
    // Get 4 points for cubic interpolation
    const p0 = data[Math.max(0, idx - 1)] ?? data[0];
    const p1 = data[Math.max(0, Math.min(data.length - 1, idx))] ?? 0.5;
    const p2 = data[Math.min(data.length - 1, idx + 1)] ?? data[data.length - 1];
    const p3 = data[Math.min(data.length - 1, idx + 2)] ?? data[data.length - 1];
    
    return cubicInterpolate(p0, p1, p2, p3, t);
  }, [cubicInterpolate]);


  // Observe container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    setContainerWidth(container.offsetWidth);

    return () => observer.disconnect();
  }, []);

  // Fetch waveform data when videoId changes
  useEffect(() => {
    if (!videoId) {
      setWaveformData([]);
      setLoadingState('idle');
      return;
    }

    const fetchWaveform = async () => {
      setLoadingState('loading');
      setLoadingProgress(0);

      // Simulate progress while loading
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => Math.min(prev + Math.random() * 10, 90));
      }, 500);

      try {
        const response = await fetch(`/api/youtube/waveform?id=${videoId}&samples=${sampleCount}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: WaveformData = await response.json();
        
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setWaveformData(data.waveform);
        setLoadingState('loaded');
        
        // Notify parent of detected BPM
        if (data.bpm && onBpmDetected) {
          onBpmDetected(data.bpm);
        }
        
        // Debug: log waveform statistics
        const minVal = Math.min(...data.waveform);
        const maxVal = Math.max(...data.waveform);
        const avgVal = data.waveform.reduce((a, b) => a + b, 0) / data.waveform.length;
        console.log(`[Waveform] Loaded ${data.waveform.length} samples for ${videoId} (cached: ${data.cached}, synthetic: ${data.synthetic}, bpm: ${data.bpm || 'unknown'})`);
        console.log(`[Waveform] Stats - min: ${minVal.toFixed(3)}, max: ${maxVal.toFixed(3)}, avg: ${avgVal.toFixed(3)}`);
      } catch (error) {
        console.error('[Waveform] Failed to load:', error);
        clearInterval(progressInterval);
        setLoadingState('error');
        // Generate fallback animated waveform
        setWaveformData([]);
      }
    };

    fetchWaveform();
  }, [videoId, onBpmDetected]);

  // Normalize and enhance waveform data for better visualization
  const enhancedWaveform = useCallback((data: number[]): number[] => {
    if (data.length === 0) return [];
    
    // Find min and max for normalization
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    return data.map(val => {
      // Normalize to 0-1 range (0 = quiet, 1 = loud)
      let normalized = (val - min) / range;
      
      // Apply power curve to emphasize differences
      // Using 0.7 expands the visual difference between loud and quiet
      normalized = Math.pow(normalized, 0.7);
      
      return normalized;
    });
  }, []);

  // Draw waveform - DJ style with smooth scrolling
  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smooth interpolation for fluid animation
    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;
    
    // Lerp towards target time for smooth scrolling (higher = snappier, lower = smoother)
    const lerpFactor = Math.min(1, deltaTime * 0.015);
    smoothTimeRef.current += (currentTime - smoothTimeRef.current) * lerpFactor;
    
    const width = containerWidth;
    const actualHeight = height;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${actualHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, actualHeight);

    // Enhance waveform for better visualization
    const displayData = waveformData.length > 0 ? enhancedWaveform(waveformData) : [];
    
    const totalSamples = displayData.length || 100;
    // Use smoothed time for fluid scrolling
    const smoothProgress = duration > 0 ? smoothTimeRef.current / duration : 0;
    
    // Calculate visible range based on zoom
    const visibleRatio = Math.min(1, zoomSeconds / (duration || zoomSeconds));
    const visibleSamples = totalSamples * visibleRatio;
    
    // Playhead is fixed at center
    const playheadX = width / 2;
    const centerY = actualHeight / 2;
    
    // Calculate which samples are visible (centered on current position)
    const currentSample = smoothProgress * totalSamples;
    const halfVisible = visibleSamples / 2;
    const startSample = currentSample - halfVisible;
    
    // Number of points to draw per pixel for smoothness
    const pointsPerPixel = 2;
    
    // Helper to get value at any sample position with interpolation
    const getValueAt = (samplePos: number): number => {
      if (displayData.length === 0) {
        if (loadingState === 'loading') {
          // Loading animation
          const wave = Math.sin(Date.now() * 0.003 + samplePos * 0.1) * 0.3 + 0.5;
          return wave * (loadingProgress / 100);
        }
        return 0; // No data = no amplitude
      }
      
      // Out of range = silence (no amplitude)
      if (samplePos < 0 || samplePos >= totalSamples) {
        return 0;
      }
      
      return getInterpolatedValue(displayData, samplePos);
    };
    
    // Draw filled waveform (mirrored top and bottom like analog)
    const drawWaveformSection = (startX: number, endX: number, isPlayed: boolean) => {
      if (startX >= endX) return;
      
      ctx.beginPath();
      
      // Draw top half - value is 0-1 representing amplitude (loudness)
      let firstPoint = true;
      for (let px = startX; px <= endX; px += 1 / pointsPerPixel) {
        const samplePos = startSample + (px / width) * visibleSamples;
        const value = getValueAt(samplePos);
        
        // Value is 0-1 where 1 is loudest - convert to height from center
        // Multiply by 0.9 to leave some padding
        const amplitude = value * actualHeight * 0.45;
        const y = centerY - amplitude;
        
        if (firstPoint) {
          ctx.moveTo(px, y);
          firstPoint = false;
        } else {
          ctx.lineTo(px, y);
        }
      }
      
      // Draw bottom half (mirror)
      for (let px = endX; px >= startX; px -= 1 / pointsPerPixel) {
        const samplePos = startSample + (px / width) * visibleSamples;
        const value = getValueAt(samplePos);
        
        const amplitude = value * actualHeight * 0.45;
        const y = centerY + amplitude;
        
        ctx.lineTo(px, y);
      }
      
      ctx.closePath();
      
      // Fill with gradient for analog look
      const gradient = ctx.createLinearGradient(0, 0, 0, actualHeight);
      const baseColor = isPlayed ? (playedColor || color) : color;
      const alpha = isPlayed ? 1 : 0.5;
      
      // Parse color and add alpha
      ctx.globalAlpha = alpha;
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, baseColor);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add glow/outline for more analog feel
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    
    // Draw played section (left of center)
    drawWaveformSection(0, playheadX, true);
    
    // Draw unplayed section (right of center)
    drawWaveformSection(playheadX, width, false);
    
    ctx.globalAlpha = 1;
    
    // Draw center line (zero crossing reference)
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw center playhead line
    ctx.fillStyle = playedColor || color;
    ctx.shadowColor = playedColor || color;
    ctx.shadowBlur = 10;
    ctx.fillRect(playheadX - 1.5, 0, 3, actualHeight);
    ctx.shadowBlur = 0;
    
    // Draw playhead triangle markers
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, actualHeight);
    ctx.lineTo(playheadX + 6, actualHeight);
    ctx.lineTo(playheadX, actualHeight - 8);
    ctx.closePath();
    ctx.fill();

  }, [waveformData, currentTime, duration, color, playedColor, backgroundColor, height, containerWidth, loadingState, loadingProgress, enhancedWaveform, zoomSeconds, getInterpolatedValue]);

  // Animation loop with timestamp for smooth interpolation
  useEffect(() => {
    const animate = (timestamp: number) => {
      draw(timestamp);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Handle click to seek - adjusted for scrolling waveform
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || duration <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Calculate how the click position relates to time
    // Center is current time, left is past, right is future
    const centerX = width / 2;
    const clickOffset = x - centerX; // negative = left of center (past), positive = right (future)
    
    // Calculate time offset based on zoom level
    const visibleDuration = Math.min(duration, zoomSeconds);
    const timePerPixel = visibleDuration / width;
    const timeOffset = clickOffset * timePerPixel;
    
    const seekTime = currentTime + timeOffset;
    onSeek(Math.max(0, Math.min(duration, seekTime)));
  };

  // Handle drag to seek
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return; // Only when mouse button is pressed
    handleClick(e);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Loading overlay */}
      {loadingState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-1 bg-neutral-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-current transition-all duration-300 rounded-full"
                style={{ width: `${loadingProgress}%`, color }}
              />
            </div>
            <span className="text-xs text-neutral-400">Analyzing audio...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-xs text-neutral-500">Waveform unavailable</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        height={height}
        className={`block w-full cursor-pointer ${!videoId ? 'opacity-30' : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />

      {/* Time display */}
      {duration > 0 && (
        <div className="absolute bottom-1 right-2 text-xs font-mono text-neutral-400 bg-black/50 px-1 rounded">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}
    </div>
  );
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
