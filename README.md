# p5.js SVG Export

A p5.js addon that provides SVG export by intercepting Canvas 2D API calls and converting them to SVG.

Built as part of the effort to add first-class SVG support to p5.js ([#4630](https://github.com/processing/p5.js/issues/4630)).

## Templates

| Template | Description | Status |
|----------|-------------|--------|
| `svg-export` | SVG export (`saveSVG()`, `getSVG()`, `startSVGRecord()`, `stopSVGRecord()`) | Working |
| `svg-import` | SVG import (`loadSVG()`, `parseSVG()`, `drawSVG()`) | In progress |

## SVG Export API

### `saveSVG(filename)`
Downloads the current frame as an SVG file. Default filename is `sketch.svg`.

```js
function draw() {
  rect(50, 50, 100, 100);
  saveSVG('output.svg'); // called inside draw()
}
```

### `getSVG()`
Returns the current frame as an SVG string.

```js
function draw() {
  rect(50, 50, 100, 100);
  let svg = getSVG();
  console.log(svg);
}
```

### `startSVGRecord()` / `stopSVGRecord()`
Start and stop recording. Between calls, commands are accumulated in the IR.

```js
function setup() {
  startSVGRecord();
  // draw stuff...
  let svg = getSVG();
  stopSVGRecord();
}
```

Calling `startSVGRecord()` clears any previously recorded commands.

## How it works

The addon wraps the canvas 2D context's drawing methods (`moveTo`, `lineTo`, `rect`, `arc`, `ellipse`, `fillText`, etc.) and captures them into an Intermediate Representation (IR) — a flat array of typed draw commands with resolved styles and transforms. The IR is then serialized to SVG.

Transforms are preserved as SVG `transform="matrix(...)"` attributes rather than being pre-applied to coordinates, which keeps the output clean and the path data readable.

## Development

```bash
cd templates/svg-export
npm install
npm test        # run tests
npm run build   # build dist/
npm run dev     # watch mode
```

## License

MIT
