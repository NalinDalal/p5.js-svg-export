import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/p5.svg.js',
  output: [
    {
      file: 'dist/p5.svg.js',
      format: 'iife',
      name: 'p5SVGBundle',
      globals: {
        p5: 'p5'
      }
    },
    {
      file: 'dist/p5.svg.esm.js',
      format: 'esm'
    }
  ],
  external: ['p5'],
  plugins: [
    resolve(),
    terser()
  ]
};