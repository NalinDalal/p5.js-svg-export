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
        syncStyleFromP5();
        currentPath.push(`M ${Math.round(x * 1000) / 1000} ${Math.round(y * 1000) / 1000}`);
      }
      return original.moveTo(x, y);
    };

    ctx.lineTo = function (x, y) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        currentPath.push(`L ${Math.round(x * 1000) / 1000} ${Math.round(y * 1000) / 1000}`);
      }
      return original.lineTo(x, y);
    };

    ctx.bezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        const r = (v) => Math.round(v * 1000) / 1000;
        currentPath.push(`C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(x)} ${r(y)}`);
      }
      return original.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    };

    ctx.quadraticCurveTo = function (cpx, cpy, x, y) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        const r = (v) => Math.round(v * 1000) / 1000;
        currentPath.push(`Q ${r(cpx)} ${r(cpy)}, ${r(x)} ${r(y)}`);
      }
      return original.quadraticCurveTo(cpx, cpy, x, y);
    };

    ctx.arc = function (x, y, radius, startAngle, endAngle, counterClockwise) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        const r = (v) => Math.round(v * 1000) / 1000;

        const startX = x + radius * Math.cos(startAngle);
        const startY = y + radius * Math.sin(startAngle);
        const endX = x + radius * Math.cos(endAngle);
        const endY = y + radius * Math.sin(endAngle);

        let delta = endAngle - startAngle;
        if (counterClockwise) {
          while (delta < 0) delta += 2 * Math.PI;
        }

        const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
        const sweep = counterClockwise ? 0 : 1;
        currentPath.push(`M ${r(startX)} ${r(startY)} A ${r(radius)} ${r(radius)} 0 ${largeArc} ${sweep} ${r(endX)} ${r(endY)}`);
      }
      return original.arc(x, y, radius, startAngle, endAngle, counterClockwise);
    };

    ctx.ellipse = function (x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        const r = (v) => Math.round(v * 1000) / 1000;

        const start = startAngle !== undefined ? startAngle : 0;
        const stop = endAngle !== undefined ? endAngle : 2 * Math.PI;
        const isFull = Math.abs(stop - start) >= 2 * Math.PI - 0.0001;

        if (isFull) {
          currentPath.push(`M ${r(x + radiusX)} ${r(y)} A ${r(radiusX)} ${r(radiusY)} 0 1 1 ${r(x + radiusX)} ${r(y - 0.001)}`);
        } else {
          const startX = x + radiusX * Math.cos(start);
          const startY = y + radiusY * Math.sin(start);
          const endX = x + radiusX * Math.cos(stop);
          const endY = y + radiusY * Math.sin(stop);

          let delta = stop - start;
          const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
          const sweep = counterClockwise ? 0 : 1;
          currentPath.push(`M ${r(startX)} ${r(startY)} A ${r(radiusX)} ${r(radiusY)} 0 ${largeArc} ${sweep} ${r(endX)} ${r(endY)}`);
        }
      }
      return original.ellipse(x, y, radiusX, radiusY, startAngle, endAngle, counterClockwise);
    };

    ctx.rect = function (x, y, w, h, radii) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        const r = (v) => Math.round(v * 1000) / 1000;

        if (radii && (radii.tl || radii.br)) {
          const rad = radii.tl || 0;
          currentPath.push(`M ${r(x + rad)} ${r(y)}`);
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
          currentPath.push(`M ${r(x)} ${r(y)} h ${r(w)} v ${r(h)} h -${r(w)} z`);
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
        syncStyleFromP5();
        const t = getCurrentTransform(ir);
        addCommand(ir, createTextCmd(text, Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, currentStyle(), t));
      }
      return original.fillText(text, x, y);
    };

    ctx.strokeText = function (text, x, y) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        const t = getCurrentTransform(ir);
        const style = { ...currentStyle(), fill: null };
        addCommand(ir, createTextCmd(text, Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, style, t));
      }
      return original.strokeText(text, x, y);
    };

    ctx.drawImage = function (image, dx, dy, dw, dh, sx, sy, sw, sh) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        let args = [dx, dy, dw, dh];
        if (sx !== undefined) {
          args = [sx, sy, sw, sh, dx, dy, dw, dh];
        }
        const t = getCurrentTransform(ir);
        addCommand(ir, createImageCmd(
          image.src || image.currentSrc || '',
          Math.round(args[0] * 1000) / 1000,
          Math.round(args[1] * 1000) / 1000,
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
        syncStyleFromP5();
        flushPath();
        startPath();
      }
      return original.beginPath();
    };

    ctx.fill = function (path) {
      if (ir && ir.recording) {
        syncStyleFromP5();
        flushPath();
      }
      return original.fill(path);
    };

    ctx.stroke = function (path) {
      if (ir && ir.recording) {
        syncStyleFromP5();
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
    if (ir) {
      ir.commands = [];
      ir.recording = true;
    }
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
