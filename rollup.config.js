import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'default',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    terser(),
    copy({
      targets: [
        { src: 'bin/af-win-audio.exe', dest: 'dist/bin' },
      ],
    }),
  ],
  external: ['child_process', 'events', 'path', 'fs', 'winston', 'pkg-dir'],
};
