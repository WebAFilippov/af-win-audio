# AFWinAudio

`AFWinAudio` — это библиотека для мониторинга аудио устройств в Windows. Она предоставляет удобный интерфейс для работы с аудио устройствами, их настройкой и обработкой событий.

## Установка

Убедитесь, что у вас установлен Node.js и менеджер пакетов `bun` или `npm`. Затем выполните следующую команду:

```bash
bun install af-win-audio
```

Или с использованием npm:

```bash
npm install af-win-audio
```

## Подготовка

Для работы библиотеки необходим исполняемый файл `af-win-audio.exe`, который должен находиться в папке `bin` вашего проекта. Если файл отсутствует, вы можете указать путь к нему в настройках.

## Использование

### Импорт библиотеки

```javascript
import AudioMonitor from 'af-win-audio';
```

### Пример использования

```javascript
const monitor = new AudioMonitor({
  autoStart: true,
  logger: true,
});

monitor.on('listen', (data) => {
  console.log('Получены данные:', data);
});

monitor.on('error', (error) => {
  console.error('Произошла ошибка:', error);
});

// Установить громкость системы
monitor.setVolume(50);

// Остановить мониторинг
monitor.stop();
```

## Опции конструктора

| Опция       | Тип      | Описание                                  | Значение по умолчанию |
|-------------|----------|-------------------------------------------|-----------------------|
| `autoStart` | `boolean` | Автоматический запуск мониторинга        | `true`                |
| `logger`    | `boolean` | Логирование событий                      | `false`               |
| `execPath`  | `string`  | Путь к исполняемому файлу                | `bin/af-win-audio.exe`|

## Методы

### `start()`

Запускает мониторинг аудио устройств.

```javascript
monitor.start();
```

### `stop()`

Останавливает мониторинг аудио устройств.

```javascript
monitor.stop();
```

### `setVolume(volume: number)`

Устанавливает общую громкость системы.

- `volume` — Уровень громкости (0-100).

```javascript
monitor.setVolume(70);
```

### `setVolumeById(deviceId: string, volume: number)`

Устанавливает громкость для указанного устройства.

- `deviceId` — ID устройства.
- `volume` — Уровень громкости (0-100).

```javascript
monitor.setVolumeById('device123', 50);
```

### `incrementVolume()` и `decrementVolume()`

Увеличивает или уменьшает общую громкость системы.

```javascript
monitor.incrementVolume();
monitor.decrementVolume();
```

### `setMute()` и `setUnMute()`

Отключает или включает звук.

```javascript
monitor.setMute();
monitor.setUnMute();
```

### `toggleMuted()`

Переключает состояние звука (включен/выключен).

```javascript
monitor.toggleMuted();
```

### `setStepVolume(value: number)`

Устанавливает шаг изменения громкости.

- `value` — Значение шага (положительное число).

```javascript
monitor.setStepVolume(5);
```

## События

| Событие      | Описание                                   |
|--------------|-------------------------------------------|
| `listen`     | Срабатывает при получении данных об устройствах. |
| `error`      | Срабатывает при возникновении ошибки.      |

### Пример обработки событий

```javascript
monitor.on('listen', (data) => {
  console.log('Данные об устройствах:', data);
});

monitor.on('error', (error) => {
  console.error('Ошибка:', error);
});
```

## Лицензия

Данный проект распространяется под лицензией MIT. Подробности смотрите в файле [LICENSE](LICENSE).

