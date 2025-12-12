# YouRoke 🎵

**Professional DJ mixing application for YouTube videos**

YouRoke transforms your browser into a full-featured DJ setup with dual-deck mixing, real-time crossfading, MIDI controller support, and multi-window projector output.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19.2-61dafb)

## ✨ Features

### 🎛️ Professional DJ Controls
- **Dual-deck system** with independent playback controls for Deck A and Deck B
- **Real-time crossfader** with volume and visual opacity mixing
- **3-band EQ** (High/Mid/Low) per deck plus master EQ
- **Gain control** (0-150%) per deck with visual feedback
- **Waveform visualization** with seek capability and BPM detection
- **Playback rate control** (0.5x - 2.0x speed)

### 🎹 MIDI Controller Support
- **Pioneer DDJ-200** integration via Web MIDI API
- **Hardware crossfader** control (CC 51)
- **Play/pause buttons** mapped to both decks (Note 11)
- Auto-detection and connection on startup
- Extensible mapping for additional controls

### 📺 Multi-Window Projector Mode
- **Separate projector window** for external displays/projectors
- **Real-time synchronization** via BroadcastChannel API
- **Fullscreen-ready** visual output (no controls)
- **Crossfaded video** with synchronized playback

### 🎥 YouTube Integration
- **Search and browse** YouTube directly from the app
- **Playlist management** with drag-and-drop loading to decks
- **Metadata extraction** (title, artist, duration, thumbnails)
- **Waveform generation** from audio analysis
- **BPM detection** using autocorrelation (60-180 BPM range)

### 🎤 Lyrics Display
- Real-time lyrics panel (when available)
- Compact mode for space-saving layout

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) runtime (recommended) or Node.js 18+
- Modern browser with Web MIDI API support (Chrome, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/takdiras/YouRoke.git
cd YouRoke

# Install dependencies
bun install
```

### Development

```bash
# Start development server with hot reload
bun dev

# Open http://localhost:5173 in your browser
```

### Building for Production

```bash
# TypeScript compilation + Vite build
bun build

# Preview production build
bun preview
```

### Linting

```bash
# Run ESLint
bun lint
```

## 🎮 Usage

### Basic Mixing
1. **Search for tracks** in the Playlist panel (right side)
2. **Load tracks** to Deck A or Deck B by clicking the deck buttons
3. **Play/pause** using the play buttons or space bar
4. **Mix between decks** using the crossfader (center = both playing)
5. **Adjust EQ and gain** using the knobs on each deck

### MIDI Controller
1. **Connect your Pioneer DDJ-200** via USB
2. The app will **auto-detect** and show "MIDI Connected" status
3. Use **hardware controls**:
   - Crossfader → Mix between decks
   - Play buttons → Start/stop playback
   - All MIDI messages logged to console for mapping

### Projector Mode
1. Click **"Open Projector"** in the top bar
2. A new window opens with **video-only output**
3. **Drag window to projector** or external display
4. Press **F11 for fullscreen**
5. All mixing controls stay in the main window

### Keyboard Shortcuts
- **Space**: Play/pause current deck (context-aware)
- **F11**: Fullscreen (in projector window)

## 🏗️ Architecture

### Tech Stack
- **React 19** with TypeScript
- **Zustand** for state management (single store pattern)
- **Vite** (rolldown variant) for blazing-fast builds
- **Tailwind CSS** + **shadcn/ui** for UI components
- **react-youtube** for YouTube player embedding

### Key Design Patterns

#### State Management
- **Single source of truth**: All app state in `src/stores/djStore.ts`
- **Type-safe actions**: Defined in `src/types/index.ts`
- **Partial updates**: `updateDeckA({ playing: true })` merges state

#### Multi-Window Sync
- **BroadcastChannel API** for cross-window communication
- **Message types**: `FULL_STATE` (initial) and `STATE_UPDATE` (incremental)
- **Automatic sync**: Zustand subscription broadcasts all changes

#### YouTube Integration
- **Custom Vite middleware** in `server/youtube-api.ts`
- **Three endpoints**:
  - `/api/youtube/search?q=...` - Search videos
  - `/api/youtube/video/:videoId` - Fetch metadata
  - `/api/youtube/waveform/:videoId` - Generate waveform + BPM
- **Caching**: Waveforms cached in memory for performance

#### Crossfader Algorithm
- **"Center-full" curve**: Both decks at 100% volume in center position
- **Visual normalization**: Opacity adjusted so total = 100% (no brightness jumps)
- **Volume mapping**: Left half fades B in, right half fades A out

## 📁 Project Structure

```
YouRoke/
├── src/
│   ├── components/       # React components
│   │   ├── DeckControls.tsx       # Per-deck controls (play, EQ, gain)
│   │   ├── DeckDisplay.tsx        # Deck info display (title, artist, time)
│   │   ├── MixerCenter.tsx        # Crossfader controls
│   │   ├── VideoPlayer.tsx        # YouTube player wrapper
│   │   ├── PlaylistPanel.tsx      # Search & playlist management
│   │   ├── ProjectorView.tsx      # Projector window component
│   │   └── ui/                    # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   │   ├── useMidiController.ts   # Web MIDI API integration
│   │   ├── useBroadcastChannel.ts # Multi-window sync
│   │   └── useYouTubeMetadata.ts  # YouTube data fetching
│   ├── stores/           # Zustand state management
│   │   └── djStore.ts             # Main application store
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts               # All interfaces and types
│   └── utils/            # Utility functions
│       └── crossfaderCurve.ts     # Mixing math
├── server/               # Vite middleware
│   └── youtube-api.ts             # YouTube API proxy & waveform generation
└── public/               # Static assets
```

## 🔧 Configuration

### Vite Override
The project uses `rolldown-vite@7.2.5` for faster builds:

```json
{
  "devDependencies": {
    "vite": "npm:rolldown-vite@7.2.5"
  },
  "overrides": {
    "vite": "npm:rolldown-vite@7.2.5"
  }
}
```

### Path Alias
`@/` resolves to `src/` directory:
```typescript
import { Button } from '@/components/ui/button';
```

## 🎨 UI Theme

- **Dark background**: `bg-neutral-950` base
- **Neon red accents**: DJ aesthetic with red highlights
- **Glass morphism**: `backdrop-blur-sm` + `bg-black/80` panels
- **Fixed layout**: No scrolling, all controls fit in viewport

## 🐛 Troubleshooting

### MIDI Controller Not Connecting
1. Ensure browser supports Web MIDI (Chrome, Edge recommended)
2. Check USB connection to controller
3. Grant MIDI permissions when browser prompts
4. Check console for MIDI connection logs

### Audio Not Playing
1. Click **"Start Audio Engine"** button (browser autoplay policy)
2. Ensure videos are not region-blocked
3. Check browser console for YouTube API errors

### Projector Window Not Syncing
1. Ensure BroadcastChannel API is supported (modern browsers)
2. Windows must be from same origin (same domain/port)
3. Check browser console in both windows for errors

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow existing code patterns (see `.github/copilot-instructions.md`)
- Maintain deck symmetry (A/B features should be identical)
- Update types in `src/types/index.ts` before adding features
- Test with MIDI controller if modifying controller support

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **YouTube API** for video search and playback
- **Pioneer** for DDJ-200 MIDI specifications
- **shadcn/ui** for beautiful UI components
- **Zustand** for simple state management

## 🔗 Links

- [Web MIDI API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [react-youtube](https://github.com/tjallingt/react-youtube)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Made with ❤️ for DJs and music enthusiasts**
