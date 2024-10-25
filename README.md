# Описание

`af-win-audio` — это библиотека для мониторинга и управления аудиоустройствами в Windows через Node.js. Библиотека предоставляет API для отслеживания и изменения громкости и статуса отключения звука на системных аудиоустройствах.

# Установка

Установить библиотеку можно через npm:

```bash
npm install af-win-audio
```

Или с помощью Yarn:

```bash
yarn add af-win-audio
```

# Использование

Импортируйте `AudioDeviceMonitor` и создайте экземпляр класса с необходимыми опциями:

```typescript
import AudioDeviceMonitor, { AudioMonitorOptions } from 'af-win-audio'

const options: AudioMonitorOptions = {
  autoStart: true, // Автоматически запускает мониторинг при инициализации
  logger: true, // Включает или отключает логирование событий
  delay: 250, // Задержка между проверками состояния устройства (в миллисекундах)
  step: 5, // Шаг изменения громкости
}

const audioMonitor = new AudioDeviceMonitor(options)
```

## Опции мониторинга аудио устройств

- `autoStart`: (boolean, по умолчанию `true`) Автоматически запускает мониторинг при инициализации.
- `logger`: (boolean, по умолчанию `true`) Включает или отключает логирование событий. Полезно для отладки и мониторинга.
- `delay`: (number, по умолчанию 250) Задержка между проверками состояния устройства в миллисекундах.
- `step`: (number, по умолчанию 5) Шаг изменения громкости.

## События

`change`
Срабатывает при изменении состояния устройства. Передает информацию о устройстве и изменениях.

```typescript
audioMonitor.on('change', (deviceInfo, change) => {
  console.log('Устройство изменилось:', deviceInfo, change)
})
```

`alert`
Событие оповещения. Передает сообщение.

```typescript
audioMonitor.on('alert', message => {
  console.log('Оповещение:', message)
})
```

`command`
Событие отправки команды. Передает сообщение о выполненной команде.

```typescript
audioMonitor.on('command', message => {
  console.log('Команда:', message)
})
```

`error`
Событие ошибки. Передает сообщение об ошибке.

```typescript
audioMonitor.on('error', message => {
  console.error('Ошибка:', message)
})
```

`exit`
Событие завершения процесса мониторинга. Передает сообщение о завершении.

```typescript
audioMonitor.on('exit', message => {
  console.log('Завершение:', message)
})
```

`forceExit`
Событие завершения процесса мониторинга. Передает сообщение о завершении.

```typescript
audioMonitor.on('forceExit', message => {
  console.warn('Принудительное завершение:', message)
})
```

## Методы

`start()`
Запускает процесс мониторинга аудиоустройств.

`stop()`
Останавливает процесс мониторинга. Если процесс уже завершен, генерируется событие ошибки.

`upVolume(step?: number)`
Увеличивает громкость устройства. Принимает шаг увеличения громкости. Если не указан, используется шаг по умолчанию.

`downVolume(step?: number)`
Уменьшает громкость устройства. Принимает шаг уменьшения громкости. Если не указан, используется шаг по умолчанию.

`mute()`
Заглушает звук на устройстве.

`unmute()`
Восстанавливает звук на устройстве.

`toggleMute()`
Переключает состояние звука на устройстве.

`updateSettings(options: UpdateOptions)`
Обновляет настройки мониторинга. Принимает объект с изменениями.

```typescript
audioMonitor.updateSettings({ delay: 300, step: 10 })
```

## Пример

```typescript
import AudioDeviceMonitor from 'af-win-audio'

const audioMonitor = new AudioDeviceMonitor({ autoStart: true, logger: true })

audioMonitor.on('change', (deviceInfo, change) => {
  console.log('Изменение состояния устройства:', deviceInfo, change)
})

audioMonitor.on('error', message => {
  console.error('Ошибка мониторинга:', message)
})
```

## Лицензия

Этот проект лицензирован под MIT License. См. файл [LICENSE](LICENSE) для получения дополнительной информации.
