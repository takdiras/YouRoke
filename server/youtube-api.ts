import type { Connect } from 'vite';
import youtubeSearch from 'youtube-search-api';
// @ts-expect-error - no types available
import yt from '@vreden/youtube_scraper';

interface VideoResult {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
}

interface YouTubeVideoDetails {
  title?: string;
  thumbnail?: {
    thumbnails?: { url: string }[];
  };
  lengthSeconds?: string;
  channel?: string;
}

// Cache for waveform data
const waveformCache = new Map<string, number[]>();

/**
 * Apply non-linear scaling to waveform values
 * Quiet parts (0-0.5) → compressed (0-0.2)
 * Loud parts (0.5-1.0) → expanded with detail (0.2-1.0)
 */
function applyDynamicScaling(value: number): number {
  // Threshold where we switch from compressed to detailed
  const threshold = 0.4;
  // Output value at threshold
  const thresholdOutput = 0.15;
  
  if (value < threshold) {
    // Quiet section: compress to small values
    // Map 0-0.4 → 0-0.15 (linear but compressed)
    return (value / threshold) * thresholdOutput;
  } else {
    // Loud section: expand to show detail
    // Map 0.4-1.0 → 0.15-1.0 (linear but expanded)
    const normalizedAboveThreshold = (value - threshold) / (1 - threshold);
    return thresholdOutput + normalizedAboveThreshold * (1 - thresholdOutput);
  }
}

/**
 * Generate waveform data from audio buffer (MP3 data)
 * For MP3, we analyze the raw byte energy as a proxy for amplitude
 */
function generateWaveformData(audioBuffer: Buffer, sampleCount: number = 200): number[] {
  const waveform: number[] = [];
  
  // Skip MP3 header (typically first ~100 bytes contain metadata)
  const headerOffset = Math.min(100, Math.floor(audioBuffer.length * 0.01));
  const dataLength = audioBuffer.length - headerOffset;
  const adjustedBytesPerSample = Math.floor(dataLength / sampleCount);
  
  for (let i = 0; i < sampleCount; i++) {
    const start = headerOffset + i * adjustedBytesPerSample;
    const end = Math.min(start + adjustedBytesPerSample, audioBuffer.length);
    
    let sum = 0;
    let count = 0;
    
    // For MP3, measure byte variance/energy as amplitude proxy
    // Higher byte values and more variance = louder audio
    for (let j = start; j < end; j++) {
      const byte = audioBuffer[j] || 0;
      // Measure deviation from 128 (center point for unsigned bytes)
      sum += Math.abs(byte - 128);
      count++;
    }
    
    // Average deviation - max possible is 128
    const avg = count > 0 ? sum / count : 0;
    // Normalize: divide by 80 to get 0-1 range for typical audio
    waveform.push(Math.min(1, avg / 80));
  }
  
  // First pass: normalize to 0-1 based on actual range
  const max = Math.max(...waveform);
  const min = Math.min(...waveform);
  const range = max - min;
  
  // If there's no meaningful audio, return near-zero
  if (max < 0.02) {
    return waveform.map(() => 0);
  }
  
  // Normalize to 0-1 range
  const normalized = range > 0.01 
    ? waveform.map(v => (v - min) / range)
    : waveform.map(v => v / max);
  
  // Apply non-linear scaling: quiet parts compressed, loud parts detailed
  return normalized.map(v => applyDynamicScaling(v));
}

/**
 * Detect BPM from waveform data using autocorrelation
 * Analyzes the periodicity in the amplitude envelope to find tempo
 */
function detectBPM(waveform: number[], durationSeconds: number): number {
  if (waveform.length < 100 || durationSeconds < 10) {
    return 0; // Not enough data
  }

  const samplesPerSecond = waveform.length / durationSeconds;
  
  // BPM range to search (60-180 BPM covers most music)
  const minBPM = 60;
  const maxBPM = 180;
  
  // Convert BPM to lag in samples
  const minLag = Math.floor((60 / maxBPM) * samplesPerSecond);
  const maxLag = Math.floor((60 / minBPM) * samplesPerSecond);
  
  // Calculate energy envelope (smooth the waveform)
  const windowSize = Math.max(3, Math.floor(samplesPerSecond / 20));
  const envelope: number[] = [];
  for (let i = 0; i < waveform.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j < Math.min(waveform.length, i + windowSize); j++) {
      sum += waveform[j];
      count++;
    }
    envelope.push(sum / count);
  }
  
  // Detect onsets (sudden increases in energy)
  const onsets: number[] = [];
  for (let i = 1; i < envelope.length; i++) {
    const diff = envelope[i] - envelope[i - 1];
    onsets.push(Math.max(0, diff));
  }
  
  // Autocorrelation to find periodicity
  let bestLag = 0;
  let bestCorrelation = 0;
  
  for (let lag = minLag; lag <= maxLag && lag < onsets.length / 2; lag++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < onsets.length - lag; i++) {
      correlation += onsets[i] * onsets[i + lag];
      count++;
    }
    
    if (count > 0) {
      correlation /= count;
      
      // Weight towards common tempos (120-130 BPM)
      const bpmAtLag = (60 * samplesPerSecond) / lag;
      const tempoWeight = 1 - Math.abs(bpmAtLag - 125) / 200;
      correlation *= (1 + tempoWeight * 0.3);
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }
  }
  
  if (bestLag === 0) {
    return 0;
  }
  
  // Convert lag to BPM
  const bpm = (60 * samplesPerSecond) / bestLag;
  
  // Round to nearest integer
  return Math.round(bpm);
}

/**
 * YouTube Search API middleware for Vite dev server
 */
export function youtubeApiMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    // Only handle /api/youtube/search requests
    if (!req.url?.startsWith('/api/youtube/search')) {
      return next();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = url.searchParams.get('q');

    if (!query) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing query parameter "q"' }));
      return;
    }

    try {
      console.log(`[YouTube API] Searching for: "${query}"`);
      
      const results = await youtubeSearch.GetListByKeyword(query, false, 50, [{ type: 'video' }]);
      
      const videos: VideoResult[] = [];
      
      for (const item of results.items || []) {
        try {
          if (!item.id) continue;
          
          videos.push({
            id: item.id,
            videoId: item.id,
            title: item.title || 'Unknown Title',
            thumbnail: item.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
            duration: item.length?.simpleText || '--:--',
            channel: item.channelTitle || 'Unknown Channel',
          });
        } catch (itemError) {
          console.warn('[YouTube API] Skipping item due to error:', itemError);
        }
      }

      console.log(`[YouTube API] Found ${videos.length} results`);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify(videos));
    } catch (error) {
      console.error('[YouTube API] Search error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Search failed', message: String(error) }));
    }
  };
}

/**
 * YouTube Video Info API middleware
 */
export function youtubeVideoMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    // Only handle /api/youtube/video requests
    if (!req.url?.startsWith('/api/youtube/video')) {
      return next();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const videoId = url.searchParams.get('id');

    if (!videoId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing query parameter "id"' }));
      return;
    }

    try {
      console.log(`[YouTube API] Getting video info: "${videoId}"`);
      
      const video = await youtubeSearch.GetVideoDetails(videoId) as YouTubeVideoDetails;
      
      if (!video) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Video not found' }));
        return;
      }

      const result: VideoResult = {
        id: videoId,
        videoId: videoId,
        title: video.title || 'Unknown Title',
        thumbnail: video.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        duration: video.lengthSeconds ? formatSeconds(parseInt(video.lengthSeconds)) : '--:--',
        channel: video.channel || 'Unknown Channel',
      };

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('[YouTube API] Video info error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to get video info', message: String(error) }));
    }
  };
}

/**
 * Format seconds to MM:SS
 */
function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * YouTube Waveform API middleware - generates waveform data from YouTube audio
 * Falls back to synthetic waveform if download fails
 */
export function youtubeWaveformMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    // Only handle /api/youtube/waveform requests
    if (!req.url?.startsWith('/api/youtube/waveform')) {
      return next();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const videoId = url.searchParams.get('id');
    const samples = parseInt(url.searchParams.get('samples') || '200');

    if (!videoId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing query parameter "id"' }));
      return;
    }

    // Check cache first
    const cacheKey = `${videoId}-${samples}`;
    if (waveformCache.has(cacheKey)) {
      console.log(`[YouTube Waveform] Cache hit for: "${videoId}"`);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ 
        videoId, 
        waveform: waveformCache.get(cacheKey),
        cached: true,
        synthetic: false 
      }));
      return;
    }

    try {
      console.log(`[YouTube Waveform] Generating waveform for: "${videoId}"`);
      
      let duration = 180; // Default 3 minutes
      let waveform: number[];
      let isSynthetic = false;

      try {
        // Try to get audio using @vreden/youtube_scraper
        const videoUrl = `https://youtube.com/watch?v=${videoId}`;
        console.log(`[YouTube Waveform] Fetching MP3 via vreden...`);
        
        const result = await yt.ytmp3(videoUrl, 128);
        
        if (!result.status || !result.download?.url) {
          throw new Error(result.message || 'Failed to get download URL');
        }
        
        // Get duration from metadata if available
        if (result.metadata?.duration) {
          const dur = result.metadata.duration;
          // Handle different duration formats
          if (typeof dur === 'number') {
            duration = dur;
          } else if (typeof dur === 'string') {
            // Parse duration string (e.g., "3:45" or "1:23:45")
            const parts = dur.split(':').map(Number);
            if (parts.length === 2) {
              duration = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }
        }
        
        console.log(`[YouTube Waveform] Got download URL (duration: ${duration}s), fetching audio...`);
        
        // Download the audio file with progress tracking and timeout
        const controller = new AbortController();
        const timeoutMs = 30000; // 30 second total timeout
        
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.log(`[YouTube Waveform] Download timed out after ${timeoutMs / 1000}s`);
        }, timeoutMs);
        
        const response = await fetch(result.download.url, { signal: controller.signal });
        
        if (!response.ok) {
          clearTimeout(timeoutId);
          throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
        }
        
        // Get content length for progress tracking
        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        
        // Stream the response with progress tracking
        const reader = response.body?.getReader();
        if (!reader) {
          clearTimeout(timeoutId);
          throw new Error('Failed to get response reader');
        }
        
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;
        let lastProgressTime = Date.now();
        let lastReceivedBytes = 0;
        
        // Progress logging interval
        const progressInterval = setInterval(() => {
          const now = Date.now();
          const bytesPerSecond = (receivedBytes - lastReceivedBytes) / ((now - lastProgressTime) / 1000);
          const progress = totalBytes > 0 ? ((receivedBytes / totalBytes) * 100).toFixed(1) : 'unknown';
          
          console.log(`[YouTube Waveform] Download progress: ${progress}% (${(receivedBytes / 1024).toFixed(0)}KB / ${totalBytes > 0 ? (totalBytes / 1024).toFixed(0) + 'KB' : '?'}) - ${(bytesPerSecond / 1024).toFixed(1)} KB/s`);
          
          // Check if download is stuck (no progress in stuckTimeoutMs)
          if (receivedBytes === lastReceivedBytes && receivedBytes > 0) {
            console.log(`[YouTube Waveform] Download appears stuck, aborting...`);
            controller.abort();
          }
          
          lastReceivedBytes = receivedBytes;
          lastProgressTime = now;
        }, 2000);
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            receivedBytes += value.length;
          }
        } finally {
          clearInterval(progressInterval);
          clearTimeout(timeoutId);
        }
        
        const audioBuffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
        
        console.log(`[YouTube Waveform] Download complete: ${(audioBuffer.length / 1024).toFixed(0)}KB`);
        
        if (audioBuffer.length < 1000) {
          throw new Error('Downloaded audio too small, might be an error response');
        }

        // Generate waveform from real audio
        waveform = generateWaveformData(audioBuffer, samples);
      } catch (downloadError) {
        console.warn(`[YouTube Waveform] Download failed, generating synthetic waveform:`, downloadError);
        // Generate synthetic waveform based on duration and video ID
        waveform = generateSyntheticWaveform(samples, duration, videoId);
        isSynthetic = true;
      }
      
      // Detect BPM from waveform
      const bpm = detectBPM(waveform, duration);
      console.log(`[YouTube Waveform] Detected BPM: ${bpm || 'unknown'}`);
      
      // Cache the result
      waveformCache.set(cacheKey, waveform);
      
      console.log(`[YouTube Waveform] Generated ${waveform.length} samples (duration: ${duration}s, synthetic: ${isSynthetic})`);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ 
        videoId, 
        waveform,
        duration,
        bpm,
        cached: false,
        synthetic: isSynthetic 
      }));
    } catch (error) {
      console.error('[YouTube Waveform] Error:', error);
      
      // Even on total failure, return a synthetic waveform
      const syntheticWaveform = generateSyntheticWaveform(samples, 180, videoId);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ 
        videoId,
        waveform: syntheticWaveform,
        duration: 180,
        cached: false,
        synthetic: true,
        error: String(error)
      }));
    }
  };
}

/**
 * Generate a realistic-looking synthetic waveform
 * Uses video ID hash and duration to create unique, deterministic patterns
 */
function generateSyntheticWaveform(samples: number, duration: number, videoId?: string): number[] {
  const waveform: number[] = [];
  
  // Create a seed based on video ID for consistent, unique waveforms per video
  let seed = duration * 1000;
  if (videoId) {
    for (let i = 0; i < videoId.length; i++) {
      seed += videoId.charCodeAt(i) * (i + 1) * 127;
    }
  }
  
  // Simple pseudo-random function based on seed
  const random = (x: number) => {
    const val = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
    return val - Math.floor(val);
  };
  
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    
    // Base wave - simulates typical audio envelope (intro -> body -> outro)
    let base = 0.35;
    if (t < 0.05) base = t * 7; // Fade in
    else if (t > 0.95) base = (1 - t) * 7; // Fade out
    else base += 0.15 * Math.sin(t * Math.PI); // Slightly louder in middle
    
    // Add multiple frequency components for realistic look
    const wave1 = Math.sin(t * 47 + seed * 0.01) * 0.12;
    const wave2 = Math.sin(t * 113 + seed * 0.007) * 0.08;
    const wave3 = Math.sin(t * 211 + seed * 0.003) * 0.06;
    
    // Add pseudo-random variation for texture
    const noise = (random(i) - 0.5) * 0.25;
    
    // Combine all components
    let value = base + wave1 + wave2 + wave3 + noise;
    
    // Clamp to valid range
    value = Math.max(0.08, Math.min(1, Math.abs(value)));
    
    // Add occasional peaks (simulating beats/transients)
    const beatPattern = random(i * 0.1);
    if (beatPattern > 0.85) {
      value = Math.min(1, value * (1.2 + beatPattern * 0.5));
    }
    
    // Add sections (verse/chorus variation)
    const section = Math.floor(t * 8) % 4;
    if (section === 2 || section === 3) {
      value *= 1.1; // Chorus is slightly louder
    }
    
    waveform.push(value);
  }
  
  return waveform;
}
