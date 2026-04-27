# p5.js Addon Templates

This project provides templates for starting your own p5.js addon for extending the functionalities of p5.js.

## Templates Included
- **svg-export** - SVG export addon (`saveSVG()`, `getSVG()`)
- **svg-import** - SVG import addon (`loadSVG()`, `parseSVG()`, `drawSVG()`)

## Usage (for template development)
To use one of the templates for your own addon, run `npm create p5.js-addon` then follow the provided prompts.

You should replace the various references to the addon name within this project to the name of your addon:

* `src/main.js` - Rename `addonTemplate`
* `rollup.config.js` - Rename `addonTemplate`
* `package.json` - Rename `addonTemplate` and `p5.js-addon-template`
* `examples/` - Populate with your own examples

After that you can continue to write relevant code for your addon using `src/main.js` as the entry point. You may add additional files or NPM dependencies as necessary.

[Rollup](https://rollupjs.org/) has been setup to build the addon into the `dist` folder as both IIFE format to be used with browser script tags and ESM format to be imported by other JavaScript files and publishing on NPM.

For more documentation on how to write addon libraries, please checkout the relevant documentation [here](https://beta.p5js.org/contribute/creating_libraries/)

-------

From the GitHub issue [#4630](https://github.com/processing/p5.js/issues/4630), the request is for native SVG support in p5.js (first class support for SVG imports and exports).
Let's understand the full scope:
1. SVG Export - `saveSVG()` - already exists in the template
2. SVG Import - `loadSVG()` - doesn't exist yet


the main missing piece for "first class" SVG support would be:
1. `loadSVG()` function to load external SVG files
2. Possibly improvements to `saveSVG()` for better export

Add SVG import (`loadSVG`); create an SVG import addon that provides a `loadSVG()` function. This function should:
1. Fetch an SVG file
2. Parse the SVG XML
3. Convert SVG paths/shapes to p5.js compatible rendering


Functions:
- `loadSVG(url)` - Load SVG from URL asynchronously
- `parseSVG(svgString)` - Parse SVG string to p5.js shapes
- `getSVGShapes(svgElement)` - Convert SVG DOM element to shapes
- `drawSVG(shapes)` - Draw loaded shapes to canvas
- `svgToPaths(svgString)` - Convert SVG to path data
**Supported elements


- Polish the add-on structure using npm create p5.js-addon (just boilerplate cleanup)
- Actually use it; make some sketches, try plotter-style exports, try importing SVGs and manipulating them; discover pain points, API gaps, what works well
- Break things intentionally — find edge cases, weird SVG attributes, things that don't map cleanly to p5.js primitives
- Report back on the issue with what you found
