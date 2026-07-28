declare module 'p5' {
  interface p5 {
    parseSVG(svgString: string): SVGShape[];
    getSVGShapes(svgElement: SVGSVGElement): SVGShape[];
    drawSVG(shapes: SVGShape[]): void;
    loadSVG(url: string): Promise<SVGShape[]>;
    svgToPaths(svgString: string): SVGPath[];
  }
}

export interface SVGShape {
  type: 'path' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polyline' | 'polygon' | 'text';
  vertices?: SVGVertex[];
  text?: string;
  x: number;
  y: number;
  style: SVGStyle;
  transform: number[] | null;
  id: string | null;
  className: string | null;
}

export interface SVGVertex {
  x: number;
  y: number;
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

export interface SVGStyle {
  fill: string | null;
  stroke: string | null;
  strokeWidth: string | null;
  opacity: string | null;
  fillOpacity: string | null;
  strokeOpacity: string | null;
  font?: string;
  fontSize?: string;
}

export interface SVGPath {
  type: string;
  vertices: SVGVertex[];
  style: SVGStyle;
}