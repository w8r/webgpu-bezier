# WebGPU Bezier Renderer

A high-performance WebGPU-based renderer for smooth Bezier curves with GPU tessellation. Creates beautiful flowing curves with real-time parameter adjustment.

## Features

- **GPU Tessellation**: Hardware-accelerated curve rendering with adjustable subdivision levels
- **Real-time Controls**: Interactive GUI powered by lil-gui for live parameter adjustment
- **High Performance**: Renders thousands of curves at 60+ FPS
- **Interactive Camera**: Mouse wheel zoom and click-drag panning
- **Live Statistics**: Real-time FPS and triangle count display

## Quick Start

```bash
npm install
npm run dev
```

Open your browser to `http://localhost:5173` and ensure WebGPU is supported.

## Controls

### GUI Panel
- **Curve Count**: Number of curves to render (1-10,000)
- **Segments per Curve**: Tessellation level (1-100)
- **Regenerate Curves**: Generate new random curve positions
- **Reset View**: Reset camera zoom and position
- **FPS**: Current frames per second (read-only)
- **Triangles**: Total triangle count (read-only)

### Mouse Controls
- **Wheel**: Zoom in/out
- **Click + Drag**: Pan camera
- **Right Click**: Disabled (prevents context menu)

## Technical Details

- **WebGPU**: Modern GPU API for high-performance rendering
- **TypeScript**: Full type safety and modern JavaScript features
- **Vite**: Fast development server and build tool
- **lil-gui**: Lightweight GUI library for real-time controls

## Browser Support

Requires a WebGPU-compatible browser:
- Chrome 113+ (enabled by default)
- Firefox 110+ (enable `dom.webgpu.enabled` in about:config)
- Safari 18+ (macOS/iOS)

## Build

```bash
npm run build
```

Output will be in the `dist/` directory.