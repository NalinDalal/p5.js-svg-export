declare module 'p5' {
  interface p5 {
    saveSVG(filename?: string): void;
    getSVG(): string;
    startSVGRecord(): void;
    stopSVGRecord(): void;
    getIR(): IRState | null;
  }
}

export interface IRState {
  commands: DrawCommand[];
  currentStyle: StyleState;
  transformStack: Transform[];
  recording: boolean;
}

export interface StyleState {
  fill: string | null;
  stroke: string | null;
  strokeWeight: number;
  strokeCap: CanvasLineCap;
  strokeJoin: CanvasLineJoin;
  opacity: number;
  font: string;
  fontSize: number;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export type DrawCommand =
  | LineCmd
  | RectCmd
  | EllipseCmd
  | ArcCmd
  | PathCmd
  | TextCmd
  | ImageCmd
  | GroupCmd;

export interface LineCmd {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  style: StyleState;
  transform: Transform;
}

export interface RectCmd {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  radii?: { tl: number; tr: number; br: number; bl: number };
  style: StyleState;
  transform: Transform;
}

export interface EllipseCmd {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  style: StyleState;
  transform: Transform;
}

export interface ArcCmd {
  type: 'arc';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  start: number;
  stop: number;
  ccw: boolean;
  style: StyleState;
  transform: Transform;
}

export interface PathCmd {
  type: 'path';
  d: string;
  style: StyleState;
  transform: Transform;
}

export interface TextCmd {
  type: 'text';
  str: string;
  x: number;
  y: number;
  style: StyleState;
  transform: Transform;
}

export interface ImageCmd {
  type: 'image';
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  style: StyleState;
  transform: Transform;
}

export interface GroupCmd {
  type: 'group';
  children: DrawCommand[];
  transform: Transform;
  style: StyleState;
}

export function colorToHex(c: string | object | null): string | null;
export function normalizeRadii(radii: number | number[] | { tl?: number; tr?: number; br?: number; bl?: number } | null): { tl: number; tr: number; br: number; bl: number } | null;
export function multiplyTransform(t1: Transform, t2: Transform): Transform;
export function createTransform(opts?: { tx?: number; ty?: number; rotation?: number; sx?: number; sy?: number }): Transform;
export function transformToSVGMatrix(t: Transform): string;
export function decomposeTransform(t: Transform): { tx: number; ty: number; sx: number; sy: number; rotation: number };
export function createIRState(): IRState;
export function getCurrentTransform(state: IRState): Transform;
export function pushTransform(state: IRState, transform: Transform): void;
export function popTransform(state: IRState): void;
export function setTransform(state: IRState, transform: Transform): void;
export function addCommand(state: IRState, cmd: DrawCommand): void;
export function createLineCmd(x1: number, y1: number, x2: number, y2: number, style: StyleState, transform: Transform): LineCmd;
export function createRectCmd(x: number, y: number, w: number, h: number, radii: unknown, style: StyleState, transform: Transform): RectCmd;
export function createEllipseCmd(cx: number, cy: number, rx: number, ry: number, style: StyleState, transform: Transform): EllipseCmd;
export function createArcCmd(cx: number, cy: number, rx: number, ry: number, start: number, stop: number, ccw: boolean, style: StyleState, transform: Transform): ArcCmd;
export function createPathCmd(d: string, style: StyleState, transform: Transform): PathCmd;
export function createTextCmd(str: string, x: number, y: number, style: StyleState, transform: Transform): TextCmd;
export function createImageCmd(href: string, x: number, y: number, w: number, h: number, style: StyleState, transform: Transform): ImageCmd;
export function createGroupCmd(children: DrawCommand[], transform: Transform): GroupCmd;
export function commandsToSVG(commands: DrawCommand[], width: number, height: number): string;
export function cloneStyle(style: StyleState): StyleState;
export const DEFAULT_STYLE: StyleState;
export const IDENTITY_TRANSFORM: Transform;