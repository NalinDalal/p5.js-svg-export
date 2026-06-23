import { describe, it, expect, vi, beforeEach } from 'vitest';
import p5SVG from './p5.svg.js';

function createMockContext() {
  const calls = [];
  const ctx = {
    moveTo: vi.fn((...args) => calls.push(['moveTo', ...args])),
    lineTo: vi.fn((...args) => calls.push(['lineTo', ...args])),
    bezierCurveTo: vi.fn((...args) => calls.push(['bezierCurveTo', ...args])),
    quadraticCurveTo: vi.fn((...args) => calls.push(['quadraticCurveTo', ...args])),
    arc: vi.fn((...args) => calls.push(['arc', ...args])),
    ellipse: vi.fn((...args) => calls.push(['ellipse', ...args])),
    rect: vi.fn((...args) => calls.push(['rect', ...args])),
    closePath: vi.fn((...args) => calls.push(['closePath', ...args])),
    fillText: vi.fn((...args) => calls.push(['fillText', ...args])),
    strokeText: vi.fn((...args) => calls.push(['strokeText', ...args])),
    drawImage: vi.fn((...args) => calls.push(['drawImage', ...args])),
    save: vi.fn((...args) => calls.push(['save', ...args])),
    restore: vi.fn((...args) => calls.push(['restore', ...args])),
    setTransform: vi.fn((...args) => calls.push(['setTransform', ...args])),
    transform: vi.fn((...args) => calls.push(['transform', ...args])),
    beginPath: vi.fn((...args) => calls.push(['beginPath', ...args])),
    fill: vi.fn((...args) => calls.push(['fill', ...args])),
    stroke: vi.fn((...args) => calls.push(['stroke', ...args])),
    clip: vi.fn((...args) => calls.push(['clip', ...args])),
    _calls: calls
  };
  return ctx;
}

function createMockP5(ctx, overrides = {}) {
  const p5 = {
    width: 400,
    height: 300,
    _curElement: {
      elt: {
        getContext: vi.fn(() => ctx)
      }
    },
    _renderer: {
      states: {
        fillColor: '#000000',
        strokeColor: null,
        strokeWeight: 1,
        strokeCap: 'butt',
        strokeJoin: 'miter',
        textFont: { family: 'sans-serif' },
        textSize: 12,
        textAlign: 'start',
        textBaseline: 'alphabetic',
        ...overrides
      }
    },
    registerAddon: vi.fn()
  };
  return p5;
}

function setupAddon(p5, ctx) {
  const fn = {};
  const lifecycles = {};
  p5SVG(p5, fn, lifecycles);
  return { fn, lifecycles, ctx };
}

// ─── Lifecycle Tests ─────────────────────────────────────────────

describe('p5SVG addon', () => {
  let ctx, p5, fn, lifecycles;

  beforeEach(() => {
    ctx = createMockContext();
    p5 = createMockP5(ctx);
    ({ fn, lifecycles } = setupAddon(p5, ctx));
  });

  describe('postsetup', () => {
    it('wraps the canvas context', () => {
      lifecycles.postsetup();
      expect(p5._curElement.elt.getContext).toHaveBeenCalledWith('2d');
    });

    it('initializes IR state', () => {
      lifecycles.postsetup();
      const ir = fn.getIR();
      expect(ir).not.toBeNull();
      expect(ir.commands).toEqual([]);
      expect(ir.recording).toBe(true);
    });
  });

  describe('postdraw', () => {
    it('clears commands and syncs style', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      const ir = fn.getIR();
      expect(ir.commands).toEqual([]);
    });
  });

  describe('startSVGRecord / stopSVGRecord', () => {
    it('toggles recording', () => {
      lifecycles.postsetup();
      fn.stopSVGRecord();
      expect(fn.getIR().recording).toBe(false);
      fn.startSVGRecord();
      expect(fn.getIR().recording).toBe(true);
    });
  });

  describe('getIR', () => {
    it('returns null before setup', () => {
      const freshP5 = createMockP5(ctx);
      const freshFn = {};
      const freshLifecycles = {};
      p5SVG(freshP5, freshFn, freshLifecycles);
      expect(freshFn.getIR()).toBeNull();
    });

    it('returns IR state after setup', () => {
      lifecycles.postsetup();
      expect(fn.getIR()).not.toBeNull();
    });
  });

  describe('getSVG', () => {
    it('returns empty SVG with no draw calls', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      const svg = fn.getSVG();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('captures line commands', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 100);
      ctx.beginPath();
      ctx.stroke();

      const svg = fn.getSVG();
      expect(svg).toContain('M');
      expect(svg).toContain('L');
    });

    it('captures rect commands', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.rect(10, 20, 100, 50);
      ctx.beginPath();
      ctx.fill();

      const svg = fn.getSVG();
      expect(svg).toContain('M');
      expect(svg).toContain('h');
      expect(svg).toContain('v');
    });

    it('captures ellipse commands', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.beginPath();
      ctx.ellipse(50, 50, 30, 20, 0, Math.PI * 2, false);
      ctx.fill();

      const svg = fn.getSVG();
      expect(svg).toContain('A');
    });

    it('captures text commands', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.fillText('Hello', 10, 20);

      const svg = fn.getSVG();
      expect(svg).toContain('<text');
      expect(svg).toContain('Hello');
    });

    it('captures strokeText commands', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.strokeText('World', 30, 40);

      const svg = fn.getSVG();
      expect(svg).toContain('<text');
      expect(svg).toContain('World');
    });

    it('captures image commands', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      const img = { src: 'test.png', currentSrc: 'test.png' };
      ctx.drawImage(img, 10, 20, 100, 50);

      const svg = fn.getSVG();
      expect(svg).toContain('<image');
      expect(svg).toContain('test.png');
    });

    it('captures save/restore transform stack', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      const ir = fn.getIR();
      expect(ir.transformStack).toHaveLength(1);
      ctx.save();
      expect(ir.transformStack).toHaveLength(2);
      ctx.restore();
      expect(ir.transformStack).toHaveLength(1);
    });

    it('captures setTransform', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.setTransform(2, 0, 0, 2, 10, 20);

      const ir = fn.getIR();
      const t = ir.transformStack[ir.transformStack.length - 1];
      expect(t.e).toBeCloseTo(10);
      expect(t.f).toBeCloseTo(20);
      expect(t.a).toBeCloseTo(2);
      expect(t.d).toBeCloseTo(2);
    });

    it('captures transform (multiply)', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.transform(2, 0, 0, 2, 10, 20);

      const ir = fn.getIR();
      const t = ir.transformStack[ir.transformStack.length - 1];
      expect(t.e).toBeCloseTo(10);
      expect(t.f).toBeCloseTo(20);
      expect(t.a).toBeCloseTo(2);
      expect(t.d).toBeCloseTo(2);
    });

    it('captures bezierCurveTo', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(10, 20, 30, 40, 50, 60);
      ctx.beginPath();
      ctx.fill();

      const svg = fn.getSVG();
      expect(svg).toContain('C');
    });

    it('captures quadraticCurveTo', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, 20, 30, 40);
      ctx.beginPath();
      ctx.fill();

      const svg = fn.getSVG();
      expect(svg).toContain('Q');
    });

    it('captures closePath', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(100, 100);
      ctx.closePath();
      ctx.beginPath();
      ctx.fill();

      const svg = fn.getSVG();
      expect(svg).toContain('Z');
    });
  });

  describe('style syncing', () => {
    it('syncs fill color from p5 state', () => {
      p5._renderer.states.fillColor = '#ff0000';
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.fillText('Test', 0, 0);

      const svg = fn.getSVG();
      expect(svg).toContain('fill="#ff0000"');
    });

    it('syncs stroke color from p5 state', () => {
      p5._renderer.states.fillColor = null;
      p5._renderer.states.strokeColor = '#00ff00';
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 100);
      ctx.beginPath();
      ctx.stroke();

      const svg = fn.getSVG();
      expect(svg).toContain('stroke="#00ff00"');
    });

    it('syncs stroke weight', () => {
      p5._renderer.states.strokeColor = '#000000';
      p5._renderer.states.strokeWeight = 3;
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 100);
      ctx.beginPath();
      ctx.stroke();

      const svg = fn.getSVG();
      expect(svg).toContain('stroke-width="3"');
    });

    it('syncs text properties', () => {
      p5._renderer.states.textFont = { family: 'Arial' };
      p5._renderer.states.textSize = 24;
      lifecycles.postsetup();
      lifecycles.postdraw();
      ctx.fillText('Font test', 0, 0);

      const svg = fn.getSVG();
      expect(svg).toContain('font-family="Arial"');
      expect(svg).toContain('font-size="24"');
    });
  });

  describe('saveSVG', () => {
    it('creates blob and triggers download', () => {
      lifecycles.postsetup();
      lifecycles.postdraw();

      const mockClick = vi.fn();
      const mockA = {
        set href(v) {},
        set download(v) {},
        click: mockClick
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockA);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      fn.saveSVG('test.svg');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });
});
