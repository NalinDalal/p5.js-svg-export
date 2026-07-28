import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STYLE,
  IDENTITY_TRANSFORM,
  multiplyTransform,
  createTransform,
  transformToSVGMatrix,
  decomposeTransform,
  createIRState,
  getCurrentTransform,
  pushTransform,
  popTransform,
  setTransform,
  addCommand,
  colorToHex,
  cloneStyle,
  createLineCmd,
  createRectCmd,
  createEllipseCmd,
  createArcCmd,
  createPathCmd,
  createTextCmd,
  createImageCmd,
  createGroupCmd,
  commandsToSVG
} from './types.js';

// ─── Transform Tests ─────────────────────────────────────────────

describe('IDENTITY_TRANSFORM', () => {
  it('has correct matrix values', () => {
    expect(IDENTITY_TRANSFORM).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  });
});

describe('multiplyTransform', () => {
  it('identity × identity = identity', () => {
    const result = multiplyTransform(IDENTITY_TRANSFORM, IDENTITY_TRANSFORM);
    expect(result).toEqual(IDENTITY_TRANSFORM);
  });

  it('identity × t = t', () => {
    const t = { a: 2, b: 1, c: -1, d: 3, e: 10, f: 20 };
    const result = multiplyTransform(IDENTITY_TRANSFORM, t);
    expect(result).toEqual(t);
  });

  it('t × identity = t', () => {
    const t = { a: 2, b: 1, c: -1, d: 3, e: 10, f: 20 };
    const result = multiplyTransform(t, IDENTITY_TRANSFORM);
    expect(result).toEqual(t);
  });

  it('translates correctly', () => {
    const t1 = { a: 1, b: 0, c: 0, d: 1, e: 5, f: 10 };
    const t2 = { a: 1, b: 0, c: 0, d: 1, e: 3, f: 7 };
    const result = multiplyTransform(t1, t2);
    expect(result.e).toBe(8);
    expect(result.f).toBe(17);
  });

  it('scales correctly', () => {
    const s = { a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 };
    const result = multiplyTransform(s, s);
    expect(result.a).toBe(4);
    expect(result.d).toBe(9);
  });

  it('is not commutative', () => {
    const t1 = { a: 1, b: 0, c: 0, d: 1, e: 5, f: 0 };
    const t2 = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 };
    const r1 = multiplyTransform(t1, t2);
    const r2 = multiplyTransform(t2, t1);
    expect(r1.e).toBe(5);
    expect(r2.e).toBe(10);
  });
});

describe('createTransform', () => {
  it('returns identity by default', () => {
    const t = createTransform();
    expect(t.a).toBeCloseTo(1);
    expect(t.b).toBeCloseTo(0);
    expect(t.c).toBeCloseTo(0);
    expect(t.d).toBeCloseTo(1);
    expect(t.e).toBeCloseTo(0);
    expect(t.f).toBeCloseTo(0);
  });

  it('creates translate transform', () => {
    const t = createTransform({ tx: 10, ty: 20 });
    expect(t.e).toBe(10);
    expect(t.f).toBe(20);
    expect(t.a).toBeCloseTo(1);
    expect(t.d).toBeCloseTo(1);
  });

  it('creates scale transform', () => {
    const t = createTransform({ sx: 2, sy: 3 });
    expect(t.a).toBeCloseTo(2);
    expect(t.d).toBeCloseTo(3);
  });

  it('creates rotation transform', () => {
    const t = createTransform({ rotation: Math.PI / 2 });
    expect(t.a).toBeCloseTo(0);
    expect(t.b).toBeCloseTo(1);
    expect(t.c).toBeCloseTo(-1);
    expect(t.d).toBeCloseTo(0);
  });

  it('creates combined transform', () => {
    const t = createTransform({ tx: 5, ty: 10, rotation: Math.PI, sx: 2, sy: 2 });
    expect(t.e).toBe(5);
    expect(t.f).toBe(10);
    expect(t.a).toBeCloseTo(-2);
    expect(t.d).toBeCloseTo(-2);
  });
});

describe('transformToSVGMatrix', () => {
  it('formats identity matrix', () => {
    const result = transformToSVGMatrix(IDENTITY_TRANSFORM);
    expect(result).toBe('matrix(1 0 0 1 0 0)');
  });

  it('formats translate', () => {
    const t = createTransform({ tx: 10.12345, ty: 20.67891 });
    const result = transformToSVGMatrix(t);
    expect(result).toContain('matrix(');
    expect(result).toContain('10.123');
    expect(result).toContain('20.679');
  });

  it('rounds to 3 decimal places', () => {
    const t = { a: 1.123456789, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const result = transformToSVGMatrix(t);
    expect(result).toBe('matrix(1.123 0 0 1 0 0)');
  });
});

describe('decomposeTransform', () => {
  it('decomposes identity', () => {
    const d = decomposeTransform(IDENTITY_TRANSFORM);
    expect(d.tx).toBe(0);
    expect(d.ty).toBe(0);
    expect(d.sx).toBeCloseTo(1);
    expect(d.sy).toBeCloseTo(1);
    expect(d.rotation).toBeCloseTo(0);
  });

  it('decomposes translate', () => {
    const t = createTransform({ tx: 10, ty: 20 });
    const d = decomposeTransform(t);
    expect(d.tx).toBe(10);
    expect(d.ty).toBe(20);
  });

  it('decomposes scale', () => {
    const t = createTransform({ sx: 3, sy: 4 });
    const d = decomposeTransform(t);
    expect(d.sx).toBeCloseTo(3);
    expect(d.sy).toBeCloseTo(4);
  });

  it('decomposes rotation', () => {
    const t = createTransform({ rotation: Math.PI / 4 });
    const d = decomposeTransform(t);
    expect(d.rotation).toBeCloseTo(Math.PI / 4);
    expect(d.sx).toBeCloseTo(1);
    expect(d.sy).toBeCloseTo(1);
  });
});

// ─── Draw Command Tests ──────────────────────────────────────────

describe('createLineCmd', () => {
  it('creates line command', () => {
    const cmd = createLineCmd(0, 0, 100, 100, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('line');
    expect(cmd.x1).toBe(0);
    expect(cmd.y1).toBe(0);
    expect(cmd.x2).toBe(100);
    expect(cmd.y2).toBe(100);
    expect(cmd.style).toBe(DEFAULT_STYLE);
    expect(cmd.transform).toBe(IDENTITY_TRANSFORM);
  });
});

describe('createRectCmd', () => {
  it('creates rect command', () => {
    const cmd = createRectCmd(10, 20, 100, 50, null, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('rect');
    expect(cmd.x).toBe(10);
    expect(cmd.y).toBe(20);
    expect(cmd.w).toBe(100);
    expect(cmd.h).toBe(50);
  });

  it('creates rect with radii', () => {
    const radii = { tl: 5, tr: 5, br: 5, bl: 5 };
    const cmd = createRectCmd(0, 0, 100, 100, radii, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.radii).toEqual(radii);
  });
});

describe('createEllipseCmd', () => {
  it('creates ellipse command', () => {
    const cmd = createEllipseCmd(50, 50, 30, 20, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('ellipse');
    expect(cmd.cx).toBe(50);
    expect(cmd.cy).toBe(50);
    expect(cmd.rx).toBe(30);
    expect(cmd.ry).toBe(20);
  });
});

describe('createArcCmd', () => {
  it('creates arc command', () => {
    const cmd = createArcCmd(50, 50, 30, 30, 0, Math.PI, false, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('arc');
    expect(cmd.start).toBe(0);
    expect(cmd.stop).toBe(Math.PI);
    expect(cmd.ccw).toBe(false);
  });
});

describe('createPathCmd', () => {
  it('creates path command', () => {
    const cmd = createPathCmd('M 0 0 L 100 100 Z', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('path');
    expect(cmd.d).toBe('M 0 0 L 100 100 Z');
  });
});

describe('createTextCmd', () => {
  it('creates text command', () => {
    const cmd = createTextCmd('Hello', 10, 20, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('text');
    expect(cmd.str).toBe('Hello');
    expect(cmd.x).toBe(10);
    expect(cmd.y).toBe(20);
  });
});

describe('createImageCmd', () => {
  it('creates image command', () => {
    const cmd = createImageCmd('img.png', 10, 20, 100, 50, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('image');
    expect(cmd.href).toBe('img.png');
    expect(cmd.w).toBe(100);
    expect(cmd.h).toBe(50);
  });
});

describe('createGroupCmd', () => {
  it('creates group command', () => {
    const child = createPathCmd('M 0 0', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const cmd = createGroupCmd([child], IDENTITY_TRANSFORM);
    expect(cmd.type).toBe('group');
    expect(cmd.children).toHaveLength(1);
    expect(cmd.children[0]).toBe(child);
  });
});

// ─── IR State Tests ──────────────────────────────────────────────

describe('createIRState', () => {
  it('creates empty state', () => {
    const state = createIRState();
    expect(state.commands).toEqual([]);
    expect(state.recording).toBe(true);
    expect(state.transformStack).toHaveLength(1);
  });

  it('has default style', () => {
    const state = createIRState();
    expect(state.currentStyle.fill).toBe('#000000');
    expect(state.currentStyle.strokeWeight).toBe(1);
  });
});

describe('getCurrentTransform', () => {
  it('returns top of stack', () => {
    const state = createIRState();
    expect(getCurrentTransform(state)).toBe(IDENTITY_TRANSFORM);
  });
});

describe('pushTransform / popTransform', () => {
  it('pushes and pops transforms', () => {
    const state = createIRState();
    const t = createTransform({ tx: 10, ty: 20 });
    pushTransform(state, t);
    expect(state.transformStack).toHaveLength(2);

    popTransform(state);
    expect(state.transformStack).toHaveLength(1);
  });

  it('does not pop below 1', () => {
    const state = createIRState();
    popTransform(state);
    expect(state.transformStack).toHaveLength(1);
  });

  it('combines transforms on push', () => {
    const state = createIRState();
    const t1 = createTransform({ tx: 5, ty: 0 });
    const t2 = createTransform({ tx: 0, ty: 10 });
    pushTransform(state, t1);
    pushTransform(state, t2);

    const top = getCurrentTransform(state);
    expect(top.e).toBeCloseTo(5);
    expect(top.f).toBeCloseTo(10);
  });
});

describe('setTransform', () => {
  it('replaces current transform', () => {
    const state = createIRState();
    const t = createTransform({ tx: 99, ty: 99 });
    setTransform(state, t);
    expect(getCurrentTransform(state).e).toBe(99);
  });
});

describe('addCommand', () => {
  it('adds command when recording', () => {
    const state = createIRState();
    const cmd = createPathCmd('M 0 0', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    addCommand(state, cmd);
    expect(state.commands).toHaveLength(1);
    expect(state.commands[0]).toBe(cmd);
  });

  it('does not add when not recording', () => {
    const state = createIRState();
    state.recording = false;
    const cmd = createPathCmd('M 0 0', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    addCommand(state, cmd);
    expect(state.commands).toHaveLength(0);
  });
});

// ─── Color Helpers ───────────────────────────────────────────────

describe('colorToHex', () => {
  it('returns null for null input', () => {
    expect(colorToHex(null)).toBeNull();
  });

  it('returns null for "none"', () => {
    expect(colorToHex('none')).toBeNull();
  });

  it('passes through hex strings', () => {
    expect(colorToHex('#ff0000')).toBe('#ff0000');
  });

  it('parses rgba strings', () => {
    expect(colorToHex('rgba(255,0,0)')).toBe('#ff0000');
  });

  it('parses rgb strings to hex', () => {
    expect(colorToHex('rgb(255,0,0)')).toBe('#ff0000');
  });

  it('parses p5 color objects via toString with hex', () => {
    const c = { toString: () => '#abcdef' };
    expect(colorToHex(c)).toBe('#abcdef');
  });

  it('parses p5 color objects via toString with rgba', () => {
    const c = { toString: () => 'rgba(0,0,255)' };
    expect(colorToHex(c)).toBe('#0000ff');
  });

  it('falls back to #000000 for unknown', () => {
    const c = { toString: () => 'not a color' };
    expect(colorToHex(c)).toBe('#000000');
  });
});

describe('cloneStyle', () => {
  it('returns shallow copy', () => {
    const style = { fill: '#ff0000', stroke: null };
    const cloned = cloneStyle(style);
    expect(cloned).toEqual(style);
    expect(cloned).not.toBe(style);
  });

  it('original not mutated', () => {
    const style = { fill: '#ff0000' };
    const cloned = cloneStyle(style);
    cloned.fill = '#000000';
    expect(style.fill).toBe('#ff0000');
  });
});

// ─── SVG Generation Tests ────────────────────────────────────────

describe('commandsToSVG', () => {
  it('generates valid SVG with no commands', () => {
    const svg = commandsToSVG([], 400, 300);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="300"');
    expect(svg).toContain('viewBox="0 0 400 300"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');
  });

  it('generates path element', () => {
    const cmd = createPathCmd('M 0 0 L 100 100', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('<path d="M 0 0 L 100 100"');
  });

  it('generates rect element', () => {
    const cmd = createRectCmd(10, 20, 100, 50, null, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('<rect');
    expect(svg).toContain('x="10"');
    expect(svg).toContain('y="20"');
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="50"');
  });

  it('generates ellipse element', () => {
    const cmd = createEllipseCmd(50, 50, 30, 20, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('cx="50"');
    expect(svg).toContain('cy="50"');
    expect(svg).toContain('rx="30"');
    expect(svg).toContain('ry="20"');
  });

  it('generates path for arc', () => {
    const cmd = createArcCmd(50, 50, 30, 30, 0, Math.PI, false, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('<path d="M');
    expect(svg).toContain('A');
  });

  it('generates text element', () => {
    const cmd = createTextCmd('Hello', 10, 20, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('<text');
    expect(svg).toContain('Hello');
    expect(svg).toContain('x="10"');
    expect(svg).toContain('y="20"');
  });

  it('escapes XML in text', () => {
    const cmd = createTextCmd('<b>&amp;</b>', 0, 0, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('&lt;b&gt;&amp;amp;&lt;/b&gt;');
  });

  it('generates image element', () => {
    const cmd = createImageCmd('img.png', 10, 20, 100, 50, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('<image');
    expect(svg).toContain('href="img.png"');
  });

  it('generates group with children', () => {
    const child = createPathCmd('M 0 0', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const group = createGroupCmd([child], IDENTITY_TRANSFORM);
    const svg = commandsToSVG([group], 400, 300);
    expect(svg).toContain('<g');
    expect(svg).toContain('</g>');
    expect(svg).toContain('M 0 0');
  });

  it('applies transform attribute', () => {
    const t = createTransform({ tx: 10, ty: 20 });
    const cmd = createPathCmd('M 0 0', DEFAULT_STYLE, t);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('transform="matrix(');
  });

  it('omits transform for identity', () => {
    const cmd = createPathCmd('M 0 0', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).not.toContain('transform=');
  });

  it('applies fill style', () => {
    const style = { ...DEFAULT_STYLE, fill: '#ff0000', stroke: null };
    const cmd = createPathCmd('M 0 0', style, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('fill="#ff0000"');
  });

  it('applies stroke style', () => {
    const style = { ...DEFAULT_STYLE, fill: null, stroke: '#0000ff', strokeWeight: 2 };
    const cmd = createPathCmd('M 0 0', style, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd], 400, 300);
    expect(svg).toContain('stroke="#0000ff"');
    expect(svg).toContain('stroke-width="2"');
  });

  it('generates multiple elements', () => {
    const cmd1 = createPathCmd('M 0 0', DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const cmd2 = createRectCmd(0, 0, 10, 10, null, DEFAULT_STYLE, IDENTITY_TRANSFORM);
    const svg = commandsToSVG([cmd1, cmd2], 400, 300);
    expect(svg).toContain('<path');
    expect(svg).toContain('<rect');
  });

  it('handles full-scene SVG', () => {
    const style = { ...DEFAULT_STYLE, fill: '#ff0000', stroke: '#000000', strokeWeight: 1 };
    const t = createTransform({ tx: 50, ty: 50 });

    const rect = createRectCmd(0, 0, 100, 100, null, style, t);
    const circle = createEllipseCmd(50, 50, 25, 25, style, t);
    const text = createTextCmd('Hi', 10, 10, style, t);

    const svg = commandsToSVG([rect, circle, text], 400, 300);
    expect(svg).toContain('<rect');
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('<text');
    expect(svg).toContain('Hi');
  });
});
