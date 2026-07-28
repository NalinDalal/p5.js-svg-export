# Architecture

## Pipeline

```
p5 draw call
    ↓
capture layer (context wrapper)
    ↓
intermediate draw model (IR)
    ↓
svg serializer
    ↓
optimizer
    ↓
download/export
```

## Why Not SVG Renderer

p5.js uses a Canvas 2D context for its default renderer. Replacing the renderer with an SVG-based one (like `p5.js-svg` does) means:

- **Forking the rendering pipeline** — every primitive must be reimplemented for SVG output
- **Divergent behavior** — Canvas and SVG have different semantics (e.g., compositing, hit regions, pixel-perfect alignment)
- **Maintenance burden** — must track p5.js core changes to both renderers

This project chooses **command capture** instead: intercept the existing Canvas 2D context, record drawing commands, and serialize to SVG afterward. The sketch renders to Canvas as normal; SVG is a byproduct.

## Why Not DOM SVG

Creating actual `<svg>` elements in the DOM during draw:

- **Performance** — DOM mutation per frame is slow
- **Layout thrashing** — reading back measurements forces reflow
- **Not portable** — tied to browser environment, can't run headless (Node, CI)

Command capture avoids DOM entirely until serialization.

## Why Capture Commands

| Approach | Pros | Cons |
|----------|------|------|
| Replace renderer | Native SVG output | Forks p5.js, high maintenance |
| DOM SVG during draw | Inspectable live | Slow, not headless |
| **Command capture (this)** | **Works with existing renderer, headless, replayable** | **Imperfect fidelity for advanced features** |

Capturing commands gives us:
- **Determinism** — same commands → same SVG
- **Replay** — re-serialize with different options (optimize, flatten, etc.)
- **Portability** — runs in Node for CI/golden tests
- **Extensibility** — add PDF, DXF, etc. serializers later

## What Is Deterministic

Given the same sequence of p5.js draw calls, the exported SVG will be identical. Non-deterministic sources are excluded:
- `random()` without fixed seed
- `millis()`, `frameCount` in drawing logic
- Image loading timing (images captured by reference, not embedded)

## Intermediate Representation (IR)

The IR is a flat array of draw commands with resolved styles and transforms:

```ts
type DrawCommand =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; style: StyleState }
  | { type: "rect"; x: number; y: number; w: number; h: number; radii?: Radii; style: StyleState }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number; style: StyleState }
  | { type: "arc"; cx: number; cy: number; rx: number; ry: number; start: number; stop: number; style: StyleState }
  | { type: "path"; d: string; style: StyleState }
  | { type: "text"; str: string; x: number; y: number; style: StyleState }
  | { type: "image"; href: string; x: number; y: number; w: number; h: number; style: StyleState }
  | { type: "group"; children: DrawCommand[]; transform: Transform }

interface StyleState {
  fill: string | null;        // null = noFill()
  stroke: string | null;      // null = noStroke()
  strokeWeight: number;
  strokeCap: CanvasLineCap;
  strokeJoin: CanvasLineJoin;
  opacity: number;
  font: string;
  fontSize: number;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

interface Transform {
  a: number; b: number; c: number; d: number; e: number; f: number; // matrix()
}
```

### Benefits

1. **Export later** — record now, serialize on demand
2. **Replay** — re-draw to another canvas or export multiple formats
3. **Optimize** — merge adjacent paths, flatten transforms, dedupe styles
4. **Future formats** — add PDF/DXF serializer without touching capture layer

## Directory Structure

```
src/
  recorder/       # Context wrapper, command capture
  ir/             # Type definitions, IR builders
  serializer/     # SVG serialization from IR
  optimizer/      # Transform flattening, path merging, style dedup
  api/            # Public API (beginSvg, endSvg, saveSvg, etc.)
```

## References

- [p5.js-svg](https://github.com/zenozeng/p5.js-svg) — replaces renderer with SVG
- [p5.plotSvg](https://github.com/golanlevin/p5.plotSvg) — command capture for pen plotting
- [p5.js issue #4630](https://github.com/processing/p5.js/issues/4630) — native SVG support request