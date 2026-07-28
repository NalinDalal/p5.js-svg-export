# Compatibility Matrix

Verified against p5.js v2.x (ESM build from CDN).

| Feature | p5.js-svg | p5.plotSvg | p5.js-svg-export (this) |
|---------|-----------|------------|-------------------------|
| **Runtime SVG** (replace renderer) | ✅ | ❌ | ❌ |
| **Command capture / export** | ❌ | ✅ | ✅ |
| **Export after interaction** | ❌ | ✅ | ✅ (planned) |
| **Animation capture** (multi-frame) | ❌ | ❌ | ❌ |
| **WebGL / WEBGL mode** | ❌ | ❌ | ❌ |
| **SVG save/download** | ✅ | ✅ | ✅ |
| **p5 v2 support** | ❓ | planned | ✅ |
| **Transforms** (translate/rotate/scale/push/pop) | ✅ | ✅ | ✅ |
| **Styles** (fill/stroke/weight/opacity) | ✅ | ✅ | ✅ |
| **Text** (text/textSize/textAlign) | ✅ | partial | ✅ |
| **Images** (loadImage/drawImage) | ✅ | ❌ | ✅ |
| **Paths** (beginShape/vertex/bezierVertex) | ✅ | ✅ | ✅ |
| **Arcs** (arc/ellipse with angles) | ✅ | ✅ | ✅ |
| **Groups** (<g> with transform) | ✅ | ✅ | ✅ |
| **Gradients/Patterns** | partial | ❌ | ❌ |
| **Filters** (blur, etc.) | ❌ | ❌ | ❌ |
| **Clip paths** | partial | ❌ | ❌ |
| **Masks** | ❌ | ❌ | ❌ |
| **ForeignObject** | ❌ | ❌ | ❌ |
| **Font parity guarantee** | ❌ | ❌ | ❌ (documented) |
| **Headless/Node export** | ❌ | ❌ | ✅ (planned) |
| **Golden test infrastructure** | ❌ | ❌ | ✅ (planned) |
| **Optimizer** (flatten/merge/dedup) | ❌ | ❌ | ✅ (planned) |

## Notes

- **p5.js-svg** (zenozeng): Replaces the p5 renderer entirely. Full SVG runtime. Not compatible with Canvas 2D renderer. p5 v2 support uncertain.
- **p5.plotSvg** (golanlevin): Command capture for pen plotting. Focus on geometry, not visual fidelity. No text/images.
- **This project** (p5.js-svg-export): Command capture on Canvas 2D context. Visual fidelity priority. Headless-capable IR.

## Verification Method

Each cell marked ✅ has a working example in `examples/` and a golden test in `tests/goldens/`. Cells marked ❓ are unverified — treat as ❌ until proven.

Run verification:
```bash
npm run test:compat
```