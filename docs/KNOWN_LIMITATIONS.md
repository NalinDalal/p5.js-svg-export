# Known Limitations

## Fundamental (Architecture)

### 1. Canvas 2D → SVG Impedance Mismatch
Canvas 2D is immediate-mode, pixel-based. SVG is retained-mode, vector-based.
- **Compositing operations** (globalCompositeOperation) — no direct SVG equivalent for all modes
- **Shadows** (shadowBlur, shadowColor, shadowOffsetX/Y) — SVG filters differ; approximate only
- **Filters** (filter: blur(), etc.) — require `<filter>`; not implemented
- **Pixel manipulation** (getImageData, putImageData) — lost in vector export

### 2. Font Parity Not Guaranteed
- Canvas uses system font rendering; SVG uses `<text>` with font-family
- Kerning, hinting, subpixel positioning differ
- Custom fonts (@font-face) must be loaded in both environments
- **Workaround**: Convert text to paths via `textToPoints()` (p5.js) before export

### 3. Transform Precision
- Canvas transform matrix is applied per-draw-call; SVG uses `<g transform="matrix(...)"`
- Accumulated floating-point error differs between Canvas and SVG
- **Mitigation**: Flatten transforms at group boundaries (optimizer)

### 4. Image Handling
- Canvas `drawImage` captures image by reference (URL)
- SVG `<image href>` requires accessible URL at view time
- Data URLs work but bloat SVG
- Cross-origin images: Canvas allows (with CORS), SVG may block

## Current Implementation Gaps

### Not Yet Implemented
- [ ] `beginShape()` / `endShape()` with `CLOSE` — vertex recording incomplete
- [ ] `bezierVertex()` / `quadraticVertex()` — path command capture missing
- [ ] `arc()` with start/stop angles — partial (ellipse works, arc needs fix)
- [ ] `curveVertex()` / `curveTightness()` — Catmull-Rom not in SVG native
- [ ] `drawingContext` direct access — bypasses capture layer
- [ ] `blendMode()` / `globalCompositeOperation` — no SVG mapping
- [ ] `filter()` — requires SVG `<filter>` serialization
- [ ] `mask()` / `clip()` — requires `<mask>` / `<clipPath>`
- [ ] Gradients (`drawingContext.createLinearGradient`) — no capture
- [ ] Patterns (`drawingContext.createPattern`) — no capture
- [ ] `textFont()` with custom font — font-family serialization only
- [ ] `textStyle()` (bold/italic) — not tracked
- [ ] `textLeading()` / `textWrap()` — no SVG equivalent

### Verified Working (in current p5.svg.js)
- `line()`, `rect()`, `ellipse()`, `circle()`
- `fill()`, `stroke()`, `strokeWeight()`, `noFill()`, `noStroke()`
- `push()`, `pop()`, `translate()`, `rotate()`, `scale()`
- `text()` basic (position, size, align)
- `drawImage()` (by reference)

### Behavioral Differences from Canvas
| Canvas Behavior | SVG Export Behavior |
|-----------------|---------------------|
| Subpixel rendering | Coordinates rounded to 0.001 |
| Anti-aliasing automatic | Shape-rendering: auto (browser default) |
| Stroke inside/center/outside | Always center (SVG default) |
| Miter limit | Default 4 (SVG) vs 10 (Canvas) |

## p5.js Version Specific

### p5.js v2.x
- ESM-only distribution — addon must be ESM
- `registerAddon()` API — used correctly
- `_renderer.states` internal — may change; fragile
- WebGL2 renderer — not interceptable via 2D context

### p5.js v1.x (legacy)
- Not supported by this addon
- Global `p5` variable vs module import

## Performance

### Large Drawings
- IR grows linearly with draw calls
- 10,000+ commands → noticeable serialization delay
- **Optimization needed**: command batching, instancing for repeated shapes

### Memory
- Full IR retained until `endSvg()` or `stopRecording()`
- Long recordings (animation) → memory pressure
- **Planned**: Streaming serializer for animation capture

## Testing Gaps

- No automated visual regression
- No cross-browser SVG rendering comparison
- No golden tests for complex compositions
- No performance benchmarks

## Security

- `fetch()` in `loadSVG()` (import addon) — same-origin policy applies
- `URL.createObjectURL()` for blob download — revoked after use
- No sanitization of SVG output — trust p5.js draw calls only

## Future Work Required for "First-Class" Status

Per p5.js issue #4630, true native SVG support would require:
1. **Core integration** — not an addon; part of p5.js build
2. **SVG Renderer** — alternative to Canvas 2D / WebGL
3. **Consistent API** — `createCanvas(w, h, SVG)` returns SVGGraphics
4. **Server-side** — headless Node support without jsdom/canvas polyfill
5. **Spec compliance** — pass p5.js test suite on SVG renderer

This project is a **userland addon** demonstrating command capture approach. It cannot achieve full parity without core changes.