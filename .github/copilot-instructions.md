# YouRoke AI Development Guide

YouRoke is a browser-based DJ mixing application for YouTube videos, featuring dual-deck mixing, real-time crossfading, MIDI controller support, and multi-window projector output.

## Architecture Overview

### State Management (Zustand)
- **Single source of truth**: `src/stores/djStore.ts` manages all application state
- **Dual-deck architecture**: Separate `DeckState` for A/B with independent playback, EQ, gain, filters
- **Crossfader system**: Value (0-1) with curve types, controls both audio volume and video opacity
- **Type-first design**: All state shapes defined in `src/types/index.ts` with defaults

### Multi-Window Communication
- **BroadcastChannel API**: Main control window syncs state to projector window (`useBroadcastChannel` hook)
- **Projector view**: Separate window (`ProjectorView.tsx`) displays only video output, no controls
- **Message types**: `FULL_STATE` (initial sync), `STATE_UPDATE` (incremental changes)
- Open projector via `window.open('?projector=true', ...)` - check query params to determine view mode

### YouTube Integration
- **Custom Vite middleware**: `server/youtube-api.ts` provides three endpoints:
  - `/api/youtube/search?q=...` - Search using `youtube-search-api`
  - `/api/youtube/video/:videoId` - Fetch metadata with multiple scraping libraries
  - `/api/youtube/waveform/:videoId` - Generate waveform from audio stream (cached)
- **Waveform generation**: Analyzes MP3 byte energy with non-linear scaling (quiet parts compressed, loud parts detailed)
- **BPM detection**: Autocorrelation on onset envelope (60-180 BPM range)
- **react-youtube**: Embedded players in `VideoPlayer.tsx`, controlled via props (volume, opacity, seeking)

### MIDI Controller Support
- **Web MIDI API**: `useMidiController` hook detects Pioneer DDJ-200 controller
- **Message mapping**: CC 51 → crossfader, Note 11 Ch1/Ch2 → deck play buttons
- **Auto-connect**: Attempts connection on mount, all unmapped messages logged to console
- **Audio engine**: Requires user interaction to start (`startAudioEngine()` in store) due to browser autoplay policy

## Key Conventions

### Component Patterns
- **VideoPlayer wrapper**: Manages YouTube IFrame API, handles seeking (`seekTo` prop), time tracking (250ms interval)
- **Deck symmetry**: Always implement features for both Deck A and Deck B (use `updateDeckA`/`updateDeckB`)
- **EQ structure**: Three bands (high/mid/low) with -1 to +1 range, applied via store actions (`setDeckAEQ`, `setMasterEQ`)
- **Crossfader curves**: "Center-full" algorithm - both decks at 100% volume in middle, normalization for visual opacity

### State Updates
- **Direct mutations via Zustand actions**: Never mutate state directly, always use provided actions
- **Partial updates**: `updateDeckA({ playing: true })` merges into existing deck state
- **Seeking pattern**: Set `seekTo` value → `VideoPlayer` seeks → call `clearSeekA()` in `onSeekComplete`
- **Time tracking**: Decks maintain `currentTime`/`duration`, updated from `VideoPlayer` callbacks

### Styling
- **Tailwind + shadcn/ui**: Dark theme (bg-neutral-950), neon red accents for DJ aesthetic
- **Glass morphism**: `backdrop-blur-sm` + `bg-black/80` for panels
- **Fixed layout**: No scrolling, all controls fit in viewport (h-screen flex layouts)

## Development Workflow

### Commands
```bash
bun i                  # Install dependencies (using Bun)
bun dev                # Start dev server with YouTube API middleware
bun build              # TypeScript compilation + Vite build
bun lint               # ESLint with React hooks plugin
```

### Special Config
- **Vite override**: Uses `rolldown-vite@7.2.5` (specified in package.json overrides)
- **Middleware registration**: YouTube API routes added in `vite.config.ts` via `configureServer`
- **Path alias**: `@/` → `src/` directory

### Testing MIDI
1. Connect Pioneer DDJ-200 (or compatible controller)
2. Check browser console for MIDI connection status
3. Unmapped controls will log status/data1/data2 - use for adding new mappings
4. MIDI messages always logged with hex status and decimal values

## Common Tasks

### Adding a new deck control
1. Add state field to `DeckState` in `src/types/index.ts`
2. Add action to `DJStore` interface and implementation in `djStore.ts`
3. Create UI component in `src/components/` (see `EQKnob.tsx` for knob pattern)
4. Wire component to store action in parent (`DeckControls.tsx` or similar)

### Adding YouTube metadata
1. Extend `VideoResult` interface in `server/youtube-api.ts`
2. Update scraping logic in `/api/youtube/video/:videoId` endpoint
3. Use in `useYouTubeMetadata` hook or directly in `PlaylistPanel.tsx`

### Syncing new state to projector
1. State automatically syncs via Zustand subscription in `App.tsx`
2. Ensure new fields exist in `DJStoreState` type
3. `ProjectorView` receives all state - use new fields directly in render

## File Organization
- **`src/components/`**: UI components (Deck*, Mixer*, Playlist*, etc.)
- **`src/hooks/`**: Custom hooks (useMidiController, useBroadcastChannel, useYouTubeMetadata)
- **`src/stores/`**: Zustand store (single file)
- **`src/types/`**: TypeScript interfaces (centralized)
- **`src/utils/`**: Pure functions (crossfader curves)
- **`server/`**: Vite middleware (YouTube API proxies)
