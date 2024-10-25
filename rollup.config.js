import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import copy from 'rollup-plugin-copy'
import { execSync } from 'child_process'
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  input: 'src/index.ts', // Входной файл
  output: [
    {
      file: 'dist/index.cjs.js', // CommonJS файл
      format: 'cjs',
    },
    {
      file: 'dist/index.esm.js', // ESModule файл
      format: 'es',
    },
  ],
  plugins: [
    visualizer({ filename: 'stats.html' }),
    resolve(), // Обработчик для разрешения модулей
    commonjs(), // Обработка CommonJS модулей
    typescript({
      tsconfig: './tsconfig.json', // Использование твоего tsconfig
      declaration: true,
      declarationDir: './dist', // Типы внутри папки dist
      rootDir: './src', // Сохранение структуры исходников
    }),
    copy({
      targets: [{ src: 'bin/af-win-audio.exe', dest: 'dist/bin/' }],
      verbose: true,
    }),
    {
      name: 'generate-types',
      buildEnd: () => {
        // Генерация деклараций типов через tsc
        execSync('npx tsc --emitDeclarationOnly')
      },
    },
    terser({
      output: {
        comments: true, // Сохранить комментарии
      },
    }),
  ],
  treeshake: true,
  external: ['node:child_process', 'node:path'],
}
