import {
  multiplyTransform,
  createTransform,
  colorToHex,
  createIRState,
  getCurrentTransform,
  setTransform,
  addCommand,
  createPathCmd,
  createTextCmd,
  createImageCmd,
  commandsToSVG
} from './ir/types.js';

function p5SVG(p5, fn, lifecycles) {
  let ir = null;
  let currentPath = [];
  let currentFill = null;
  let currentStroke = null;
  let currentStrokeWeight = 1;
  let currentStrokeCap = 'butt';
  let currentStrokeJoin = 'miter';
  let currentFont = 'sans-serif';
  let currentFontSize = 12;
  let currentTextAlign = 'start';
  let currentTextBaseline = 'alphabetic';

  function syncStyleFromP5() {
    const states = p5._renderer?.states;
    if (!states) return;
    currentFill = colorToHex(states.fillColor) || null;
    currentStroke = colorToHex(states.strokeColor) || null;
    currentStrokeWeight = states.strokeWeight ?? 1;
    currentStrokeCap = states.strokeCap ?? 'butt';
    currentStrokeJoin = states.strokeJoin ?? 'miter';
    currentFont = states.textFont?.family ?? 'sans-serif';
    currentFontSize = states.textSize ?? 12;
    currentTextAlign = states.textAlign ?? 'start';
    currentTextBaseline = states.textBaseline ?? 'alphabetic';
  }

  function currentStyle() {
    return {
      fill: currentFill,
      stroke: currentStroke,
      strokeWeight: currentStrokeWeight,
      strokeCap: currentStrokeCap,
      strokeJoin: currentStrokeJoin,
      font: currentFont,
      fontSize: currentFontSize,
      textAlign: currentTextAlign,
      textBaseline: currentTextBaseline
    };
  }

  function startPath() {
    currentPath = [];
  }

  function flushPath() {
    if (!ir || currentPath.length === 0) return;
    const d = currentPath.join(' ');
    addCommand(ir, createPathCmd(d, currentStyle(), getCurrentTransform(ir)));
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

    ctx.moveTo = function (x, y) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const px = t.a * x + t.c * y + t.e;
        const py = t.b * x + t.d * y + t.f;
        currentPath.push(`M ${Math.round(px * 1000) / 1000} ${Math.round(py * 1000) / 1000}`);
      }
      return original.moveTo(x, y);
    };

    ctx.lineTo = function (x, y) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const px = t.a * x + t.c * y + t.e;
        const py = t.b * x + t.d * y + t.f;
        currentPath.push(`L ${Math.round(px * 1000) / 1000} ${Math.round(py * 1000) / 1000}`);
      }
      return original.lineTo(x, y);
    };

    ctx.bezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const r = (v) => Math.round(v * 1000) / 1000;
        const tx = (x, y) => ({ x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f });
        const p1 = tx(cp1x, cp1y);
        const p2 = tx(cp2x, cp2y);
        const p3 = tx(x, y);
        currentPath.push(`C ${r(p1.x)} ${r(p1.y)}, ${r(p2.x)} ${r(p2.y)}, ${r(p3.x)} ${r(p3.y)}`);
      }
      return original.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    };

    ctx.quadraticCurveTo = function (cpx, cpy, x, y) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const r = (v) => Math.round(v * 1000) / 1000;
        const tx = (x, y) => ({ x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f });
        const p1 = tx(cpx, cpy);
        const p2 = tx(x, y);
        currentPath.push(`Q ${r(p1.x)} ${r(p1.y)}, ${r(p2.x)} ${r(p2.y)}`);
      }
      return original.quadraticCurveTo(cpx, cpy, x, y);
    };

    ctx.arc = function (x, y, radius, startAngle, endAngle, counterClockwise) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const r = (v) => Math.round(v * 1000) / 1000;
        const tx = (x, y) => ({ x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f });

        const startX = x + radius * Math.cos(startAngle);
        const startY = y + radius * Math.sin(startAngle);
        const endX = x + radius * Math.cos(endAngle);
        const endY = y + radius * Math.sin(endAngle);

        const pStart = tx(startX, startY);
        const pEnd = tx(endX, endY);

        let delta = endAngle - startAngle;
        if (counterClockwise) {
          while (delta < 0) delta += 2 * Math.PI;
        }

        const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
        const sweep = counterClockwise ? 0 : 1;
        currentPath.push(`M ${r(pStart.x)} ${r(pStart.y)} A ${r(radius)} ${r(radius)} 0 ${largeArc} ${sweep} ${r(pEnd.x)} ${r(pEnd.y)}`);
      }
      return original.arc(x, y, radius, startAngle, endAngle, counterClockwise);
    };

    ctx.ellipse = function (x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const r = (v) => Math.round(v * 1000) / 1000;
        const tx = (x, y) => ({ x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f });

        const start = startAngle !== undefined ? startAngle : 0;
        const stop = endAngle !== undefined ? endAngle : 2 * Math.PI;
        const isFull = Math.abs(stop - start) >= 2 * Math.PI - 0.0001;

        if (isFull) {
          const pCenter = tx(x, y);
          currentPath.push(`M ${r(pCenter.x + radiusX)} ${r(pCenter.y)} A ${r(radiusX)} ${r(radiusY)} 0 1 1 ${r(pCenter.x + radiusX)} ${r(pCenter.y - 0.001)}`);
        } else {
          const startX = x + radiusX * Math.cos(start);
          const startY = y + radiusY * Math.sin(start);
          const endX = x + radiusX * Math.cos(stop);
          const endY = y + radiusY * Math.sin(stop);

          const pStart = tx(startX, startY);
          const pEnd = tx(endX, endY);

          let delta = stop - start;
          const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
          const sweep = counterClockwise ? 0 : 1;
          currentPath.push(`M ${r(pStart.x)} ${r(pStart.y)} A ${r(radiusX)} ${r(radiusY)} 0 ${largeArc} ${sweep} ${r(pEnd.x)} ${r(pEnd.y)}`);
        }
      }
      return original.ellipse(x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise);
    };

    ctx.rect = function (x, y, w, h, radii) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const r = (v) => Math.round(v * 1000) / 1000;
        const tx = (x, y) => ({ x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f });
        const p = tx(x, y);

        if (radii && (radii.tl || radii.br)) {
          const rad = radii.tl || 0;
          currentPath.push(`M ${r(p.x + rad)} ${r(p.y)}`);
          currentPath.push(`h ${r(w - rad * 2)}`);
          if (rad > 0) currentPath.push(`a ${r(rad)} ${r(rad)} 0 0 1 ${r(rad)} ${r(rad)}`);
          currentPath.push(`v ${r(h - rad * 2)}`);
          if (rad > 0) currentPath.push(`a ${r(rad)} ${r(rad)} 0 0 1 -${r(rad)} ${r(rad)}`);
          currentPath.push(`h -${r(w - rad * 2)}`);
          if (rad > 0) currentPath.push(`a ${r(rad)} ${r(rad)} 0 0 1 -${r(rad)} -${r(rad)}`);
          currentPath.push(`v -${r(h - rad * 2)}`);
          if (rad > 0) currentPath.push(`a ${r(rad)} ${r(rad)} 0 0 1 ${r(rad)} -${r(rad)}`);
          currentPath.push('z');
        } else {
          currentPath.push(`M ${r(p.x)} ${r(p.y)} h ${r(w)} v ${r(h)} h -${r(w)} z`);
        }
      }
      return original.rect(x, y, w, h, radii);
    };

    ctx.closePath = function () {
      if (ir && ir.recording) {
        currentPath.push('Z');
      }
      return original.closePath();
    };

    ctx.fillText = function (text, x, y) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const px = t.a * x + t.c * y + t.e;
        const py = t.b * x + t.d * y + t.f;
        addCommand(ir, createTextCmd(text, Math.round(px * 1000) / 1000, Math.round(py * 1000) / 1000, currentStyle(), t));
      }
      return original.fillText(text, x, y);
    };

    ctx.strokeText = function (text, x, y) {
      if (ir && ir.recording) {
        const t = getCurrentTransform(ir);
        const px = t.a * x + t.c * y + t.e;
        const py = t.b * x + t.d * y + t.f;
        const style = { ...currentStyle(), fill: null };
        addCommand(ir, createTextCmd(text, Math.round(px * 1000) / 1000, Math.round(py * 1000) / 1000, style, t));
      }
      return original.strokeText(text, x, y);
    };

    ctx.drawImage = function (image, dx, dy, dw, dh, sx, sy, sw, sh) {
      if (ir && ir.recording) {
        let args = [dx, dy, dw, dh];
        if (sx !== undefined) {
          args = [sx, sy, sw, sh, dx, dy, dw, dh];
        }
        const t = getCurrentTransform(ir);
        const px = t.a * args[0] + t.c * args[1] + t.e;
        const py = t.b * args[0] + t.d * args[1] + t.f;
        addCommand(ir, createImageCmd(
          image.src || image.currentSrc || '',
          Math.round(px * 1000) / 1000,
          Math.round(py * 1000) / 1000,
          args[2], args[3],
          currentStyle(), t
        ));
      }
      return original.drawImage(image, dx, dy, dw, dh, sx, sy, sw, sh);
    };

    ctx.save = function () {
      if (ir && ir.recording) {
        const current = getCurrentTransform(ir);
        ir.transformStack.push({ ...current });
      }
      return original.save();
    };

    ctx.restore = function () {
      if (ir && ir.recording) {
        if (ir.transformStack.length > 1) {
          ir.transformStack.pop();
        }
      }
      return original.restore();
    };

    ctx.setTransform = function (a, b, c, d, e, f) {
      if (ir && ir.recording) {
        setTransform(ir, createTransform({
          sx: Math.sqrt(a * a + b * b),
          sy: Math.sqrt(c * c + d * d),
          rotation: Math.atan2(b, a),
          tx: e,
          ty: f
        }));
      }
      return original.setTransform(a, b, c, d, e, f);
    };

    ctx.transform = function (a, b, c, d, e, f) {
      if (ir && ir.recording) {
        const newT = createTransform({
          sx: Math.sqrt(a * a + b * b),
          sy: Math.sqrt(c * c + d * d),
          rotation: Math.atan2(b, a),
          tx: e,
          ty: f
        });
        const current = getCurrentTransform(ir);
        setTransform(ir, multiplyTransform(current, newT));
      }
      return original.transform(a, b, c, d, e, f);
    };

    ctx.beginPath = function () {
      if (ir && ir.recording) {
        flushPath();
        startPath();
      }
      return original.beginPath();
    };

    ctx.fill = function (path) {
      if (ir && ir.recording) {
        flushPath();
      }
      return original.fill(path);
    };

    ctx.stroke = function (path) {
      if (ir && ir.recording) {
        flushPath();
      }
      return original.stroke(path);
    };

    return original;
  }

  let wrappedContext = null;

  lifecycles.postsetup = function () {
    const canvas = p5._curElement?.elt;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      wrappedContext = wrapContext(ctx);
    }
    ir = createIRState();
  };

  lifecycles.postdraw = function () {
    if (ir) {
      ir.commands = [];
    }
    currentPath = [];
    syncStyleFromP5();
  };

  fn.saveSVG = function (filename = 'sketch.svg') {
    if (ir) {
      flushPath();
      const svg = commandsToSVG(ir.commands, p5.width, p5.height);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  fn.getSVG = function () {
    if (ir) {
      flushPath();
      return commandsToSVG(ir.commands, p5.width, p5.height);
    }
    return '';
  };

  fn.startSVGRecord = function () {
    if (ir) ir.recording = true;
  };

  fn.stopSVGRecord = function () {
    if (ir) ir.recording = false;
  };

  fn.getIR = function () {
    return ir;
  };
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(p5SVG);
}

export default p5SVG;
