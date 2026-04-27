/**
 * p5.js SVG Addon
 * 
 * Provides SVG import and export for p5.js sketches.
 * Supports: paths, shapes, text, images, transforms, groups
 * 
 * Export:
 *   saveSVG(filename) - Save current frame as SVG
 *   getSVG() - Get SVG string
 * 
 * Import:
 *   loadSVG(url) - Load SVG from URL
 *   parseSVG(svgString) - Parse SVG string to shapes
 *   drawSVG(shapes) - Draw shapes to canvas
 */

function p5SVG(p5, fn, lifecycles) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  
  let exportState = {
    paths: [],
    texts: [],
    images: [],
    transforms: [],
    transformStack: [],
    currentFill: 'none',
    currentStroke: 'black',
    currentStrokeWidth: 1,
    currentStrokeCap: 'butt',
    currentStrokeJoin: 'miter',
    currentFont: 'sans-serif',
    currentFontSize: 12,
    currentTextAlign: 'start',
    currentTextBaseline: 'alphabetic',
    isRecording: false,
    currentPath: []
  };

  function num(n) {
    return Math.round(n * 1000) / 1000;
  }

  function colorToHex(c) {
    if (!c || c === 'none') return 'none';
    if (typeof c === 'string') {
      if (c.startsWith('rgba')) {
        const m = c.match(/rgba?\((\d+),(\d+),(\d+)/);
        if (m) {
          const r = parseInt(m[1]);
          const g = parseInt(m[2]);
          const b = parseInt(m[3]);
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
      }
      return c;
    }
    if (c.toString) {
      const s = c.toString();
      if (s.startsWith('#')) return s;
      const m = s.match(/rgba?\((\d+),(\d+),(\d+)/);
      if (m) {
        const r = parseInt(m[1]);
        const g = parseInt(m[2]);
        const b = parseInt(m[3]);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    }
    return 'black';
  }

  function applyTransform(x, y) {
    let tx = x, ty = y;
    for (const t of exportState.transforms) {
      const nx = t[0] * tx + t[1] * ty + t[4];
      const ny = t[2] * tx + t[3] * ty + t[5];
      tx = nx; ty = ny;
    }
    return { x: tx, y: ty };
  }

  function getTransformString() {
    if (exportState.transforms.length === 0) return '';
    const t = exportState.transforms;
    return `matrix(${num(t[0])} ${num(t[1])} ${num(t[2])} ${num(t[3])} ${num(t[4])} ${num(t[5])})`;
  }

  function startPath() {
    exportState.currentPath = [];
  }

  function endPath() {
    if (exportState.currentPath.length === 0) return;
    exportState.paths.push({
      d: exportState.currentPath.join(' '),
      fill: exportState.currentFill,
      stroke: exportState.currentStroke,
      strokeWidth: exportState.currentStrokeWidth,
      strokeLinecap: exportState.currentStrokeCap,
      strokeLinejoin: exportState.currentStrokeJoin,
      transform: getTransformString()
    });
    exportState.currentPath = [];
  }

  function wrapContext(ctx) {
    const original = {
      moveTo: ctx.moveTo.bind(ctx),
      lineTo: ctx.lineTo.bind(ctx),
      bezierCurveTo: ctx.bezierCurveTo.bind(ctx),
      quadraticCurveTo: ctx.quadraticCurveTo.bind(ctx),
      arc: ctx.arc.bind(ctx),
      ellipse: ctx.ellipse.bind(ctx),
      rect: ctx.rect.bind(ctx),
      closePath: ctx.closePath.bind(ctx),
      fillText: ctx.fillText.bind(ctx),
      strokeText: ctx.strokeText.bind(ctx),
      drawImage: ctx.drawImage.bind(ctx),
      save: ctx.save.bind(ctx),
      restore: ctx.restore.bind(ctx),
      setTransform: ctx.setTransform.bind(ctx),
      transform: ctx.transform.bind(ctx),
      beginPath: ctx.beginPath.bind(ctx),
      fill: ctx.fill.bind(ctx),
      stroke: ctx.stroke.bind(ctx),
      clip: ctx.clip.bind(ctx)
    };

    ctx.moveTo = function(x, y) {
      if (exportState.isRecording) {
        const p = applyTransform(x, y);
        exportState.currentPath.push(`M ${num(p.x)} ${num(p.y)}`);
      }
      return original.moveTo(x, y);
    };

    ctx.lineTo = function(x, y) {
      if (exportState.isRecording) {
        const p = applyTransform(x, y);
        exportState.currentPath.push(`L ${num(p.x)} ${num(p.y)}`);
      }
      return original.lineTo(x, y);
    };

    ctx.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
      if (exportState.isRecording) {
        const p1 = applyTransform(cp1x, cp1y);
        const p2 = applyTransform(cp2x, cp2y);
        const p3 = applyTransform(x, y);
        exportState.currentPath.push(`C ${num(p1.x)} ${num(p1.y)}, ${num(p2.x)} ${num(p2.y)}, ${num(p3.x)} ${num(p3.y)}`);
      }
      return original.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    };

    ctx.quadraticCurveTo = function(cpx, cpy, x, y) {
      if (exportState.isRecording) {
        const p1 = applyTransform(cpx, cpy);
        const p2 = applyTransform(x, y);
        exportState.currentPath.push(`Q ${num(p1.x)} ${num(p1.y)}, ${num(p2.x)} ${num(p2.y)}`);
      }
      return original.quadraticCurveTo(cpx, cpy, x, y);
    };

    ctx.arc = function(x, y, radius, startAngle, endAngle, counterClockwise) {
      if (exportState.isRecording) {
        const cx = x, cy = y;
        let startX = cx + radius * Math.cos(startAngle);
        let startY = cy + radius * Math.sin(startAngle);
        let endX = cx + radius * Math.cos(endAngle);
        let endY = cy + radius * Math.sin(endAngle);
        
        const pStart = applyTransform(startX, startY);
        const pEnd = applyTransform(endX, endY);
        
        let delta = endAngle - startAngle;
        if (counterClockwise) {
          while (delta < 0) delta += 2 * Math.PI;
        }
        
        const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
        const sweep = counterClockwise ? 0 : 1;
        
        exportState.currentPath.push(`M ${num(pStart.x)} ${num(pStart.y)} A ${num(radius)} ${num(radius)} 0 ${largeArc} ${sweep} ${num(pEnd.x)} ${num(pEnd.y)}`);
      }
      return original.arc(x, y, radius, startAngle, endAngle, counterClockwise);
    };

    ctx.ellipse = function(x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise) {
      if (exportState.isRecording) {
        const start = startAngle !== undefined ? startAngle : 0;
        const stop = endAngle !== undefined ? endAngle : 2 * Math.PI;
        const isFull = Math.abs(stop - start) >= 2 * Math.PI - 0.0001;
        
        if (isFull) {
          const pCenter = applyTransform(x, y);
          exportState.currentPath.push(`M ${num(pCenter.x + radiusX)} ${num(pCenter.y)} A ${num(radiusX)} ${num(radiusY)} 0 1 1 ${num(pCenter.x + radiusX)} ${num(pCenter.y - 0.001)}`);
        } else {
          const startX = x + radiusX * Math.cos(start);
          const startY = y + radiusY * Math.sin(start);
          const endX = x + radiusX * Math.cos(stop);
          const endY = y + radiusY * Math.sin(stop);
          
          const pStart = applyTransform(startX, startY);
          const pEnd = applyTransform(endX, endY);
          
          let delta = stop - start;
          const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
          const sweep = counterClockwise ? 0 : 1;
          
          exportState.currentPath.push(`M ${num(pStart.x)} ${num(pStart.y)} A ${num(radiusX)} ${num(radiusY)} 0 ${largeArc} ${sweep} ${num(pEnd.x)} ${num(pEnd.y)}`);
        }
      }
      return original.ellipse(x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise);
    };

    ctx.rect = function(x, y, w, h, radii) {
      if (exportState.isRecording) {
        const p = applyTransform(x, y);
        if (radii && (radii.tl || radii.br)) {
          const r = radii.tl || 0;
          exportState.currentPath.push(`M ${num(p.x + r)} ${num(p.y)}`);
          exportState.currentPath.push(`h ${num(w - r * 2)}`);
          if (r > 0) exportState.currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 ${num(r)} ${num(r)}`);
          exportState.currentPath.push(`v ${num(h - r * 2)}`);
          if (r > 0) exportState.currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 -${num(r)} ${num(r)}`);
          exportState.currentPath.push(`h -${num(w - r * 2)}`);
          if (r > 0) exportState.currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 -${num(r)} -${num(r)}`);
          exportState.currentPath.push(`v -${num(h - r * 2)}`);
          if (r > 0) exportState.currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 ${num(r)} -${num(r)}`);
          exportState.currentPath.push(`z`);
        } else {
          exportState.currentPath.push(`M ${num(p.x)} ${num(p.y)} h ${num(w)} v ${num(h)} h -${num(w)} z`);
        }
      }
      return original.rect(x, y, w, h, radii);
    };

    ctx.closePath = function() {
      if (exportState.isRecording) {
        exportState.currentPath.push('Z');
      }
      return original.closePath();
    };

    ctx.fillText = function(text, x, y) {
      if (exportState.isRecording) {
        const p = applyTransform(x, y);
        exportState.texts.push({
          text: text,
          x: num(p.x),
          y: num(p.y),
          fill: exportState.currentFill,
          font: exportState.currentFont,
          fontSize: exportState.currentFontSize,
          textAlign: exportState.currentTextAlign,
          textBaseline: exportState.currentTextBaseline,
          transform: getTransformString()
        });
      }
      return original.fillText(text, x, y);
    };

    ctx.strokeText = function(text, x, y) {
      if (exportState.isRecording) {
        const p = applyTransform(x, y);
        exportState.texts.push({
          text: text,
          x: num(p.x),
          y: num(p.y),
          stroke: exportState.currentStroke,
          strokeWidth: exportState.currentStrokeWidth,
          font: exportState.currentFont,
          fontSize: exportState.currentFontSize,
          textAlign: exportState.currentTextAlign,
          textBaseline: exportState.currentTextBaseline,
          transform: getTransformString()
        });
      }
      return original.strokeText(text, x, y);
    };

    ctx.drawImage = function(image, dx, dy, dw, dh, sx, sy, sw, sh) {
      if (exportState.isRecording) {
        let args = [dx, dy, dw, dh];
        if (sx !== undefined) {
          args = [sx, sy, sw, sh, dx, dy, dw, dh];
        }
        const p = applyTransform(args[0], args[1]);
        exportState.images.push({
          href: image.src || image.currentSrc || '',
          x: num(p.x),
          y: num(p.y),
          width: args[2],
          height: args[3],
          transform: getTransformString()
        });
      }
      return original.drawImage(image, dx, dy, dw, dh, sx, sy, sw, sh);
    };

    ctx.save = function() {
      exportState.transformStack.push([...exportState.transforms]);
      return original.save();
    };

    ctx.restore = function() {
      exportState.transforms = exportState.transformStack.pop() || [];
      return original.restore();
    };

    ctx.setTransform = function(a, b, c, d, e, f) {
      if (exportState.isRecording) {
        exportState.transforms = [a, b, c, d, e, f];
      }
      return original.setTransform(a, b, c, d, e, f);
    };

    ctx.transform = function(a, b, c, d, e, f) {
      if (exportState.isRecording) {
        const t = [a, b, c, d, e, f];
        exportState.transforms = [
          exportState.transforms[0] * t[0] + exportState.transforms[1] * t[2],
          exportState.transforms[0] * t[1] + exportState.transforms[1] * t[3],
          exportState.transforms[2] * t[0] + exportState.transforms[3] * t[2],
          exportState.transforms[2] * t[1] + exportState.transforms[3] * t[3],
          exportState.transforms[4] * t[0] + exportState.transforms[5] * t[2] + t[4],
          exportState.transforms[4] * t[1] + exportState.transforms[5] * t[3] + t[5]
        ];
      }
      return original.transform(a, b, c, d, e, f);
    };

    ctx.beginPath = function() {
      startPath();
      return original.beginPath();
    };

    ctx.fill = function(path) {
      if (exportState.isRecording && exportState.currentPath.length > 0) {
        endPath();
      }
      return original.fill(path);
    };

    ctx.stroke = function(path) {
      if (exportState.isRecording && exportState.currentPath.length > 0) {
        endPath();
      }
      return original.stroke(path);
    };

    return original;
  }

  let wrappedContext = null;

  lifecycles.postsetup = function() {
    const canvas = p5._curElement?.elt;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      wrappedContext = wrapContext(ctx);
    }
  };

  lifecycles.postdraw = function() {
    if (!exportState.isRecording) {
      exportState.isRecording = true;
    }
    
    exportState.paths = [];
    exportState.texts = [];
    exportState.images = [];
    exportState.transforms = [];
    exportState.transformStack = [];
    exportState.currentPath = [];
    
    const states = p5._renderer?.states;
    if (states) {
      exportState.currentFill = colorToHex(states.fillColor) || 'none';
      exportState.currentStroke = colorToHex(states.strokeColor) || 'black';
      exportState.currentStrokeWidth = states.strokeWeight || 1;
      exportState.currentFont = states.textFont?.family || 'sans-serif';
      exportState.currentFontSize = states.textSize || 12;
      exportState.currentTextAlign = states.textAlign || 'start';
      exportState.currentTextBaseline = states.textBaseline || 'alphabetic';
    }
  };

  fn.saveSVG = function(filename = 'sketch.svg') {
    const svg = generateSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  fn.getSVG = function() {
    return generateSVG();
  };

  fn.startSVGRecord = function() {
    exportState.isRecording = true;
  };

  fn.stopSVGRecord = function() {
    exportState.isRecording = false;
  };

  function generateSVG() {
    const pathElements = exportState.paths.map(p => {
      const transformAttr = p.transform ? ` transform="${p.transform}"` : '';
      return `  <path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linecap="${p.strokeLinecap}" stroke-linejoin="${p.strokeLinejoin}"${transformAttr}/>`;
    }).join('\n');

    const textElements = exportState.texts.map(t => {
      const transformAttr = t.transform ? ` transform="${t.transform}"` : '';
      const anchor = t.textAlign === 'center' ? 'middle' : t.textAlign === 'end' ? 'end' : 'start';
      if (t.fill) {
        return `  <text x="${t.x}" y="${t.y}" fill="${t.fill}" font-family="${t.font}" font-size="${t.fontSize}" text-anchor="${anchor}"${transformAttr}>${escapeXml(t.text)}</text>`;
      } else {
        return `  <text x="${t.x}" y="${t.y}" stroke="${t.stroke}" stroke-width="${t.strokeWidth}" font-family="${t.font}" font-size="${t.fontSize}" text-anchor="${anchor}" fill="none"${transformAttr}>${escapeXml(t.text)}</text>`;
      }
    }).join('\n');

    const imageElements = exportState.images.map(i => {
      const transformAttr = i.transform ? ` transform="${i.transform}"` : '';
      return `  <image href="${i.href}" x="${i.x}" y="${i.y}" width="${i.width}" height="${i.height}"${transformAttr}/>`;
    }).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${p5.width}" height="${p5.height}" viewBox="0 0 ${p5.width} ${p5.height}">
${pathElements}
${textElements}
${imageElements}
</svg>`;
  }

  function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // === IMPORT FUNCTIONS ===

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

  function parsePathData(d) {
    const commands = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
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
    let r = Math.sqrt((x1c * x1c) / (rx * rx) + (y1c * y1c) / (ry * ry));
    if (r > 1) { rx *= r; ry *= r; }
    const x2c = -x1c, y2c = -y1c;
    const s = (largeArc !== sweep) ? 1 : -1;
    const cx = (x1c + x2c) / 2;
    const cy = (y1c + y2c) / 2;
    const ang1 = Math.atan2(y1c - cy, x1c - cx), ang2 = Math.atan2(y2c - cy, x2c - cx);
    const segments = Math.ceil(Math.abs(ang2 - ang1) / (Math.PI / 2)) || 1;
    const dAng = (ang2 - ang1) / segments;
    
    for (let i = 0; i < segments; i++) {
      const a1 = ang1 + i * dAng, a2 = a1 + dAng;
      const sinD = Math.sin(dAng / 2), cosD = Math.cos(dAng / 2);
      const a = Math.cos(dAng / 2) === 0 ? 1 : 4 / 3 * Math.tan(dAng / 4);
      points.push({
        x: cx + rx * Math.cos(a2), y: cy + ry * Math.sin(a2),
        cp1: { x: cx + rx * (Math.cos(a1) - a * Math.sin(a1) * sinD), y: cy + ry * (Math.sin(a1) + a * Math.cos(a1) * sinD) },
        cp2: { x: cx + rx * (Math.cos(a2) + a * Math.sin(a2) * sinD), y: cy + ry * (Math.sin(a2) - a * Math.cos(a2) * sinD) },
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
        if (!ctx) {
          const canvas = p5._curElement?.elt;
          ctx = canvas?.getContext('2d');
        }
        if (!ctx) return;
        
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
          else if (v.type === 'L') ctx.lineTo(v.x, v.y);
        }
        if (this.style.fill) {
          ctx.fillStyle = this.style.fill;
          ctx.fill();
        }
        if (this.style.stroke) {
          ctx.strokeStyle = this.style.stroke;
          ctx.lineWidth = this.style.strokeWidth || 1;
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
        if (w && h) {
          const vertices = [];
          if (rx > 0 || ry > 0) {
            const r = Math.max(rx, ry);
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
            if (!ctx) {
              const canvas = p5._curElement?.elt;
              ctx = canvas?.getContext('2d');
            }
            if (!ctx) return;
            
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
    if (id && shapes.length > 0) {
      shapes[shapes.length - 1].id = id;
    }
    if (className && shapes.length > 0) {
      shapes[shapes.length - 1].className = className;
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
    const canvas = p5._curElement?.elt;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
  p5.registerAddon(p5SVG);
}

export default p5SVG;