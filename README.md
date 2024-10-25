# af-win-audio

## Описание

`af-win-audio` — это библиотека для мониторинга и управления аудиоустройствами в Windows через Node.js. Библиотека предоставляет API для отслеживания и изменения громкости и статуса отключения звука на системных аудиоустройствах.

## Установка

Установить библиотеку можно через npm:

```bash
npm install af-win-audio
```

Или с помощью Yarn:

```bash
yarn add af-win-audio
```

## Использование

### Инициализация и мониторинг

Для начала мониторинга аудиоустройств создайте экземпляр `AudioDeviceMonitor` с опциональными параметрами:

```typescript
import AudioDeviceMonitor from 'af-win-audio'

const monitor = new AudioDeviceMonitor({
  autoStart: true, // Автоматический запуск мониторинга при создании
  delay: 250, // Задержка между проверками состояния в миллисекундах
  step: 5, // Шаг изменения громкости
})
```

### Подписка на события

Вы можете подписаться на различные события мониторинга, такие как изменение состояния устройства, ошибки, завершение или принудительное завершение процесса.

#### Изменение состояния устройства:

```typescript
monitor.on('change', (deviceInfo, change) => {
  console.log('Информация об устройстве:', deviceInfo)
  console.log('Изменения:', change)
})
```

#### Ошибка:

```typescript
monitor.on('error', message => {
  console.error('Произошла ошибка:', message)
})
```

#### Завершение процесса:

```typescript
monitor.on('exit', code => {
  console.log(`Процесс завершен с кодом: ${code}`)
})
```

#### Принудительное завершение:

```typescript
monitor.on('forceExit', message => {
  console.warn('Принудительное завершение процесса:', message)
})
```

### Управление громкостью

#### Увеличение громкости:

```typescript
monitor.upVolume() // Увеличение громкости на значение шага (по умолчанию 5)
monitor.upVolume(10) // Увеличение громкости на 10 единиц
```

#### Уменьшение громкости:

```typescript
monitor.downVolume() // Уменьшение громкости на значение шага (по умолчанию 5)
monitor.downVolume(10) // Уменьшение громкости на 10 единиц
```

### Остановка мониторинга

Для остановки процесса мониторинга используйте метод `stop`:

```typescript
monitor.stop()
```

Если процесс уже завершен, будет сгенерировано событие ошибки.

## Опции

### AudioMonitorOptions

- `autoStart` (boolean): Автоматически запускать мониторинг при создании экземпляра (по умолчанию `true`).
- `delay` (number): Задержка между проверками состояния устройства в миллисекундах (минимум 100, по умолчанию 250).
- `step` (number): Шаг изменения громкости (по умолчанию 5).

## Интерфейсы

### IDevice

Представляет информацию об аудиоустройстве:

- `id` (string): Уникальный идентификатор устройства.
- `name` (string): Название устройства.
- `volume` (number): Текущий уровень громкости (от 0 до 100).
- `muted` (boolean): Указывает, отключен ли звук на устройстве.

### IChange

Отражает изменения в состоянии устройства:

- `id` (boolean): Изменился ли идентификатор устройства.
- `name` (boolean): Изменилось ли название устройства.
- `volume` (boolean): Изменился ли уровень громкости.
- `muted` (boolean): Изменилось ли состояние отключения звука.

### AudioMonitorEvents

События, которые могут быть обработаны:

- `change`: Срабатывает при изменении состояния устройства.
- `error`: Срабатывает при возникновении ошибки.
- `exit`: Срабатывает при завершении процесса мониторинга.
- `forceExit`: Срабатывает при принудительном завершении процесса.
