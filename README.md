# NodTurn 🎼

A browser-based sheet music reader with hands-free page turning using computer vision. Perfect for pianists, guitarists, and any musician who needs to keep their hands on their instrument.

## Overview

**NodTurn** eliminates the "page-turn gap" in musical performance by using your webcam to detect head gestures for hands-free page turning. No Bluetooth pedals, no interruptions—just you and your music.

## ✨ Features

- 📄 **PDF Music Library** - Import and organize your sheet music collection
- 🎯 **Hands-Free Page Turning** - Turn pages with deliberate head tilts using AI pose detection
- 🎨 **Dark Mode** - Invert colors for comfortable reading in low-light environments
- ⏱️ **Visual Metronome** - Silent pulsing indicator to help keep time
- 📱 **Responsive Design** - Works on laptops, tablets, and desktop displays
- 💾 **Offline Storage** - Your music library stays in your browser (IndexedDB)
- ⚡ **Real-time AI** - MoveNet Lightning for fast, accurate gesture detection

## Technology Stack

- **Framework**: React Router v7
- **AI/ML**: TensorFlow.js + MoveNet Pose Detection
- **PDF Rendering**: React PDF (PDF.js)
- **State Management**: Zustand
- **Storage**: IDB-Keyval (IndexedDB)
- **Styling**: Tailwind CSS + Shadcn/ui
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A modern browser with WebGL support
- Webcam (for hands-free gesture control)

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## How It Works

1. **Import Music** - Drag and drop PDF files into your library
2. **Start Performing** - Open a score to enter performance mode
3. **Automatic Calibration** - The system calibrates to your natural head position (first 30 frames)
4. **Gesture Control** - Tilt your head deliberately to turn pages:
   - **Left tilt** (hold 800ms) → Next page
   - **Right tilt** (hold 800ms) → Previous page
5. **Smart Detection** - Built-in safeguards prevent false triggers:
   - 45° angle threshold from neutral
   - 15° dead zone for natural movements
   - 800ms sustained hold requirement
   - 1.5 second cooldown between turns

## Project Structure

```
app/
  ├── components/      # UI components (PDF viewer, controls, webcam)
  ├── hooks/          # Custom React hooks (pose detection, head tracking)
  ├── routes/         # Route components (library, perform)
  ├── stores/         # Zustand state stores
  ├── types/          # TypeScript type definitions
  └── utils/          # Utility functions (gesture math, PDF metadata)
docs/
  ├── PRD.md         # Product Requirements Document
  └── TRD.md         # Technical Requirements Document
```

## Configuration

Key settings are available in the app's settings panel:

- **Gesture Angle Threshold**: Minimum head tilt angle (default: 45°)
- **Hold Duration**: How long to hold the tilt (default: 800ms)
- **Cooldown**: Time between page turns (default: 1500ms)
- **Metronome BPM**: Visual metronome speed (30-240 BPM)
- **Dark Mode**: Invert PDF colors

## Browser Requirements

- Modern browser with WebGL 2.0 support
- Webcam access for gesture control
- Recommended: Chrome/Edge 90+, Firefox 88+, Safari 15+

## Documentation

- [Product Requirements Document (PRD)](./docs/PRD.md)
- [Technical Requirements Document (TRD)](./docs/TRD.md)

## License

Public project by Danny Dwi Cahyono

---

Built with ❤️ for musicians who need to keep their hands on their instruments.
