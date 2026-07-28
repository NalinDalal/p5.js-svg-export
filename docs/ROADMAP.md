# Roadmap

## Phase 1: Architecture & IR (Week 1) — IN PROGRESS
- [x] ARCHITECTURE.md
- [x] COMPATIBILITY.md
- [ ] KNOWN_LIMITATIONS.md
- [ ] Refactor to Intermediate Representation (IR)
  - [ ] `src/ir/types.ts` — DrawCommand, StyleState, Transform types
  - [ ] `src/recorder/contextWrapper.js` — Capture Canvas 2D calls → IR
  - [ ] `src/serializer/svgSerializer.js` — IR → SVG string
  - [ ] `src/optimizer/` — flattenTransforms, mergePaths, dedupeStyles
  - [ ] `src/api/publicApi.js` — beginSvg, endSvg, saveSvg, startRecording, stopRecording
- [ ] Capability matrix in README (auto-generated from tests)

## Phase 2: Core Features (Week 2)
- [ ] Transform stack (translate, rotate, scale, push, pop) → `<g transform>`
- [ ] Style tracking (fill, stroke, strokeWeight, opacity, noFill, noStroke)
- [ ] Text support (text, textSize, textAlign, textBaseline) → `<text>`
- [ ] Path support (beginShape, vertex, bezierVertex, quadraticVertex, endShape)
- [ ] Arc/ellipse with start/stop angles
- [ ] Image support (drawImage) → `<image href>`
- [ ] Recording mode (startRecording/stopRecording for interactive sketches)

## Phase 3: Testing Infrastructure (Week 2-3)
- [ ] `tests/goldens/` — reference SVGs for each primitive
- [ ] `tests/render.js` — headless render via p5.js in Node (jsdom or canvas)
- [ ] `tests/compare.js` — pixel/SVG diff, fail on regression
- [ ] CI: GitHub Actions workflow
- [ ] Visual regression: playwright/chromium compare

## Phase 4: Polish & Documentation (Week 3)
- [ ] Professional README with:
  - Why this exists / tradeoffs
  - Prior work comparison table
  - Benchmarks (commands vs time)
  - API reference
- [ ] Examples gallery
- [ ] TypeScript definitions (`.d.ts`)

## Phase 5: Advanced (Post-launch)
- [ ] Gradient/pattern support (linearGradient, radialGradient, pattern)
- [ ] Clip path support
- [ ] PDF serializer (reuse IR)
- [ ] DXF serializer (for CAD/CAM)
- [ ] Animation capture (multi-frame → SVG + SMIL or CSS animation)
- [ ] WebGL readback (experimental, via readPixels)

## Milestones

| Milestone | Target | Criteria |
|-----------|--------|----------|
| M1: IR complete | Week 1 end | `beginSvg()/endSvg()` works, golden tests pass |
| M2: Feature parity | Week 2 end | All COMPATIBILITY.md ✅ features have tests |
| M3: CI + goldens | Week 3 end | GitHub Actions passes, visual regression green |
| M4: v1.0 release | Week 3 end | README complete, npm publish, types published |