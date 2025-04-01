const esbuild = require('rollup-plugin-esbuild');
const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: 'src/index.ts',
  external: ['mobx'],
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    esbuild.default({
      target: 'es2018',
      minify: true,
    }),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
}; 