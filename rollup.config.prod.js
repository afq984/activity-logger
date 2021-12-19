import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import html from '@web/rollup-plugin-html';
import summary from 'rollup-plugin-summary';
import {terser} from 'rollup-plugin-terser';

export default {
  plugins: [
    html({input: 'index.html'}),
    typescript({tsconfig: 'tsconfig.json', outDir: null}),
    resolve(),
    terser({
      module: true,
      warnings: true,
    }),
    summary(),
  ],
  output: {
    dir: 'out/prod',
    sourcemap: true,
  },
};
