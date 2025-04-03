const esbuild = require('rollup-plugin-esbuild');
const typescript = require('@rollup/plugin-typescript');

// Determine if we are in production mode
const isProduction = process.env.NODE_ENV === 'production';

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
    typescript({
      tsconfig: './tsconfig.json',
    }),
    esbuild.default({
      target: 'es2018',
      minify: isProduction,
      sourcemap: true,
    }),
  ],
}; 