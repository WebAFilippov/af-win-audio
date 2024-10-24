#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import select from '@inquirer/select';
import { fileURLToPath } from 'url'; // Импортируем функцию fileURLToPath
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = path.join(__dirname, '..', 'dist', 'bin');

async function promptUser() {
  return await select({
    message: 'Выберите тип установки:',
    choices: [
      {
        name: 'Обычная',
        value: 'Обычная',
        description: 'Установка урезанной af-win-audio.exe',
      },
      {
        name: 'Полная',
        value: 'Полная',
        description: 'Установка полной версии af-win-audio.exe с поддержкой .NET6.0 Runtime',
      },
    ],
  });
}

async function install() {
  const installationType = await promptUser();

  if (installationType === 'Обычная') {
    // Удаляем af-win-audio-extra.exe, если он существует
    const extraFilePath = path.join(outputDir, 'af-win-audio-extra.exe');
    if (fs.existsSync(extraFilePath)) {
      fs.unlinkSync(extraFilePath);
    }
  } else if (installationType === 'Полная') {
    // Переименовываем af-win-audio-extra.exe в af-win-audio.exe
    const extraFilePath = path.join(outputDir, 'af-win-audio-extra.exe');
    const mainFilePath = path.join(outputDir, 'af-win-audio.exe');

    if (fs.existsSync(mainFilePath)) {
      fs.unlinkSync(mainFilePath);
    }

    if (fs.existsSync(extraFilePath)) {
      fs.renameSync(extraFilePath, mainFilePath);
    }
  }
}

if (process.argv[1] === 'af-win-audio' && process.argv[2] === 'init') {
  install().catch((error) => {
    console.error('Ошибка при инициализации:', error);
  });
} else {
  console.log('Неизвестная команда. Используйте "af-win-audio init".');
}
