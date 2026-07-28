import { describe, it, expect, vi, beforeEach } from 'vitest';
import p5SVGImport from './p5.svg-import.js';

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
  const p5Mock = { registerAddon: vi.fn() };
  p5SVGImport(p5Mock, fn);
  return { fn, p5Mock };
}

describe('getSVGShapes', () => {
  let fn;

  beforeEach(() => {
    ({ fn } = setupImport());
  });

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

  it('parses an ellipse element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', '50');
    ellipse.setAttribute('cy', '50');
    ellipse.setAttribute('rx', '30');
    ellipse.setAttribute('ry', '20');
    svg.appendChild(ellipse);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('ellipse');
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

  it('parses a line element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '100');
    line.setAttribute('y2', '100');
    svg.appendChild(line);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('line');
  });

  it('parses a polygon element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0,0 100,0 100,100 0,100');
    svg.appendChild(polygon);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('polygon');
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

  it('assigns id and class to shapes', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '10');
    rect.setAttribute('height', '10');
    rect.setAttribute('id', 'myRect');
    rect.setAttribute('class', 'shape');
    svg.appendChild(rect);

    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].id).toBe('myRect');
    expect(shapes[0].className).toBe('shape');
  });
});

describe('parseSVG', () => {
  let fn;

  beforeEach(() => {
    ({ fn } = setupImport());
  });

  it('parses a simple SVG string', () => {
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="10" y="10" width="50" height="50"/></svg>';
    const shapes = fn.parseSVG(svgString);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('rect');
  });

  it('throws on invalid SVG', () => {
    expect(() => fn.parseSVG('not an svg')).toThrow('Invalid SVG');
  });

  it('throws on SVG with no root element', () => {
    expect(() => fn.parseSVG('<xml></xml>')).toThrow('no <svg> element');
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
      vertices: [
        { x: 0, y: 0, type: 'M' },
        { x: 10, y: 0, type: 'L' },
        { x: 10, y: 10, type: 'L' },
        { x: 0, y: 10, type: 'L' },
        { x: 0, y: 0, type: 'Z' }
      ],
      style: { fill: '#ff0000', stroke: null, strokeWidth: '1' },
      transform: [1, 0, 0, 1, 50, 50]
    }];

    fn.drawSVG.call(p, shapes);
    expect(p.push).toHaveBeenCalled();
    expect(p.translate).toHaveBeenCalledWith(50, 50);
    expect(p.pop).toHaveBeenCalled();
  });

  it('draws text shapes', () => {
    const p = createMockP5();
    const shapes = [{
      type: 'text',
      text: 'Hello',
      x: 10,
      y: 20,
      style: { fill: '#000000', fontSize: '16' },
      transform: null
    }];

    fn.drawSVG.call(p, shapes);
    expect(p.textSize).toHaveBeenCalledWith(16);
    expect(p.text).toHaveBeenCalledWith('Hello', 10, 20);
  });
});

describe('svgToPaths', () => {
  let fn;

  beforeEach(() => {
    ({ fn } = setupImport());
  });

  it('converts SVG string to path data', () => {
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path d="M 0 0 L 100 100"/></svg>';
    const paths = fn.svgToPaths(svgString);
    expect(paths).toHaveLength(1);
    expect(paths[0].type).toBe('path');
    expect(paths[0].vertices).toBeDefined();
  });
});

describe('transform parsing', () => {
  let fn;

  beforeEach(() => {
    ({ fn } = setupImport());
  });

  it('parses rotate(90) correctly', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'rotate(90)');
    svg.appendChild(g);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].transform[0]).toBeCloseTo(0, 5);
    expect(shapes[0].transform[1]).toBeCloseTo(1, 5);
    expect(shapes[0].transform[2]).toBeCloseTo(-1, 5);
    expect(shapes[0].transform[3]).toBeCloseTo(0, 5);
  });

  it('parses rotate(90, 50, 50) with center point', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'rotate(90, 50, 50)');
    svg.appendChild(g);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].transform[0]).toBeCloseTo(0, 5);
    expect(shapes[0].transform[1]).toBeCloseTo(1, 5);
  });

  it('parses translate()', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'translate(10, 20)');
    svg.appendChild(g);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].transform[4]).toBe(10);
    expect(shapes[0].transform[5]).toBe(20);
  });

  it('parses scale()', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'scale(2, 3)');
    svg.appendChild(g);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].transform[0]).toBe(2);
    expect(shapes[0].transform[3]).toBe(3);
  });
});

describe('style parsing', () => {
  let fn;

  beforeEach(() => {
    ({ fn } = setupImport());
  });

  it('parses fill-opacity and stroke-opacity', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('fill-opacity', '0.5');
    rect.setAttribute('stroke-opacity', '0.8');
    svg.appendChild(rect);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].style.fillOpacity).toBe('0.5');
    expect(shapes[0].style.strokeOpacity).toBe('0.8');
  });

  it('converts fill=none to null', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('fill', 'none');
    svg.appendChild(rect);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].style.fill).toBeNull();
  });

  it('converts stroke=none to null', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('stroke', 'none');
    svg.appendChild(rect);
    const shapes = fn.getSVGShapes(svg);
    expect(shapes[0].style.stroke).toBeNull();
  });
});