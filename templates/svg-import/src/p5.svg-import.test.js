import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockP5() {
  const calls = [];
  const p = {
    push: vi.fn(() => calls.push('push')),
    pop: vi.fn(() => calls.push('pop')),
    translate: vi.fn((...args) => calls.push(['translate', ...args])),
    rotate: vi.fn((...args) => calls.push(['rotate', ...args])),
    scale: vi.fn((...args) => calls.push(['scale', ...args])),
    fill: vi.fn((...args) => calls.push(['fill', ...args])),
    noFill: vi.fn(() => calls.push('noFill')),
    stroke: vi.fn((...args) => calls.push(['stroke', ...args])),
    noStroke: vi.fn(() => calls.push('noStroke')),
    strokeWeight: vi.fn((...args) => calls.push(['strokeWeight', ...args])),
    fillOpacity: vi.fn((...args) => calls.push(['fillOpacity', ...args])),
    strokeOpacity: vi.fn((...args) => calls.push(['strokeOpacity', ...args])),
    textSize: vi.fn((...args) => calls.push(['textSize', ...args])),
    text: vi.fn((...args) => calls.push(['text', ...args])),
    beginShape: vi.fn(() => calls.push('beginShape')),
    vertex: vi.fn((...args) => calls.push(['vertex', ...args])),
    bezierVertex: vi.fn((...args) => calls.push(['bezierVertex', ...args])),
    quadraticVertex: vi.fn((...args) => calls.push(['quadraticVertex', ...args])),
    endShape: vi.fn((...args) => calls.push(['endShape', ...args])),
    _calls: calls,
  };
  return p;
}

function setupImport() {
  const fn = {};
  const p5SVGImport = new Function('p5', 'fn', `
    ${p5SVGImportCode}
  `);
  return { fn };
}

const p5SVGImportCode = `
function p5SVGImport(p5, fn) {

  function parseTransform(transformAttr) {
    if (!transformAttr) return null;
    const matrix = [1, 0, 0, 1, 0, 0];
    const parts = transformAttr.match(
      /matrix\\(([^)]+)\\)|translate\\(([^)]+)\\)|scale\\(([^)]+)\\)|rotate\\(([^)]+)\\)/g
    );
    if (!parts) return matrix;
    for (const part of parts) {
      if (part.startsWith('matrix')) {
        const v = part.match(/matrix\\(([^)]+)\\)/)[1].split(/[\\s,]+/).map(parseFloat);
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
        const v = part.match(/translate\\(([^)]+)\\)/)[1].split(/[\\s,]+/).map(parseFloat);
        matrix[4] += v[0];
        matrix[5] += v[1] || 0;
      } else if (part.startsWith('scale')) {
        const v = part.match(/scale\\(([^)]+)\\)/)[1].split(/[\\s,]+/).map(parseFloat);
        matrix[0] *= v[0];
        matrix[1] *= v[0];
        matrix[2] *= v[1] ?? v[0];
        matrix[3] *= v[1] ?? v[0];
      } else if (part.startsWith('rotate')) {
        const v = part.match(/rotate\\(([^)]+)\\)/)[1].split(/[\\s,]+/).map(parseFloat);
        const deg = v[0];
        const rad = (deg * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const cx = v[1] || 0;
        const cy = v[2] || 0;
        const r = [...matrix];
        matrix[0] = cosA * r[0] + sinA * r[1];
        matrix[1] = -sinA * r[0] + cosA * r[1];
        matrix[2] = cosA * r[2] + sinA * r[3];
        matrix[3] = -sinA * r[2] + cosA * r[3];
        if (cx !== 0 || cy !== 0) {
          matrix[4] = cx - cosA * cx + sinA * cy + cosA * r[4] + sinA * r[5];
          matrix[5] = cy - sinA * cx - cosA * cy + sinA * r[4] + cosA * r[5];
        } else {
          matrix[4] = cosA * r[4] + sinA * r[5];
          matrix[5] = -sinA * r[4] + cosA * r[5];
        }
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
      const args = match[2].trim().split(/[\\s,]+/).filter(Boolean).map(Number);
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

  function parseSVGElement(element, shapes) {
    const tag = element.tagName.toLowerCase();
    const transform = parseTransform(element.getAttribute('transform'));
    const style = parseStyle(element.getAttribute('style'), element);

    switch (tag) {
      case 'path': {
        const d = element.getAttribute('d');
        if (d) {
          const commands = parsePathData(d);
          const vertices = pathToVertices(commands);
          shapes.push(buildShapeData('path', vertices, style, transform));
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
          shapes.push(buildShapeData('rect', verts, style, transform));
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
          shapes.push(buildShapeData('circle', verts, style, transform));
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
          shapes.push(buildShapeData('ellipse', verts, style, transform));
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
        ], { ...style, fill: style.stroke }, transform));
        break;
      }
      case 'polyline': {
        const pts = element.getAttribute('points');
        if (!pts) break;
        const coords = pts.trim().split(/[\\s,]+/).map(Number);
        const verts = [];
        for (let i = 0; i < coords.length; i += 2) {
          verts.push({ x: coords[i], y: coords[i + 1], type: i === 0 ? 'M' : 'L' });
        }
        shapes.push(buildShapeData('polyline', verts, style, transform));
        break;
      }
      case 'polygon': {
        const pts = element.getAttribute('points');
        if (!pts) break;
        const coords = pts.trim().split(/[\\s,]+/).map(Number);
        const verts = [{ x: coords[0], y: coords[1], type: 'M' }];
        for (let i = 2; i < coords.length; i += 2) {
          verts.push({ x: coords[i], y: coords[i + 1], type: 'L' });
        }
        verts.push({ x: coords[0], y: coords[1], type: 'Z' });
        shapes.push(buildShapeData('polygon', verts, style, transform));
        break;
      }
      case 'text': {
        const x = parseFloat(element.getAttribute('x')) || 0;
        const y = parseFloat(element.getAttribute('y')) || 0;
        shapes.push({
          type: 'text',
          text: element.textContent,
          x, y, style, transform,
          id: null, className: null
        });
        break;
      }
      case 'g':
      case 'svg': {
        for (const child of element.children) {
          parseSVGElement(child, shapes);
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
      parseSVGElement(child, shapes);
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
    if (!res.ok) throw new Error(\\`Failed to load SVG: \\${res.statusText}\\`);
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
`;

describe('parseTransform', () => {
  it('returns null for empty input', () => {
    const result = parseTransform('');
    expect(result).toBeNull();
  });

  it('returns identity matrix for null', () => {
    const result = parseTransform(null);
    expect(result).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('parses matrix()', () => {
    const result = parseTransform('matrix(1, 0, 0, 1, 10, 20)');
    expect(result).toEqual([1, 0, 0, 1, 10, 20]);
  });

  it('parses translate()', () => {
    const result = parseTransform('translate(10, 20)');
    expect(result[4]).toBe(10);
    expect(result[5]).toBe(20);
  });

  it('parses scale()', () => {
    const result = parseTransform('scale(2, 3)');
    expect(result[0]).toBe(2);
    expect(result[3]).toBe(3);
  });

  it('parses rotate() without center', () => {
    const result = parseTransform('rotate(90)');
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(1, 5);
    expect(result[2]).toBeCloseTo(-1, 5);
    expect(result[3]).toBeCloseTo(0, 5);
  });

  it('parses rotate() with center point', () => {
    const result = parseTransform('rotate(90, 50, 50)');
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(1, 5);
    expect(result[2]).toBeCloseTo(-1, 5);
    expect(result[3]).toBeCloseTo(0, 5);
  });

  it('composes multiple transforms', () => {
    const result = parseTransform('translate(10, 20) rotate(90)');
    expect(result[4]).toBeCloseTo(10, 5);
    expect(result[5]).toBeCloseTo(20, 5);
  });
});

describe('parseStyle', () => {
  it('parses fill and stroke from style attribute', () => {
    const el = document.createElement('rect');
    el.setAttribute('fill', 'red');
    el.setAttribute('stroke', 'blue');
    const style = parseStyle(null, el);
    expect(style.fill).toBe('red');
    expect(style.stroke).toBe('blue');
  });

  it('parses fill-opacity and stroke-opacity', () => {
    const el = document.createElement('rect');
    el.setAttribute('fill-opacity', '0.5');
    el.setAttribute('stroke-opacity', '0.8');
    const style = parseStyle(null, el);
    expect(style.fillOpacity).toBe('0.5');
    expect(style.strokeOpacity).toBe('0.8');
  });

  it('converts fill=none to null', () => {
    const el = document.createElement('rect');
    el.setAttribute('fill', 'none');
    const style = parseStyle(null, el);
    expect(style.fill).toBeNull();
  });

  it('converts stroke=none to null', () => {
    const el = document.createElement('rect');
    el.setAttribute('stroke', 'none');
    const style = parseStyle(null, el);
    expect(style.stroke).toBeNull();
  });

  it('defaults fill to black', () => {
    const el = document.createElement('rect');
    const style = parseStyle(null, el);
    expect(style.fill).toBe('black');
  });
});

describe('parsePathData', () => {
  it('parses simple M and L commands', () => {
    const commands = parsePathData('M 0 0 L 100 100');
    expect(commands).toHaveLength(2);
    expect(commands[0]).toEqual({ cmd: 'M', args: [0, 0] });
    expect(commands[1]).toEqual({ cmd: 'L', args: [100, 100] });
  });

  it('parses C commands', () => {
    const commands = parsePathData('M 0 0 C 10 20 30 40 50 60');
    expect(commands).toHaveLength(2);
    expect(commands[1].cmd).toBe('C');
    expect(commands[1].args).toHaveLength(6);
  });

  it('parses A commands', () => {
    const commands = parsePathData('M 0 0 A 50 50 0 1 1 100 0');
    expect(commands).toHaveLength(2);
    expect(commands[1].cmd).toBe('A');
    expect(commands[1].args).toHaveLength(7);
  });

  it('parses Z command', () => {
    const commands = parsePathData('M 0 0 L 100 100 Z');
    expect(commands).toHaveLength(3);
    expect(commands[2].cmd).toBe('Z');
    expect(commands[2].args).toEqual([]);
  });
});

describe('pathToVertices', () => {
  it('converts M and L commands', () => {
    const commands = [{ cmd: 'M', args: [0, 0] }, { cmd: 'L', args: [100, 100] }];
    const vertices = pathToVertices(commands);
    expect(vertices).toHaveLength(2);
    expect(vertices[0]).toEqual({ x: 0, y: 0, type: 'M' });
    expect(vertices[1]).toEqual({ x: 100, y: 100, type: 'L' });
  });

  it('converts C commands', () => {
    const commands = [{ cmd: 'M', args: [0, 0] }, { cmd: 'C', args: [10, 20, 30, 40, 50, 60] }];
    const vertices = pathToVertices(commands);
    expect(vertices).toHaveLength(1);
    expect(vertices[0].type).toBe('C');
    expect(vertices[0].cp1).toEqual({ x: 10, y: 20 });
    expect(vertices[0].cp2).toEqual({ x: 30, y: 40 });
  });

  it('converts Z command', () => {
    const commands = [{ cmd: 'M', args: [0, 0] }, { cmd: 'L', args: [100, 100] }, { cmd: 'Z', args: [] }];
    const vertices = pathToVertices(commands);
    expect(vertices[vertices.length - 1].type).toBe('Z');
  });
});

describe('getSVGShapes', () => {
  it('parses a rect element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '20');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '50');
    svg.appendChild(rect);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('rect');
  });

  it('parses a circle element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '30');
    svg.appendChild(circle);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('circle');
  });

  it('parses a path element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 100 100');
    svg.appendChild(path);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('path');
  });

  it('parses a group element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '10');
    rect.setAttribute('height', '10');
    g.appendChild(rect);
    svg.appendChild(g);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
  });
});

describe('drawSVG', () => {
  it('calls p5 drawing methods for a rect shape', () => {
    const p = createMockP5();
    const shapes = [{
      type: 'rect',
      vertices: [
        { x: 0, y: 0, type: 'M' },
        { x: 100, y: 0, type: 'L' },
        { x: 100, y: 50, type: 'L' },
        { x: 0, y: 50, type: 'L' },
        { x: 0, y: 0, type: 'Z' }
      ],
      style: { fill: '#ff0000', stroke: '#000000', strokeWidth: '2' },
      transform: null
    }];

    fn.drawSVG.call(p, shapes);
    expect(p.fill).toHaveBeenCalledWith('#ff0000');
    expect(p.stroke).toHaveBeenCalledWith('#000000');
    expect(p.strokeWeight).toHaveBeenCalledWith(2);
    expect(p.beginShape).toHaveBeenCalled();
    expect(p.endShape).toHaveBeenCalled();
  });

  it('calls p5 drawing methods for a line shape', () => {
    const p = createMockP5();
    const shapes = [{
      type: 'line',
      vertices: [
        { x: 0, y: 0, type: 'M' },
        { x: 100, y: 100, type: 'L' }
      ],
      style: { fill: '#000000', stroke: '#ff0000', strokeWidth: '1' },
      transform: null
    }];

    fn.drawSVG.call(p, shapes);
    expect(p.stroke).toHaveBeenCalledWith('#ff0000');
  });

  it('handles transform on shapes', () => {
    const p = createMockP5();
    const shapes = [{
      type: 'rect',
      vertices: [{ x: 0, y: 0, type: 'M' }, { x: 10, y: 0, type: 'L' }, { x: 10, y: 10, type: 'L' }, { x: 0, y: 10, type: 'L' }, { x: 0, y: 0, type: 'Z' }],
      style: { fill: '#ff0000', stroke: null, strokeWidth: '1' },
      transform: [1, 0, 0, 1, 50, 50]
    }];

    fn.drawSVG.call(p, shapes);
    expect(p.push).toHaveBeenCalled();
    expect(p.translate).toHaveBeenCalledWith(50, 50);
    expect(p.pop).toHaveBeenCalled();
  });
});

describe('parseSVG', () => {
  it('parses a simple SVG string', () => {
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="10" y="10" width="50" height="50"/></svg>';
    const shapes = fn.parseSVG(svgString);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('rect');
  });

  it('throws on invalid SVG', () => {
    expect(() => fn.parseSVG('not an svg')).toThrow('Invalid SVG');
  });
});