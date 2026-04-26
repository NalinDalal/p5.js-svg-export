/**
 * p5.js SVG Import Addon
 * 
 * Provides SVG import for p5.js sketches by parsing SVG files into p5.js shapes.
 * Supports: paths, rects, circles, ellipses, lines, polylines, polygons, text, groups
 * 
 * Usage:
 *   loadSVG(url) - Load SVG from URL or file path
 *   parseSVG(svgString) - Parse SVG string to p5 shapes
 *   getSVGPath(element) - Convert SVG path element to p5 path
 */

function p5SVGImport(p5, fn, lifecycles) {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function num(n) {
    return Math.round(n * 1000) / 1000;
  }

  function parseTransform(transformAttr) {
    if (!transformAttr) return null;
    const matrix = [1, 0, 0, 1, 0, 0];
    const match = transformAttr.match(/matrix\(([^)]+)\)|translate\(([^)]+)\)|scale\(([^)]+)\)/g);
    if (!match) return matrix;
    for (const m of match) {
      if (m.startsWith('matrix')) {
        const vals = m.match(/matrix\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        if (vals.length === 6) {
          const a = vals[0], b = vals[1], c = vals[2], d = vals[3], e = vals[4], f = vals[5];
          matrix[0] = a * matrix[0] + c * matrix[1];
          matrix[1] = b * matrix[0] + d * matrix[1];
          matrix[2] = a * matrix[2] + c * matrix[3];
          matrix[3] = b * matrix[2] + d * matrix[3];
          matrix[4] = a * matrix[4] + c * matrix[5] + e;
          matrix[5] = b * matrix[4] + d * matrix[5] + f;
        }
      } else if (m.startsWith('translate')) {
        const vals = m.match(/translate\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        matrix[4] += vals[0];
        matrix[5] += vals[1] || 0;
      } else if (m.startsWith('scale')) {
        const vals = m.match(/scale\(([^)]+)\)/)[1].split(/[\s,]+/).map(parseFloat);
        matrix[0] *= vals[0];
        matrix[1] *= vals[0];
        matrix[2] *= vals[1] || vals[0];
        matrix[3] *= vals[1] || vals[0];
      }
    }
    return matrix;
  }

  function applyTransform(x, y, transform) {
    if (!transform) return { x, y };
    return {
      x: transform[0] * x + transform[2] * y + transform[4],
      y: transform[1] * x + transform[3] * y + transform[5]
    };
  }

  function parsePathData(d) {
    const commands = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz)([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;
    while ((match = regex.exec(d)) !== null) {
      const cmd = match[1];
      const args = match[2].trim().split(/[\s,]+/).filter(s => s).map(parseFloat);
      commands.push({ cmd, args });
    }
    return commands;
  }

  function pathToVertices(commands, startX = 0, startY = 0) {
    const vertices = [];
    let x = startX, y = startY;
    let startPoint = { x: 0, y: 0 };
    let cp1 = { x: 0, y: 0 }, cp2 = { x: 0, y: 0 };

    for (const { cmd, args } of commands) {
      const isRelative = cmd === cmd.toLowerCase();
      const command = cmd.toUpperCase();

      switch (command) {
        case 'M':
          for (let i = 0; i < args.length; i += 2) {
            x = isRelative ? x + args[i] : args[i];
            y = isRelative ? y + args[i + 1] : args[i + 1];
            if (i === 0) startPoint = { x, y };
            vertices.push({ x, y, type: i === 0 ? 'M' : 'L' });
          }
          break;
        case 'L':
          for (let i = 0; i < args.length; i += 2) {
            x = isRelative ? x + args[i] : args[i];
            y = isRelative ? y + args[i + 1] : args[i + 1];
            vertices.push({ x, y, type: 'L' });
          }
          break;
        case 'H':
          for (const arg of args) {
            x = isRelative ? x + arg : arg;
            vertices.push({ x, y, type: 'L' });
          }
          break;
        case 'V':
          for (const arg of args) {
            y = isRelative ? y + arg : arg;
            vertices.push({ x, y, type: 'L' });
          }
          break;
        case 'C':
          for (let i = 0; i < args.length; i += 6) {
            cp1 = { x: isRelative ? x + args[i] : args[i], y: isRelative ? y + args[i + 1] : args[i + 1] };
            cp2 = { x: isRelative ? x + args[i + 2] : args[i + 2], y: isRelative ? y + args[i + 3] : args[i + 3] };
            x = isRelative ? x + args[i + 4] : args[i + 4];
            y = isRelative ? y + args[i + 5] : args[i + 5];
            vertices.push({ x, y, cp1, cp2, type: 'C' });
          }
          break;
        case 'S':
          for (let i = 0; i < args.length; i += 4) {
            cp1 = { x: x + (x - cp2.x), y: y + (y - cp2.y) };
            cp2 = { x: isRelative ? x + args[i] : args[i], y: isRelative ? y + args[i + 1] : args[i + 1] };
            x = isRelative ? x + args[i + 2] : args[i + 2];
            y = isRelative ? y + args[i + 3] : args[i + 3];
            vertices.push({ x, y, cp1, cp2, type: 'C' });
          }
          break;
        case 'Q':
          for (let i = 0; i < args.length; i += 4) {
            cp1 = { x: isRelative ? x + args[i] : args[i], y: isRelative ? y + args[i + 1] : args[i + 1] };
            x = isRelative ? x + args[i + 2] : args[i + 2];
            y = isRelative ? y + args[i + 3] : args[i + 3];
            vertices.push({ x, y, cp1, type: 'Q' });
          }
          break;
        case 'T':
          for (let i = 0; i < args.length; i += 2) {
            cp1 = { x: x + (x - cp1.x), y: y + (y - cp1.y) };
            x = isRelative ? x + args[i] : args[i];
            y = isRelative ? y + args[i + 1] : args[i + 1];
            vertices.push({ x, y, cp1, type: 'Q' });
          }
          break;
        case 'A':
          for (let i = 0; i < args.length; i += 7) {
            const rx = args[i], ry = args[i + 1];
            const rot = args[i + 2];
            const largeArc = args[i + 3];
            const sweep = args[i + 4];
            const ex = isRelative ? x + args[i + 5] : args[i + 5];
            const ey = isRelative ? y + args[i + 6] : args[i + 6];
            const points = arcToBezier(x, y, ex, ey, rx, ry, rot, largeArc, sweep);
            vertices.push(...points);
            x = ex; y = ey;
          }
          break;
        case 'Z':
          vertices.push({ x: startPoint.x, y: startPoint.y, type: 'Z' });
          x = startPoint.x; y = startPoint.y;
          break;
      }
    }
    return vertices;
  }

  function arcToBezier(x1, y1, x2, y2, rx, ry, rotation, largeArc, sweep) {
    const points = [];
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1c = cos * dx + sin * dy, y1c = -sin * dx + cos * dy;
    const r = Math.sqrt((x1c * x1c) / (rx * rx) + (y1c * y1c) / (ry * ry));
    if (r > 1) { rx *= r; ry *= r; }
    const x2c = -x1c, y2c = -y1c;
    const s = (largeArc !== sweep) ? 1 : -1;
    const rc = Math.sqrt((rx * rx * ry * ry - rx * ry * (x1c * x1c + y1c * y1c)) / (rx * rx * y1c * y1c + ry * ry * x1c * x1c));
    const cx = (x1c + x2c) / 2 + s * (ry * y1c) / (ry * y1c + ry * ry * x1c * x1c) * ((rx * rx * y1c * y1c) - (ry * ry * x1c * x1c)) / (rx * rx * y1c * y1c + ry * ry * x1c * x1c);
    const cy = (y1c + y2c) / 2 - s * (rx * x1c) / (ry * y1c + ry * ry * x1c * x1c) * ((rx * rx * y1c * y1c) - (ry * ry * x1c * x1c));
    const ang1 = Math.atan2(y1c - cy, x1c - cx), ang2 = Math.atan2(y2c - cy, x2c - cx);
    const segments = Math.ceil(Math.abs(ang2 - ang1) / (Math.PI / 2)) || 1;
    const dAng = (ang2 - ang1) / segments;
    
    for (let i = 0; i < segments; i++) {
      const a1 = ang1 + i * dAng, a2 = a1 + dAng;
      const sinD = Math.sin(dAng / 2), cosD = Math.cos(dAng / 2);
      const a = Math.sin(dAng * (i + 0.5)) / Math.sin(dAng / 2);
      points.push({
        x: cx + rx * Math.cos(a2), y: cy + ry * Math.sin(a2),
        cp1: { x: cx + rx * (Math.cos(a1) - a * sin(a1) * cosD / sinD), y: cy + ry * (Math.sin(a1) + a * sin(a1) * sinD / cosD) },
        cp2: { x: cx + rx * (Math.cos(a2) + a * sin(a2) * cosD / sinD), y: cy + ry * (Math.sin(a2) - a * sin(a2) * sinD / cosD) },
        type: 'C'
      });
    }
    return points;
  }

  function parseStyle(styleAttr, element) {
    const style = {};
    if (styleAttr) {
      for (const rule of styleAttr.split(';')) {
        const [prop, val] = rule.split(':').map(s => s.trim());
        if (prop && val) style[prop] = val;
      }
    }
    style.fill = style.fill || element.getAttribute('fill') || 'black';
    style.stroke = style.stroke || element.getAttribute('stroke');
    style.strokeWidth = style.strokeWidth || element.getAttribute('stroke-width');
    style.opacity = style.opacity || element.getAttribute('opacity');
    if (style.fill === 'none') style.fill = null;
    if (style.stroke === 'none') style.stroke = null;
    return style;
  }

  function createP5Shape(type, vertices, style, transform) {
    return {
      type,
      vertices,
      style,
      transform,
      draw: function(ctx) {
        const savedTransform = transform ? [...ctx.getTransform()] : null;
        if (transform) {
          ctx.setTransform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
        }
        ctx.beginPath();
        for (const v of this.vertices) {
          if (v.type === 'M') ctx.moveTo(v.x, v.y);
          else if (v.type === 'Z') ctx.closePath();
          else if (v.type === 'C' && v.cp1 && v.cp2) ctx.bezierCurveTo(v.cp1.x, v.cp1.y, v.cp2.x, v.cp2.y, v.x, v.y);
          else if (v.type === 'Q' && v.cp1) ctx.quadraticCurveTo(v.cp1.x, v.cp1.y, v.x, v.y);
          else ctx.lineTo(v.x, v.y);
        }
        if (this.style.fill) {
          ctx.fillStyle = this.style.fill;
          ctx.fill();
        }
        if (this.style.stroke) {
          ctx.strokeStyle = this.style.stroke;
          if (this.style.strokeWidth) ctx.lineWidth = this.style.strokeWidth;
          ctx.stroke();
        }
        if (savedTransform) ctx.setTransform(savedTransform[0], savedTransform[1], savedTransform[2], savedTransform[3], savedTransform[4], savedTransform[5]);
      }
    };
  }

  function parseSVGElement(element, shapes = []) {
    const tagName = element.tagName.toLowerCase();
    const transform = parseTransform(element.getAttribute('transform'));
    const style = parseStyle(element.getAttribute('style'), element);
    const id = element.getAttribute('id');
    const className = element.getAttribute('class');

    switch (tagName) {
      case 'path': {
        const d = element.getAttribute('d');
        if (d) {
          const commands = parsePathData(d);
          const vertices = pathToVertices(commands);
          shapes.push(createP5Shape('path', vertices, style, transform));
        }
        break;
      }
      case 'rect': {
        const x = parseFloat(element.getAttribute('x')) || 0;
        const y = parseFloat(element.getAttribute('y')) || 0;
        const w = parseFloat(element.getAttribute('width'));
        const h = parseFloat(element.getAttribute('height'));
        const rx = parseFloat(element.getAttribute('rx')) || 0;
        const ry = parseFloat(element.getAttribute('ry')) || rx;
        const r = Math.max(rx, ry);
        if (w && h) {
          const vertices = [];
          if (r > 0) {
            vertices.push({ x: x + r, y, type: 'M' });
            vertices.push({ x: x + w - r, y, type: 'L' });
            vertices.push({ x: x + w, y: y + r, cp1: { x: x + w - r, y }, type: 'Q' });
            vertices.push({ x: x + w, y: y + h - r, type: 'L' });
            vertices.push({ x: x + w - r, y: y + h, cp1: { x: x + w, y: y + h - r }, type: 'Q' });
            vertices.push({ x: x + r, y: y + h, type: 'L' });
            vertices.push({ x: x, y: y + h - r, cp1: { x: x + r, y: y + h }, type: 'Q' });
            vertices.push({ x: x, y: y + r, type: 'L' });
            vertices.push({ x: x + r, y, cp1: { x: x, y: y + r }, type: 'Q' });
          } else {
            vertices.push({ x, y, type: 'M' });
            vertices.push({ x: x + w, y, type: 'L' });
            vertices.push({ x: x + w, y: y + h, type: 'L' });
            vertices.push({ x, y: y + h, type: 'L' });
          }
          vertices.push({ x, y, type: 'Z' });
          shapes.push(createP5Shape('rect', vertices, style, transform));
        }
        break;
      }
      case 'circle': {
        const cx = parseFloat(element.getAttribute('cx')) || 0;
        const cy = parseFloat(element.getAttribute('cy')) || 0;
        const r = parseFloat(element.getAttribute('r'));
        if (r) {
          const vertices = [];
          const segments = 16;
          vertices.push({ x: cx + r, y: cy, type: 'M' });
          for (let i = 1; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            vertices.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), type: 'L' });
          }
          vertices.push({ x: cx + r, y: cy, type: 'Z' });
          shapes.push(createP5Shape('circle', vertices, style, transform));
        }
        break;
      }
      case 'ellipse': {
        const cx = parseFloat(element.getAttribute('cx')) || 0;
        const cy = parseFloat(element.getAttribute('cy')) || 0;
        const rx = parseFloat(element.getAttribute('rx'));
        const ry = parseFloat(element.getAttribute('ry'));
        if (rx && ry) {
          const vertices = [];
          const segments = 16;
          vertices.push({ x: cx + rx, y: cy, type: 'M' });
          for (let i = 1; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            vertices.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle), type: 'L' });
          }
          vertices.push({ x: cx + rx, y: cy, type: 'Z' });
          shapes.push(createP5Shape('ellipse', vertices, style, transform));
        }
        break;
      }
      case 'line': {
        const x1 = parseFloat(element.getAttribute('x1')) || 0;
        const y1 = parseFloat(element.getAttribute('y1')) || 0;
        const x2 = parseFloat(element.getAttribute('x2')) || 0;
        const y2 = parseFloat(element.getAttribute('y2')) || 0;
        const vertices = [{ x: x1, y: y1, type: 'M' }, { x: x2, y: y2, type: 'L' }];
        shapes.push(createP5Shape('line', vertices, { ...style, fill: style.stroke }, transform));
        break;
      }
      case 'polyline': {
        const points = element.getAttribute('points').trim().split(/[\s,]+/).map(parseFloat);
        const vertices = [];
        for (let i = 0; i < points.length; i += 2) {
          vertices.push({ x: points[i], y: points[i + 1], type: i === 0 ? 'M' : 'L' });
        }
        shapes.push(createP5Shape('polyline', vertices, style, transform));
        break;
      }
      case 'polygon': {
        const points = element.getAttribute('points').trim().split(/[\s,]+/).map(parseFloat);
        const vertices = [];
        vertices.push({ x: points[0], y: points[1], type: 'M' });
        for (let i = 2; i < points.length; i += 2) {
          vertices.push({ x: points[i], y: points[i + 1], type: 'L' });
        }
        vertices.push({ x: points[0], y: points[1], type: 'Z' });
        shapes.push(createP5Shape('polygon', vertices, style, transform));
        break;
      }
      case 'text': {
        const x = parseFloat(element.getAttribute('x')) || 0;
        const y = parseFloat(element.getAttribute('y')) || 0;
        const text = element.textContent;
        shapes.push({
          type: 'text',
          text,
          x, y,
          style,
          transform,
          draw: function(ctx) {
            const savedTransform = transform ? [...ctx.getTransform()] : null;
            if (transform) {
              ctx.setTransform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
            }
            ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'sans-serif'}`;
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
            if (this.style.fill) {
              ctx.fillStyle = this.style.fill;
              ctx.fillText(this.text, this.x, this.y);
            }
            if (this.style.stroke) {
              ctx.strokeStyle = this.style.stroke;
              ctx.lineWidth = this.style.strokeWidth || 1;
              ctx.strokeText(this.text, this.x, this.y);
            }
            if (savedTransform) ctx.setTransform(savedTransform[0], savedTransform[1], savedTransform[2], savedTransform[3], savedTransform[4], savedTransform[5]);
          }
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
    if (id) {
      const lastShape = shapes[shapes.length - 1];
      if (lastShape) lastShape.id = id;
    }
    if (className) {
      const lastShape = shapes[shapes.length - 1];
      if (lastShape) lastShape.className = className;
    }
    return shapes;
  }

  fn.parseSVG = function(svgString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const error = doc.querySelector('parsererror');
    if (error) throw new Error('Invalid SVG: ' + error.textContent);
    const svg = doc.querySelector('svg');
    if (!svg) throw new Error('Invalid SVG: no svg element found');
    return fn.getSVGShapes(svg);
  };

  fn.getSVGShapes = function(svgElement) {
    const shapes = [];
    for (const child of svgElement.children) {
      parseSVGElement(child, shapes);
    }
    return shapes;
  };

  fn.drawSVG = function(shapes) {
    const p5Canvas = p5._curElement?.elt;
    if (!p5Canvas) return;
    const ctx = p5Canvas.getContext('2d');
    if (!ctx) return;
    for (const shape of shapes) {
      if (shape.draw) shape.draw(ctx);
    }
  };

  fn.loadSVG = async function(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load SVG: ${response.statusText}`);
    const svgString = await response.text();
    return fn.parseSVG(svgString);
  };

  fn.svgToPaths = function(svgString) {
    const shapes = fn.parseSVG(svgString);
    return shapes.map(s => ({
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