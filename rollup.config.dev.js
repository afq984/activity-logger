import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import html from '@web/rollup-plugin-html';
import summary from 'rollup-plugin-summary';

export default {
  plugins: [
    html({input: 'index.html'}),
    typescript({tsconfig: 'tsconfig.json', outDir: null}),
    resolve(),
    summary(),
  ],
  output: {
    dir: 'out/dev',
    sourcemap: true,
  },
};
