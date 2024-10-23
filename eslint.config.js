import eslintPluginPrettier from 'eslint-plugin-prettier';
import typescriptParser from '@typescript-eslint/parser';
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'], // Игнорируем папки
  },
  {
    files: ['**/*.ts', '**/*.tsx'], // Указываем, что ESLint будет работать с TypeScript файлами
    languageOptions: {
      parser: typescriptParser, // Указываем парсер для работы с TypeScript
      ecmaVersion: 'latest', // Поддержка последней версии ECMAScript
      sourceType: 'module', // Указываем поддержку модулей (ESM)
      globals: {
        // Определяем глобальные переменные для Node.js
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTypescript, // Плагин для TypeScript
      prettier: eslintPluginPrettier, // Плагин Prettier
    },
    rules: {
      'prettier/prettier': 'error', // Ошибка, если код не отформатирован по Prettier
      '@typescript-eslint/no-unused-vars': ['warn'], // Предупреждение о неиспользуемых переменных в TS
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Не требовать явного указания типов на границах модулей
      semi: ['error', 'always'], // Требование точки с запятой
      quotes: ['error', 'single'], // Одинарные кавычки для строк
      'no-console': 'off', // Отключаем правило, запрещающее console.log
      indent: ['error', 2], // Отступы в 2 пробела
    },
  },
];
