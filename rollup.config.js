import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
// import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
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
    resolve(), // Обработчик для разрешения модулей
    commonjs(), // Обработка CommonJS модулей
    // typescript({
    //   tsconfig: 'tsconfig.json', // Убедитесь, что у вас есть tsconfig.json с нужными настройками
    //   useTsconfigDeclarationDir: true, // Генерировать декларации типов в указанной директории
    // }),
    typescript({
      tsconfig: './tsconfig.json',  // Использование твоего tsconfig
      declaration: true,
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
    },
    // terser() // Минификация
  ],
  external: [
    'node:child_process', 
    'node:events',
    'node:path',
  ],  
};
