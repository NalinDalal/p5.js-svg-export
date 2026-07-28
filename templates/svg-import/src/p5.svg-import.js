/**
 * p5.js SVG Import Addon
 *
 * Provides SVG import for p5.js sketches by parsing SVG files into p5.js shapes.
 * Supports: paths, rects, circles, ellipses, lines, polylines, polygons, text, groups
 *
 * Usage:
 *   loadSVG(url)       - Load SVG from URL or file path (async)
 *   parseSVG(str)      - Parse SVG string to shape array
 *   drawSVG(shapes)    - Draw shapes using p5 primitives (beginShape/vertex/endShape)
 *   getSVGShapes(el)   - Parse an SVG DOM element to shape array
 */

function p5SVGImport(p5, fn) {

  function parseTransform(transformAttr) {
    if (!transformAttr) return null;
    const matrix = [1, 0, 0, 1, 0, 0];
    const parts = transformAttr.match(
      /matrix\(([^)]+)\)|translate\(([^)]+)\)|scale\(([^)]+)\)|rotate\(([^)]+)\)/g
    );
    if (!parts) return matrix;
    for (const part of parts) {
      if (part.startsWith('matrix')) {
        const v = part.match(/matrix\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        if (v.length === 6) {
          const [a, b, c, d, e, f] = v;
          const r = [...matrix];
          matrix[0] = a * r[0] + c * r[1];
          matrix[1] = b * r[0] + d * r[1];
          matrix[2] = a * r[2] + c * r[3];
          matrix[3] = b * r[2] + d * r[3];
          matrix[4] = a * r[4] + c * r[5] + e;
          matrix[5] = b * r[4] + d * r[5] + f;
        }
      } else if (part.startsWith('translate')) {
        const v = part.match(/translate\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        matrix[4] += v[0];
        matrix[5] += v[1] || 0;
      } else if (part.startsWith('scale')) {
        const v = part.match(/scale\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        matrix[0] *= v[0];
        matrix[1] *= v[0];
        matrix[2] *= v[1] ?? v[0];
        matrix[3] *= v[1] ?? v[0];
      } else if (part.startsWith('rotate')) {
        const v = part.match(/rotate\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        const deg = v[0];
        const rad = (deg * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const r = [...matrix];
        matrix[0] = cosA * r[0] + sinA * r[1];
        matrix[1] = -sinA * r[0] + cosA * r[1];
        matrix[2] = cosA * r[2] + sinA * r[3];
        matrix[3] = -sinA * r[2] + cosA * r[3];
      }
    }
    return matrix;
  }

  function decomposeTransform(m) {
    if (!m) return null;
    const tx = m[4];
    const ty = m[5];
    const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
    const sy = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
    const angle = Math.atan2(m[1], m[0]) * (180 / Math.PI);
    return { tx, ty, sx, sy, angle };
  }

  function parsePathData(d) {
    const commands = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;
    while ((match = regex.exec(d)) !== null) {
      const cmd = match[1];
      const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      commands.push({ cmd, args });
    }
    return commands;
  }

  function pathToVertices(commands) {
    const vertices = [];
    let x = 0, y = 0;
    let startX = 0, startY = 0;
    let prevCp2 = null;

    for (const { cmd, args } of commands) {
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const px = (v, i) => (rel ? x + v[i] : v[i]);
      const py = (v, i) => (rel ? y + v[i + 1] : v[i + 1]);

      switch (C) {
        case 'M':
          for (let i = 0; i < args.length; i += 2) {
            x = px(args, i); y = py(args, i);
            if (i === 0) { startX = x; startY = y; }
            vertices.push({ x, y, type: i === 0 ? 'M' : 'L' });
          }
          break;
        case 'L':
          for (let i = 0; i < args.length; i += 2) {
            x = px(args, i); y = py(args, i);
            vertices.push({ x, y, type: 'L' });
          }
          break;
        case 'H':
          for (const a of args) { x = rel ? x + a : a; vertices.push({ x, y, type: 'L' }); }
          break;
        case 'V':
          for (const a of args) { y = rel ? y + a : a; vertices.push({ x, y, type: 'L' }); }
          break;
        case 'C':
          for (let i = 0; i < args.length; i += 6) {
            const cp1 = { x: px(args, i), y: py(args, i) };
            const cp2 = { x: px(args, i + 2), y: py(args, i + 3) };
            x = px(args, i + 4); y = py(args, i + 5);
            vertices.push({ x, y, cp1, cp2, type: 'C' });
            prevCp2 = cp2;
          }
          break;
        case 'S':
          for (let i = 0; i < args.length; i += 4) {
            const cp1 = prevCp2
              ? { x: 2 * x - prevCp2.x, y: 2 * y - prevCp2.y }
              : { x, y };
            const cp2 = { x: px(args, i), y: py(args, i + 1) };
            x = px(args, i + 2); y = py(args, i + 3);
            vertices.push({ x, y, cp1, cp2, type: 'C' });
            prevCp2 = cp2;
          }
          break;
        case 'Q':
          for (let i = 0; i < args.length; i += 4) {
            const cp1 = { x: px(args, i), y: py(args, i + 1) };
            x = px(args, i + 2); y = py(args, i + 3);
            vertices.push({ x, y, cp1, type: 'Q' });
            prevCp2 = null;
          }
          break;
        case 'T':
          for (let i = 0; i < args.length; i += 2) {
            const cp1 = prevCp2
              ? { x: 2 * x - prevCp2.x, y: 2 * y - prevCp2.y }
              : { x, y };
            x = px(args, i); y = py(args, i + 1);
            vertices.push({ x, y, cp1, type: 'Q' });
            prevCp2 = null;
          }
          break;
        case 'A':
          for (let i = 0; i < args.length; i += 7) {
            const rx = args[i], ry = args[i + 1];
            const rot = (args[i + 2] * Math.PI) / 180;
            const largeArc = args[i + 3];
            const sweep = args[i + 4];
            const ex = px(args, i + 5), ey = py(args, i + 6);
            const arcVerts = arcToBezier(x, y, ex, ey, rx, ry, rot, largeArc, sweep);
            vertices.push(...arcVerts);
            x = ex; y = ey;
          }
          break;
        case 'Z':
          vertices.push({ x: startX, y: startY, type: 'Z' });
          x = startX; y = startY;
          break;
      }
    }
    return vertices;
  }

  function arcToBezier(x1, y1, x2, y2, rx, ry, rotation, largeArc, sweep) {
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1c = cos * dx + sin * dy;
    const y1c = -sin * dx + cos * dy;
    let r = Math.sqrt((x1c * x1c) / (rx * rx) + (y1c * y1c) / (ry * ry));
    if (r > 1) { rx *= r; ry *= r; }
    const x2c = -x1c, y2c = -y1c;
    const s = largeArc !== sweep ? 1 : -1;
    const num = rx * rx * y1c * y1c + ry * ry * x1c * x1c;
    const cx = (x1c + x2c) / 2 + s * (ry * y1c) / num * (rx * rx * y1c * y1c - ry * ry * x1c * x1c);
    const cy = (y1c + y2c) / 2 - s * (rx * x1c) / num * (rx * rx * y1c * y1c - ry * ry * x1c * x1c);
    const ang1 = Math.atan2(y1c - cy, x1c - cx);
    const ang2 = Math.atan2(y2c - cy, x2c - cx);
    const segments = Math.ceil(Math.abs(ang2 - ang1) / (Math.PI / 2)) || 1;
    const dAng = (ang2 - ang1) / segments;

    const pts = [];
    for (let i = 0; i < segments; i++) {
      const a1 = ang1 + i * dAng, a2 = a1 + dAng;
      const sinD = Math.sin(dAng / 2), cosD = Math.cos(dAng / 2);
      const a = Math.sin(dAng * (i + 0.5)) / Math.sin(dAng / 2);
      pts.push({
        x: cx + rx * Math.cos(a2),
        y: cy + ry * Math.sin(a2),
        cp1: {
          x: cx + rx * (Math.cos(a1) - a * Math.sin(a1) * cosD / sinD),
          y: cy + ry * (Math.sin(a1) + a * Math.sin(a1) * sinD / cosD)
        },
        cp2: {
          x: cx + rx * (Math.cos(a2) + a * Math.sin(a2) * cosD / sinD),
          y: cy + ry * (Math.sin(a2) - a * Math.sin(a2) * sinD / cosD)
        },
        type: 'C'
      });
    }
    return pts;
  }

  function parseStyle(styleAttr, element) {
    const style = {};
    if (styleAttr) {
      for (const rule of styleAttr.split(';')) {
        const [prop, val] = rule.split(':').map(s => s.trim());
        if (prop && val) style[prop] = val;
      }
    }
    const getAttr = (name) => style[name] || element.getAttribute(name);
    style.fill = getAttr('fill') || 'black';
    style.stroke = getAttr('stroke');
    style.strokeWidth = getAttr('stroke-width');
    style.opacity = getAttr('opacity');
    style.fillOpacity = getAttr('fill-opacity');
    style.strokeOpacity = getAttr('stroke-opacity');
    if (style.fill === 'none') style.fill = null;
    if (style.stroke === 'none') style.stroke = null;
    return style;
  }

  function buildShapeData(type, vertices, style, transform) {
    return { type, vertices, style, transform, id: null, className: null };
  }

  function multiplyTransform(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
  }

  function parseSVGElement(element, shapes, parentTransform) {
     const tag = element.tagName.toLowerCase();
     const elementTransform = parseTransform(element.getAttribute('transform'));
     const composedTransform = elementTransform
       ? (parentTransform ? multiplyTransform(parentTransform, elementTransform) : elementTransform)
       : (parentTransform || [1, 0, 0, 1, 0, 0]);
     const style = parseStyle(element.getAttribute('style'), element);

     switch (tag) {
       case 'path': {
         const d = element.getAttribute('d');
         if (d) {
           const commands = parsePathData(d);
           const vertices = pathToVertices(commands);
           shapes.push(buildShapeData('path', vertices, style, composedTransform));
         }
         break;
       }
       case 'rect': {
         const rx = parseFloat(element.getAttribute('x')) || 0;
         const ry = parseFloat(element.getAttribute('y')) || 0;
         const w = parseFloat(element.getAttribute('width'));
         const h = parseFloat(element.getAttribute('height'));
         const crx = parseFloat(element.getAttribute('rx')) || 0;
         const cry = parseFloat(element.getAttribute('ry')) || crx;
         if (w && h) {
           const r = Math.max(crx, cry);
           const verts = [];
           if (r > 0) {
             verts.push(
               { x: rx + r, y: ry, type: 'M' },
               { x: rx + w - r, y: ry, type: 'L' },
               { x: rx + w, y: ry + r, cp1: { x: rx + w - r, y: ry }, type: 'Q' },
               { x: rx + w, y: ry + h - r, type: 'L' },
               { x: rx + w - r, y: ry + h, cp1: { x: rx + w, y: ry + h - r }, type: 'Q' },
               { x: rx + r, y: ry + h, type: 'L' },
               { x: rx, y: ry + h - r, cp1: { x: rx + r, y: ry + h }, type: 'Q' },
               { x: rx, y: ry + r, type: 'L' },
               { x: rx + r, y: ry, cp1: { x: rx, y: ry + r }, type: 'Q' }
             );
           } else {
             verts.push(
               { x: rx, y: ry, type: 'M' },
               { x: rx + w, y: ry, type: 'L' },
               { x: rx + w, y: ry + h, type: 'L' },
               { x: rx, y: ry + h, type: 'L' }
             );
           }
           verts.push({ x: rx, y: ry, type: 'Z' });
           shapes.push(buildShapeData('rect', verts, style, composedTransform));
         }
         break;
       }
       case 'circle': {
         const cx = parseFloat(element.getAttribute('cx')) || 0;
         const cy = parseFloat(element.getAttribute('cy')) || 0;
         const r = parseFloat(element.getAttribute('r'));
         if (r) {
           const verts = [];
           const n = 32;
           verts.push({ x: cx + r, y: cy, type: 'M' });
           for (let i = 1; i <= n; i++) {
             const ang = (i / n) * 2 * Math.PI;
             verts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang), type: 'L' });
           }
           verts.push({ x: cx + r, y: cy, type: 'Z' });
           shapes.push(buildShapeData('circle', verts, style, composedTransform));
         }
         break;
       }
       case 'ellipse': {
         const cx = parseFloat(element.getAttribute('cx')) || 0;
         const cy = parseFloat(element.getAttribute('cy')) || 0;
         const erx = parseFloat(element.getAttribute('rx'));
         const ery = parseFloat(element.getAttribute('ry'));
         if (erx && ery) {
           const verts = [];
           const n = 32;
           verts.push({ x: cx + erx, y: cy, type: 'M' });
           for (let i = 1; i <= n; i++) {
             const ang = (i / n) * 2 * Math.PI;
             verts.push({ x: cx + erx * Math.cos(ang), y: cy + ery * Math.sin(ang), type: 'L' });
           }
           verts.push({ x: cx + erx, y: cy, type: 'Z' });
           shapes.push(buildShapeData('ellipse', verts, style, composedTransform));
         }
         break;
       }
       case 'line': {
         const x1 = parseFloat(element.getAttribute('x1')) || 0;
         const y1 = parseFloat(element.getAttribute('y1')) || 0;
         const x2 = parseFloat(element.getAttribute('x2')) || 0;
         const y2 = parseFloat(element.getAttribute('y2')) || 0;
         shapes.push(buildShapeData('line', [
           { x: x1, y: y1, type: 'M' },
           { x: x2, y: y2, type: 'L' }
         ], { ...style, fill: style.stroke }, composedTransform));
         break;
       }
       case 'polyline': {
         const pts = element.getAttribute('points');
         if (!pts) break;
         const coords = pts.trim().split(/[\s,]+/).map(Number);
         const verts = [];
         for (let i = 0; i < coords.length; i += 2) {
           verts.push({ x: coords[i], y: coords[i + 1], type: i === 0 ? 'M' : 'L' });
         }
         shapes.push(buildShapeData('polyline', verts, style, composedTransform));
         break;
       }
       case 'polygon': {
         const pts = element.getAttribute('points');
         if (!pts) break;
         const coords = pts.trim().split(/[\s,]+/).map(Number);
         const verts = [{ x: coords[0], y: coords[1], type: 'M' }];
         for (let i = 2; i < coords.length; i += 2) {
           verts.push({ x: coords[i], y: coords[i + 1], type: 'L' });
         }
         verts.push({ x: coords[0], y: coords[1], type: 'Z' });
         shapes.push(buildShapeData('polygon', verts, style, composedTransform));
         break;
       }
       case 'text': {
         const x = parseFloat(element.getAttribute('x')) || 0;
         const y = parseFloat(element.getAttribute('y')) || 0;
         shapes.push({
           type: 'text',
           text: element.textContent,
           x, y, style, transform: composedTransform,
           id: null, className: null
         });
         break;
       }
       case 'g':
       case 'svg': {
         for (const child of element.children) {
           parseSVGElement(child, shapes, composedTransform);
         }
         break;
       }
     }

     const id = element.getAttribute('id');
     const cls = element.getAttribute('class');
     const last = shapes[shapes.length - 1];
     if (last) {
       if (id) last.id = id;
       if (cls) last.className = cls;
     }
     return shapes;
   }

  function drawShape(p, shape) {
    if (shape.transform) {
      const d = decomposeTransform(shape.transform);
      if (d) {
        p.push();
        p.translate(d.tx, d.ty);
        p.rotate(d.angle);
        p.scale(d.sx, d.sy);
      }
    }

    if (shape.style.fill) p.fill(shape.style.fill);
    else p.noFill();
    if (shape.style.stroke) p.stroke(shape.style.stroke);
    else p.noStroke();
    if (shape.style.strokeWidth) p.strokeWeight(parseFloat(shape.style.strokeWidth));
    if (shape.style.fillOpacity) p.fillOpacity(parseFloat(shape.style.fillOpacity));
    if (shape.style.strokeOpacity) p.strokeOpacity(parseFloat(shape.style.strokeOpacity));

    if (shape.type === 'text') {
      p.textSize(parseFloat(shape.style.fontSize) || 12);
      if (shape.style.fill) p.fill(shape.style.fill);
      p.text(shape.text, shape.x, shape.y);
      if (shape.transform) p.pop();
      return;
    }

    p.beginShape();
    for (const v of shape.vertices) {
      switch (v.type) {
        case 'M':
          p.vertex(v.x, v.y);
          break;
        case 'L':
          p.vertex(v.x, v.y);
          break;
        case 'C':
          p.bezierVertex(v.cp1.x, v.cp1.y, v.cp2.x, v.cp2.y, v.x, v.y);
          break;
        case 'Q':
          p.quadraticVertex(v.cp1.x, v.cp1.y, v.x, v.y);
          break;
        case 'Z':
          p.endShape(p.CLOSE);
          if (shape.transform) p.pop();
          return;
      }
    }
    p.endShape();
    if (shape.transform) p.pop();
  }

  fn.parseSVG = function (svgString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error('Invalid SVG: ' + err.textContent);
    const svg = doc.querySelector('svg');
    if (!svg) throw new Error('Invalid SVG: no <svg> element found');
    return fn.getSVGShapes(svg);
  };

  fn.getSVGShapes = function (svgElement) {
    const shapes = [];
    for (const child of svgElement.children) {
      parseSVGElement(child, shapes, [1, 0, 0, 1, 0, 0]);
    }
    return shapes;
  };

  fn.drawSVG = function (shapes) {
    const p = this;
    for (const shape of shapes) {
      drawShape(p, shape);
    }
  };

  fn.loadSVG = async function (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load SVG: ${res.statusText}`);
    return fn.parseSVG(await res.text());
  };

  fn.svgToPaths = function (svgString) {
    return fn.parseSVG(svgString).map(s => ({
      type: s.type,
      vertices: s.vertices,
      style: s.style
    }));
  };
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(p5SVGImport);
}

export default p5SVGImport;