import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { execSync } from 'child_process';

export default {
  input: 'src/index.ts',  // Входной файл
  output: [
    {
      file: 'dist/index.cjs.js',  // CommonJS файл
      format: 'cjs',
    },
    {
      file: 'dist/index.esm.js',  // ESModule файл
      format: 'es',
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',  // Использование твоего tsconfig
      declaration: true,  // Генерация типов
      declarationDir: './dist',  // Типы внутри папки dist
      rootDir: './src'  // Сохранение структуры исходников
    }),
    copy({
      targets: [
        { src: 'bin/af-win-audio.exe', dest: 'dist/bin' },
        { src: 'bin/af-win-audio-extra.exe', dest: 'dist/bin' }  // Копирование exe файла
      ]
    }),
    {
      name: 'generate-types',
      buildEnd: () => {
        // Генерация деклараций типов через tsc
        execSync('npx tsc --emitDeclarationOnly');
      }
    }
  ],
  external: []  // Здесь можно указать внешние зависимости, которые не нужно бандлить
};
