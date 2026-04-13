/**
 * p5.js SVG Export Addon
 * 
 * Provides SVG export for p5.js sketches by intercepting canvas 2D context.
 * Supports: paths, shapes, text, images, transforms
 * 
 * Usage:
 *   saveSVG(filename) - Save current frame as SVG
 *   getSVG() - Get SVG string
 */

function p5SVG(p5, fn, lifecycles) {
  let paths = [];
  let texts = [];
  let images = [];
  let transforms = [];
  let transformStack = [];

  let currentFill = 'none';
  let currentStroke = 'black';
  let currentStrokeWidth = 1;
  let currentStrokeCap = 'butt';
  let currentStrokeJoin = 'miter';
  let currentFont = 'sans-serif';
  let currentFontSize = 12;
  let currentTextAlign = 'start';
  let currentTextBaseline = 'alphabetic';
  let isRecording = false;
  let currentPath = [];

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
    for (const t of transforms) {
      const nx = t[0] * tx + t[1] * ty + t[4];
      const ny = t[2] * tx + t[3] * ty + t[5];
      tx = nx; ty = ny;
    }
    return { x: tx, y: ty };
  }

  function getTransformString() {
    if (transforms.length === 0) return '';
    const t = transforms;
    return `matrix(${num(t[0])} ${num(t[1])} ${num(t[2])} ${num(t[3])} ${num(t[4])} ${num(t[5])})`;
  }

  function startPath() {
    currentPath = [];
  }

  function endPath() {
    if (currentPath.length === 0) return;
    paths.push({
      d: currentPath.join(' '),
      fill: currentFill,
      stroke: currentStroke,
      strokeWidth: currentStrokeWidth,
      strokeLinecap: currentStrokeCap,
      strokeLinejoin: currentStrokeJoin,
      transform: getTransformString()
    });
    currentPath = [];
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
      if (isRecording) {
        const p = applyTransform(x, y);
        currentPath.push(`M ${num(p.x)} ${num(p.y)}`);
      }
      return original.moveTo(x, y);
    };

    ctx.lineTo = function(x, y) {
      if (isRecording) {
        const p = applyTransform(x, y);
        currentPath.push(`L ${num(p.x)} ${num(p.y)}`);
      }
      return original.lineTo(x, y);
    };

    ctx.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
      if (isRecording) {
        const p1 = applyTransform(cp1x, cp1y);
        const p2 = applyTransform(cp2x, cp2y);
        const p3 = applyTransform(x, y);
        currentPath.push(`C ${num(p1.x)} ${num(p1.y)}, ${num(p2.x)} ${num(p2.y)}, ${num(p3.x)} ${num(p3.y)}`);
      }
      return original.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    };

    ctx.quadraticCurveTo = function(cpx, cpy, x, y) {
      if (isRecording) {
        const p1 = applyTransform(cpx, cpy);
        const p2 = applyTransform(x, y);
        currentPath.push(`Q ${num(p1.x)} ${num(p1.y)}, ${num(p2.x)} ${num(p2.y)}`);
      }
      return original.quadraticCurveTo(cpx, cpy, x, y);
    };

    ctx.arc = function(x, y, radius, startAngle, endAngle, counterClockwise) {
      if (isRecording) {
        const cx = x, cy = y;
        let startX = cx + radius * Math.cos(startAngle);
        let startY = cy + radius * Math.sin(startAngle);
        let endX = cx + radius * Math.cos(endAngle);
        let endY = cy + radius * Math.sin(endAngle);
        
        const pStart = applyTransform(startX, startY);
        const pEnd = applyTransform(endX, endY);
        const pCenter = applyTransform(cx, cy);
        
        let delta = endAngle - startAngle;
        if (counterClockwise) {
          while (delta < 0) delta += 2 * Math.PI;
        }
        
        const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
        const sweep = counterClockwise ? 0 : 1;
        
        currentPath.push(`M ${num(pStart.x)} ${num(pStart.y)} A ${num(radius)} ${num(radius)} 0 ${largeArc} ${sweep} ${num(pEnd.x)} ${num(pEnd.y)}`);
      }
      return original.arc(x, y, radius, startAngle, endAngle, counterClockwise);
    };

    ctx.ellipse = function(x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise) {
      if (isRecording) {
        const start = startAngle !== undefined ? startAngle : 0;
        const stop = endAngle !== undefined ? endAngle : 2 * Math.PI;
        const isFull = Math.abs(stop - start) >= 2 * Math.PI - 0.0001;
        
        const pCenter = applyTransform(x, y);
        
        if (isFull) {
          currentPath.push(`M ${num(pCenter.x + radiusX)} ${num(pCenter.y)} A ${num(radiusX)} ${num(radiusY)} 0 1 1 ${num(pCenter.x + radiusX)} ${num(pCenter.y - 0.001)}`);
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
          
          currentPath.push(`M ${num(pStart.x)} ${num(pStart.y)} A ${num(radiusX)} ${num(radiusY)} 0 ${largeArc} ${sweep} ${num(pEnd.x)} ${num(pEnd.y)}`);
        }
      }
      return original.ellipse(x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise);
    };

    ctx.rect = function(x, y, w, h, radii) {
      if (isRecording) {
        const p = applyTransform(x, y);
        if (radii && (radii.tl || radii.br)) {
          const r = radii.tl || 0;
          currentPath.push(`M ${num(p.x + r)} ${num(p.y)}`);
          currentPath.push(`h ${num(w - r * 2)}`);
          if (r > 0) currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 ${num(r)} ${num(r)}`);
          currentPath.push(`v ${num(h - r * 2)}`);
          if (r > 0) currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 -${num(r)} ${num(r)}`);
          currentPath.push(`h -${num(w - r * 2)}`);
          if (r > 0) currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 -${num(r)} -${num(r)}`);
          currentPath.push(`v -${num(h - r * 2)}`);
          if (r > 0) currentPath.push(`a ${num(r)} ${num(r)} 0 0 1 ${num(r)} -${num(r)}`);
          currentPath.push(`z`);
        } else {
          currentPath.push(`M ${num(p.x)} ${num(p.y)} h ${num(w)} v ${num(h)} h -${num(w)} z`);
        }
      }
      return original.rect(x, y, w, h, radii);
    };

    ctx.closePath = function() {
      if (isRecording) {
        currentPath.push('Z');
      }
      return original.closePath();
    };

    ctx.fillText = function(text, x, y) {
      if (isRecording) {
        const p = applyTransform(x, y);
        texts.push({
          text: text,
          x: num(p.x),
          y: num(p.y),
          fill: currentFill,
          font: currentFont,
          fontSize: currentFontSize,
          textAlign: currentTextAlign,
          textBaseline: currentTextBaseline,
          transform: getTransformString()
        });
      }
      return original.fillText(text, x, y);
    };

    ctx.strokeText = function(text, x, y) {
      if (isRecording) {
        const p = applyTransform(x, y);
        texts.push({
          text: text,
          x: num(p.x),
          y: num(p.y),
          stroke: currentStroke,
          strokeWidth: currentStrokeWidth,
          font: currentFont,
          fontSize: currentFontSize,
          textAlign: currentTextAlign,
          textBaseline: currentTextBaseline,
          transform: getTransformString()
        });
      }
      return original.strokeText(text, x, y);
    };

    ctx.drawImage = function(image, dx, dy, dw, dh, sx, sy, sw, sh) {
      if (isRecording) {
        let args = [dx, dy, dw, dh];
        if (sx !== undefined) {
          args = [sx, sy, sw, sh, dx, dy, dw, dh];
        }
        const p = applyTransform(args[0], args[1]);
        images.push({
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
      transformStack.push([...transforms]);
      return original.save();
    };

    ctx.restore = function() {
      transforms = transformStack.pop() || [];
      return original.restore();
    };

    ctx.setTransform = function(a, b, c, d, e, f) {
      if (isRecording) {
        transforms = [a, b, c, d, e, f];
      }
      return original.setTransform(a, b, c, d, e, f);
    };

    ctx.transform = function(a, b, c, d, e, f) {
      if (isRecording) {
        const t = [a, b, c, d, e, f];
        transforms = [
          transforms[0] * t[0] + transforms[1] * t[2],
          transforms[0] * t[1] + transforms[1] * t[3],
          transforms[2] * t[0] + transforms[3] * t[2],
          transforms[2] * t[1] + transforms[3] * t[3],
          transforms[4] * t[0] + transforms[5] * t[2] + t[4],
          transforms[4] * t[1] + transforms[5] * t[3] + t[5]
        ];
      }
      return original.transform(a, b, c, d, e, f);
    };

    ctx.beginPath = function() {
      startPath();
      return original.beginPath();
    };

    ctx.fill = function(path) {
      if (isRecording && currentPath.length > 0) {
        endPath();
      }
      return original.fill(path);
    };

    ctx.stroke = function(path) {
      if (isRecording && currentPath.length > 0) {
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
    if (!isRecording) {
      isRecording = true;
    }
    
    paths = [];
    texts = [];
    images = [];
    transforms = [];
    transformStack = [];
    currentPath = [];
    
    const states = p5._renderer?.states;
    if (states) {
      currentFill = colorToHex(states.fillColor) || 'none';
      currentStroke = colorToHex(states.strokeColor) || 'black';
      currentStrokeWidth = states.strokeWeight || 1;
      currentFont = states.textFont?.family || 'sans-serif';
      currentFontSize = states.textSize || 12;
      currentTextAlign = states.textAlign || 'start';
      currentTextBaseline = states.textBaseline || 'alphabetic';
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
    isRecording = true;
  };

  fn.stopSVGRecord = function() {
    isRecording = false;
  };

  function generateSVG() {
    const pathElements = paths.map(p => {
      const transformAttr = p.transform ? ` transform="${p.transform}"` : '';
      return `  <path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linecap="${p.strokeLinecap}" stroke-linejoin="${p.strokeLinejoin}"${transformAttr}/>`;
    }).join('\n');

    const textElements = texts.map(t => {
      const transformAttr = t.transform ? ` transform="${t.transform}"` : '';
      const anchor = t.textAlign === 'center' ? 'middle' : t.textAlign === 'end' ? 'end' : 'start';
      if (t.fill) {
        return `  <text x="${t.x}" y="${t.y}" fill="${t.fill}" font-family="${t.font}" font-size="${t.fontSize}" text-anchor="${anchor}"${transformAttr}>${escapeXml(t.text)}</text>`;
      } else {
        return `  <text x="${t.x}" y="${t.y}" stroke="${t.stroke}" stroke-width="${t.strokeWidth}" font-family="${t.font}" font-size="${t.fontSize}" text-anchor="${anchor}" fill="none"${transformAttr}>${escapeXml(t.text)}</text>`;
      }
    }).join('\n');

    const imageElements = images.map(i => {
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
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(p5SVG);
}

export default p5SVG;