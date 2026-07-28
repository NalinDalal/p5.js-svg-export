/**
 * Intermediate Representation (IR) Types
 *
 * Flat array of draw commands with resolved styles and transforms.
 * Serializable, replayable, optimizable.
 */

// ─── Style State ────────────────────────────────────────────────

/**
 * @typedef {Object} StyleState
 * @property {string|null} fill - Fill color, null = noFill()
 * @property {string|null} stroke - Stroke color, null = noStroke()
 * @property {number} strokeWeight - Stroke width
 * @property {CanvasLineCap} strokeCap - butt, round, square
 * @property {CanvasLineJoin} strokeJoin - miter, round, bevel
 * @property {number} opacity - Global alpha (0-1)
 * @property {string} font - CSS font-family
 * @property {number} fontSize - Font size in px
 * @property {CanvasTextAlign} textAlign - start, end, center, left, right
 * @property {CanvasTextBaseline} textBaseline - alphabetic, top, hanging, middle, ideographic, bottom
 */

export const DEFAULT_STYLE = {
    fill: '#000000',
    stroke: null,
    strokeWeight: 1,
    strokeCap: 'butt',
    strokeJoin: 'miter',
    opacity: 1,
    font: 'sans-serif',
    fontSize: 12,
    textAlign: 'start',
    textBaseline: 'alphabetic'
};

// ─── Transform ──────────────────────────────────────────────

/**
 * @typedef {Object} Transform
 * @property {number} a - scaleX
 * @property {number} b - skewY
 * @property {number} c - skewX
 * @property {number} d - scaleY
 * @property {number} e - translateX
 * @property {number} f - translateY
 */

export const IDENTITY_TRANSFORM = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * Multiply two transforms: result = t1 * t2
 * @param {Transform} t1
 * @param {Transform} t2
 * @returns {Transform}
 */
export function multiplyTransform(t1, t2) {
    return {
        a: t1.a * t2.a + t1.c * t2.b,
        b: t1.b * t2.a + t1.d * t2.b,
        c: t1.a * t2.c + t1.c * t2.d,
        d: t1.b * t2.c + t1.d * t2.d,
        e: t1.a * t2.e + t1.c * t2.f + t1.e,
        f: t1.b * t2.e + t1.d * t2.f + t1.f
    };
}

/**
 * Create transform from translate/rotate/scale
 * @param {Object} opts
 * @returns {Transform}
 */
export function createTransform({ tx = 0, ty = 0, rotation = 0, sx = 1, sy = 1 } = {}) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
        a: cos * sx,
        b: sin * sx,
        c: -sin * sy,
        d: cos * sy,
        e: tx,
        f: ty
    };
}

/**
 * Convert transform to SVG matrix string
 * @param {Transform} t
 * @returns {string}
 */
export function transformToSVGMatrix(t) {
    const num = (n) => Math.round(n * 1000) / 1000;
    return `matrix(${num(t.a)} ${num(t.b)} ${num(t.c)} ${num(t.d)} ${num(t.e)} ${num(t.f)})`;
}

/**
 * Decompose transform into components (for debugging/optimization)
 * @param {Transform} t
 * @returns {{tx:number, ty:number, sx:number, sy:number, rotation:number}}
 */
export function decomposeTransform(t) {
    const tx = t.e;
    const ty = t.f;
    const sx = Math.sqrt(t.a * t.a + t.b * t.b);
    const sy = Math.sqrt(t.c * t.c + t.d * t.d);
    const rotation = Math.atan2(t.b, t.a);
    return { tx, ty, sx, sy, rotation };
}

// ─── Draw Commands ──────────────────────────────────────────

/**
 * @typedef {Object} DrawCommandBase
 * @property {string} type
 * @property {StyleState} style
 * @property {Transform} transform
 */

/** @typedef {DrawCommandBase & {type:'line', x1:number, y1:number, x2:number, y2:number}} LineCmd */
/** @typedef {DrawCommandBase & {type:'rect', x:number, y:number, w:number, h:number, radii?:{tl:number,tr:number,br:number,bl:number}}} RectCmd */
/** @typedef {DrawCommandBase & {type:'ellipse', cx:number, cy:number, rx:number, ry:number}} EllipseCmd */
/** @typedef {DrawCommandBase & {type:'arc', cx:number, cy:number, rx:number, ry:number, start:number, stop:number, ccw:boolean}} ArcCmd */
/** @typedef {DrawCommandBase & {type:'path', d:string}} PathCmd */
/** @typedef {DrawCommandBase & {type:'text', str:string, x:number, y:number}} TextCmd */
/** @typedef {DrawCommandBase & {type:'image', href:string, x:number, y:number, w:number, h:number}} ImageCmd */
/** @typedef {DrawCommandBase & {type:'group', children:DrawCommand[]}} GroupCmd */

/** @typedef {LineCmd|RectCmd|EllipseCmd|ArcCmd|PathCmd|TextCmd|ImageCmd|GroupCmd} DrawCommand */

/**
 * Create a line command
 */
export function createLineCmd(x1, y1, x2, y2, style, transform) {
    return { type: 'line', x1, y1, x2, y2, style, transform };
}

/**
 * Create a rect command
 */
export function createRectCmd(x, y, w, h, radii, style, transform) {
    return { type: 'rect', x, y, w, h, radii, style, transform };
}

/**
 * Create an ellipse command
 */
export function createEllipseCmd(cx, cy, rx, ry, style, transform) {
    return { type: 'ellipse', cx, cy, rx, ry, style, transform };
}

/**
 * Create an arc command
 */
export function createArcCmd(cx, cy, rx, ry, start, stop, ccw, style, transform) {
    return { type: 'arc', cx, cy, rx, ry, start, stop, ccw, style, transform };
}

/**
 * Create a path command (from beginShape/vertex)
 */
export function createPathCmd(d, style, transform) {
    return { type: 'path', d, style, transform };
}

/**
 * Create a text command
 */
export function createTextCmd(str, x, y, style, transform) {
    return { type: 'text', str, x, y, style, transform };
}

/**
 * Create an image command
 */
export function createImageCmd(href, x, y, w, h, style, transform) {
    return { type: 'image', href, x, y, w, h, style, transform };
}

/**
 * Create a group command (for push/pop)
 */
export function createGroupCmd(children, transform) {
    return { type: 'group', children, transform, style: DEFAULT_STYLE };
}

// ─── IR Builder ─────────────────────────────────────────────

/**
 * @typedef {Object} IRState
 * @property {DrawCommand[]} commands
 * @property {StyleState} currentStyle
 * @property {Transform[]} transformStack
 * @property {boolean} recording
 */

export function createIRState() {
    return {
        commands: [],
        currentStyle: { ...DEFAULT_STYLE },
        transformStack: [IDENTITY_TRANSFORM],
        recording: true
    };
}

export function getCurrentTransform(state) {
    return state.transformStack[state.transformStack.length - 1];
}

export function pushTransform(state, transform) {
    const current = getCurrentTransform(state);
    state.transformStack.push(multiplyTransform(current, transform));
}

export function popTransform(state) {
    if (state.transformStack.length > 1) {
        state.transformStack.pop();
    }
}

export function setTransform(state, transform) {
    state.transformStack[state.transformStack.length - 1] = transform;
}

export function addCommand(state, cmd) {
    if (state.recording) {
        state.commands.push(cmd);
    }
}

// ─── Style Helpers ──────────────────────────────────────────

export function colorToHex(c) {
    if (!c || c === 'none') return null;
    if (typeof c === 'string') {
        if (c.startsWith('rgba')) {
            const m = c.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
            if (m) {
                const r = parseInt(m[1]);
                const g = parseInt(m[2]);
                const b = parseInt(m[3]);
                const a = parseFloat(m[4]);
                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
                return `${hex}${aHex}`;
            }
        }
        if (c.startsWith('rgb')) {
            const m = c.match(/rgb\((\d+),(\d+),(\d+)\)/);
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
        if (s.startsWith('rgba')) {
            const m = s.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
            if (m) {
                const r = parseInt(m[1]);
                const g = parseInt(m[2]);
                const b = parseInt(m[3]);
                const a = parseFloat(m[4]);
                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
                return `${hex}${aHex}`;
            }
        }
        if (s.startsWith('rgb')) {
            const m = s.match(/rgb\((\d+),(\d+),(\d+)\)/);
            if (m) {
                const r = parseInt(m[1]);
                const g = parseInt(m[2]);
                const b = parseInt(m[3]);
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            }
        }
    }
    return '#000000';
}

export function cloneStyle(style) {
    return { ...style };
}

// ─── Radii Normalization ────────────────────────────────────

export function normalizeRadii(radii) {
    if (!radii) return null;
    if (typeof radii === 'number') {
        return { tl: radii, tr: radii, br: radii, bl: radii };
    }
    if (Array.isArray(radii)) {
        if (radii.length === 1) {
            const r = radii[0];
            return { tl: r, tr: r, br: r, bl: r };
        }
        if (radii.length === 2) {
            return { tl: radii[0], tr: radii[1], br: radii[0], bl: radii[1] };
        }
        if (radii.length === 4) {
            return { tl: radii[0], tr: radii[1], br: radii[2], bl: radii[3] };
        }
    }
    if (typeof radii === 'object' && radii.tl !== undefined) {
        return {
            tl: radii.tl || 0,
            tr: radii.tr || 0,
            br: radii.br || 0,
            bl: radii.bl || 0
        };
    }
    return null;
}

// ─── IR → SVG Generation ──────────────────────────────────

const num = (n) => Math.round(n * 1000) / 1000;

function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function styleToSVGAttrs(style) {
    const attrs = [];
    if (style.fill && style.fill !== 'none') {
        attrs.push(`fill="${style.fill}"`);
    } else {
        attrs.push('fill="none"');
    }
    if (style.stroke && style.stroke !== 'none') {
        attrs.push(`stroke="${style.stroke}"`);
        attrs.push(`stroke-width="${num(style.strokeWeight)}"`);
        attrs.push(`stroke-linecap="${style.strokeCap}"`);
        attrs.push(`stroke-linejoin="${style.strokeJoin}"`);
    } else {
        attrs.push('stroke="none"');
    }
    if (style.opacity !== 1 && style.opacity !== undefined) {
        attrs.push(`opacity="${num(style.opacity)}"`);
    }
    return attrs.join(' ');
}

function textAnchorFromAlign(align) {
    if (align === 'center') return 'middle';
    if (align === 'end' || align === 'right') return 'end';
    return 'start';
}

function commandToSVG(cmd, width, height) {
    const transformAttr = cmd.transform && (cmd.transform.a !== 1 || cmd.transform.b !== 0 || cmd.transform.c !== 0 || cmd.transform.d !== 1 || cmd.transform.e !== 0 || cmd.transform.f !== 0)
        ? ` transform="${transformToSVGMatrix(cmd.transform)}"`
        : '';
    const styleAttrs = styleToSVGAttrs(cmd.style);

    switch (cmd.type) {
        case 'line':
            return `<line x1="${num(cmd.x1)}" y1="${num(cmd.y1)}" x2="${num(cmd.x2)}" y2="${num(cmd.y2)}" ${styleAttrs}${transformAttr}/>`;
        case 'rect': {
            const { x, y, w, h, radii } = cmd;
            const normRadii = normalizeRadii(radii);
            if (normRadii && (normRadii.tl || normRadii.tr || normRadii.br || normRadii.bl)) {
                const tl = normRadii.tl || 0;
                const tr = normRadii.tr || 0;
                const br = normRadii.br || 0;
                const bl = normRadii.bl || 0;
                const d = `M ${num(x + tl)} ${num(y)} h ${num(w - tl - tr)} a ${num(tr)} ${num(tr)} 0 0 1 ${num(tr)} ${num(tr)} v ${num(h - tr - br)} a ${num(br)} ${num(br)} 0 0 1 ${num(-br)} ${num(br)} h ${num(-(w - br - bl))} a ${num(bl)} ${num(bl)} 0 0 1 ${num(-bl)} ${num(-bl)} v ${num(-(h - bl - tl))} a ${num(tl)} ${num(tl)} 0 0 1 ${num(tl)} ${num(-tl)} z`;
                return `<path d="${d}" ${styleAttrs}${transformAttr}/>`;
            }
            return `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" ${styleAttrs}${transformAttr}/>`;
        }
        case 'ellipse':
            return `<ellipse cx="${num(cmd.cx)}" cy="${num(cmd.cy)}" rx="${num(cmd.rx)}" ry="${num(cmd.ry)}" ${styleAttrs}${transformAttr}/>`;
        case 'arc': {
            const { cx, cy, rx, ry, start, stop, ccw } = cmd;
            const startX = cx + rx * Math.cos(start);
            const startY = cy + ry * Math.sin(start);
            const endX = cx + rx * Math.cos(stop);
            const endY = cy + ry * Math.sin(stop);
            const delta = stop - start;
            const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
            const sweep = ccw ? 0 : 1;
            const d = `M ${num(startX)} ${num(startY)} A ${num(rx)} ${num(ry)} 0 ${largeArc} ${sweep} ${num(endX)} ${num(endY)}`;
            return `<path d="${d}" ${styleAttrs}${transformAttr}/>`;
        }
        case 'path':
            return `<path d="${cmd.d}" ${styleAttrs}${transformAttr}/>`;
        case 'text': {
            const anchor = textAnchorFromAlign(cmd.style.textAlign);
            const fillAttr = cmd.style.fill && cmd.style.fill !== 'none' ? `fill="${cmd.style.fill}"` : 'fill="none"';
            const strokeAttr = cmd.style.stroke && cmd.style.stroke !== 'none' ? `stroke="${cmd.style.stroke}" stroke-width="${num(cmd.style.strokeWeight)}"` : 'stroke="none"';
            const fontAttr = `font-family="${cmd.style.font}" font-size="${num(cmd.style.fontSize)}"`;
            return `<text x="${num(cmd.x)}" y="${num(cmd.y)}" ${fillAttr} ${strokeAttr} ${fontAttr} text-anchor="${anchor}" dominant-baseline="${cmd.style.textBaseline}"${transformAttr}>${escapeXml(cmd.str)}</text>`;
        }
        case 'image':
            return `<image href="${cmd.href}" x="${num(cmd.x)}" y="${num(cmd.y)}" width="${num(cmd.w)}" height="${num(cmd.h)}"${transformAttr}/>`;
        case 'group': {
            const children = cmd.children.map(c => commandToSVG(c, width, height)).join('\n');
            return `<g${transformAttr}>\n${children}\n</g>`;
        }
        default:
            return '';
    }
}

export function commandsToSVG(commands, width, height) {
    const elements = commands.map(cmd => commandToSVG(cmd, width, height)).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${elements}\n</svg>`;
}