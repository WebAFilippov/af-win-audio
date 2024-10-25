import { ChildProcess, spawn } from 'node:child_process'
import path from 'node:path'

/**
 * Опции мониторинга аудио устройств.
 * @property {boolean} [autoStart=true] - Автоматический запуск мониторинга при инициализации.
 * @property {number} [delay=250] - Задержка между проверками состояния устройства (в миллисекундах).
 * @property {number} [step=5] - Шаг изменения громкости.
 */
export interface AudioMonitorOptions {
  autoStart?: boolean
  logger?: boolean
  delay?: number
  step?: number
}

interface UpdateOptions {
  delay?: number // Задержка между проверками
  step?: number // Шаг изменения громкости
}

/**
 * Представление аудио устройства.
 * @property {string} id - Уникальный идентификатор устройства.
 * @property {string} name - Название устройства.
 * @property {number} volume - Текущий уровень громкости (от 0 до 100).
 * @property {boolean} muted - Указывает, отключен ли звук на устройстве.
 */
export interface IDevice {
  id: string
  name: string
  volume: number
  muted: boolean
}

/**
 * Изменения состояния аудио устройства.
 * @property {boolean} id - Изменился ли идентификатор устройства.
 * @property {boolean} name - Изменилось ли название устройства.
 * @property {boolean} volume - Изменился ли уровень громкости.
 * @property {boolean} muted - Изменилось ли состояние отключения звука.
 */
export interface IChange {
  id: boolean
  name: boolean
  volume: boolean
  muted: boolean
}

/**
 * События аудио мониторинга.
 * @property {(deviceInfo: IDevice, change: IChange) => void} change - Событие, срабатывающее при изменении состояния устройства.
 * @property {(message: string) => void} alert - Событие оповещения.
 * @property {(message: string) => void} error - Событие ошибки при работе с устройством.
 * @property {(message: string) => void} exit - Событие завершения процесса мониторинга.
 * @property {(message: string) => void} forceExit - Событие принудительного завершения процесса мониторинга.
 *
 */
export interface AudioMonitorEvents {
  change: (deviceInfo: IDevice, change: IChange) => void
  alert: (message: string) => void
  error: (message: string) => void
  exit: (message: string) => void
  forceExit: (message: string) => void
}

/**
 * Реализация событийного механизма для аудио мониторинга.
 */
class CustomEventEmitter {
  private listeners: {
    [K in keyof AudioMonitorEvents]?: AudioMonitorEvents[K][]
  } = {}

  /**
   * Регистрирует слушателя для определенного события.
   * @param {keyof AudioMonitorEvents} event - Название события.
   * @param {AudioMonitorEvents[keyof AudioMonitorEvents]} listener - Обработчик события.
   */
  on<K extends keyof AudioMonitorEvents>(event: K, listener: AudioMonitorEvents[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(listener)
  }

  /**
   * Вызывает все обработчики для заданного события.
   * @param {object} param - Параметры события, включающие название и аргументы.
   */
  emit({
    event,
    args,
  }: {
    [K in keyof AudioMonitorEvents]: {
      event: K
      args: Parameters<AudioMonitorEvents[K]>
    }
  }[keyof AudioMonitorEvents]) {
    if (event === 'change') {
      const listeners = this.listeners.change || []
      listeners.forEach(listener => listener(...args))
    }
    if (event === 'alert') {
      const listeners = this.listeners.alert || []
      listeners.forEach(listener => listener(...args))
    }
    if (event === 'error') {
      const listeners = this.listeners.error || []
      listeners.forEach(listener => listener(...args))
    }
    if (event === 'exit') {
      const listeners = this.listeners.exit || []
      listeners.forEach(listener => listener(...args))
    }
    if (event === 'forceExit') {
      const listeners = this.listeners.forceExit || []
      listeners.forEach(listener => listener(...args))
    }
  }
}

/**
 * Класс для мониторинга состояния аудиоустройств в системе.
 */
class AudioDeviceMonitor {
  private audioDeviceProcess: ChildProcess | null = null
  private exePath: string = ''
  private deviceInfo: IDevice = { id: '', name: '', volume: 0, muted: false }
  private deviceChange: IChange = {
    id: false,
    name: false,
    volume: false,
    muted: false,
  }
  private eventEmitter = new CustomEventEmitter()
  // options
  private autoStart: boolean
  private logger: boolean
  private delay: number
  private step: number

  /**
   * Создает экземпляр аудио монитора.
   * @param {AudioMonitorOptions} [options] - Настройки для мониторинга.
   */
  constructor(options?: AudioMonitorOptions) {
    this.autoStart = options?.autoStart ?? true
    this.logger = options?.logger ?? true
    this.delay = options?.delay !== undefined ? Math.max(options.delay, 100) : 250
    this.step = options?.step || 5

    if (this.autoStart) {
      this.start()
    }
  }

  /**
   * Регистрирует обработчик для указанного события мониторинга.
   * В зависимости от типа события, обработчик принимает разные параметры.
   *
   * @param {keyof AudioMonitorEvents} event - Название события для регистрации обработчика.
   * Допустимые значения: 'change', 'error', 'exit', 'forceExit'.
   * @param {AudioMonitorEvents[keyof AudioMonitorEvents]} listener - Функция-обработчик для указанного события.
   * - Для события 'change': (deviceInfo: IDevice, change: IChange) => void
   * - Для события 'alert': (message: string) => void
   * - Для события 'error': (message: string) => void
   * - Для события 'exit': (message: number) => void
   * - Для события 'forceExit': (message: string) => void
   */
  on(event: 'change', listener: (deviceInfo: IDevice, change: IChange) => void): void
  on(event: 'alert', listener: (message: string) => void): void
  on(event: 'error', listener: (message: string) => void): void
  on(event: 'exit', listener: (message: string) => void): void
  on(event: 'forceExit', listener: (message: string) => void): void
  on(
    event: keyof AudioMonitorEvents,
    listener: AudioMonitorEvents[keyof AudioMonitorEvents]
  ): void {
    this.eventEmitter.on(event, listener)
  }

  /**
   * Запускает процесс мониторинга аудиоустройств.
   */
  public start(): void {
    if (this.audioDeviceProcess) {
      this.printMessage('error', 'Процесс уже запущен.')
      return
    }

    if (process.env.DEV === 'true') {
      this.exePath = path.join('bin', 'af-win-audio.exe')
    } else {
      this.exePath = path.join(__dirname, 'bin', 'af-win-audio.exe')
    }
    // Запуск процесса
    this.audioDeviceProcess = spawn(this.exePath, [this.delay.toString(), this.step.toString()])

    // Обработка ошибок при запуске процесса
    this.audioDeviceProcess.on('error', err => {
      this.printMessage('error', `Не удалось запустить процесс: ${err.message}`)
    })

    // Обработка данных из stdout процесса
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdout) {
      this.audioDeviceProcess.stdout.on('data', (data: Buffer) => {
        try {
          const deviceInfo = JSON.parse(data.toString())
          this.checkChange(deviceInfo)
          this.deviceInfo = deviceInfo
          this.eventEmitter.emit({
            event: 'change',
            args: [this.deviceInfo, this.deviceChange],
          })
          this.defaultChange()
        } catch (e) {
          this.printMessage('error', `Не удалось обработать данные: ${e}`)
        }
      })
    } else {
      this.printMessage('error', 'Стандартный вывод процесса недоступен.')
    }

    // Обработка ошибок процесса
    this.audioDeviceProcess.stderr?.on('data', (data: Buffer): void => {
      this.printMessage('error', `C# Ошибка: ${data.toString('utf-8')}`)
    })

    this.audioDeviceProcess.on('close', (code: number | null): void => {
      let exitMessage: string
      if (code === 0 || code === null) {
        exitMessage = 'Процесс успешно завершился.'
      } else if (code === 1) {
        exitMessage = `Процесс не смог завершиться корректно: ${code} code`
      } else {
        exitMessage = `Ошибка код: ${code}`
      }
      this.printMessage('exit', exitMessage)
    })

    // Обработка завершения основного процесса Node.js
    process.on('SIGINT', () => {
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGINT')
      }
      setTimeout(() => process.exit(), 1000) // Небольшая задержка перед завершением
    })

    process.on('SIGTERM', () => {
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM')
      }
      setTimeout(() => process.exit(), 1000) // Небольшая задержка перед завершением
    })
  }

  /**
   * Увеличивает громкость устройства.
   * @param {number} [step] - Шаг увеличения громкости. Если не указан, используется шаг по умолчанию.
   */
  public upVolume(step?: number): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.printMessage('alert', `Увеличить громкость на ${step}.`)
        this.audioDeviceProcess.stdin.write(`upVolume ${step}\n`)
      } else {
        this.printMessage('alert', 'Увеличить громкость.')
        this.audioDeviceProcess.stdin.write('upVolume\n')
      }
    } else {
      this.printMessage('error', 'Процесс не запущен или стандартный ввод недоступен.')
    }
  }

  /**
   * Уменьшает громкость устройства.
   * @param {number} [step] - Шаг уменьшения громкости. Если не указан, используется шаг по умолчанию.
   */
  public downVolume(step?: number): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.printMessage('alert', `Уменьшить громкость на ${step}.`)
        this.audioDeviceProcess.stdin.write(`downVolume ${step}\n`)
      } else {
        this.printMessage('alert', 'Уменьшить громкость.')
        this.audioDeviceProcess.stdin.write('downVolume\n')
      }
    } else {
      this.printMessage('error', 'Процесс не запущен или стандартный ввод недоступен.')
    }
  }

  /**
   * Останавливает процесс мониторинга.
   * Если процесс уже завершен, генерируется событие ошибки.
   */
  public stop(): void {
    if (this.audioDeviceProcess) {
      if (!this.audioDeviceProcess.killed) {
        this.audioDeviceProcess.kill('SIGTERM')
        setTimeout(() => {
          if (this.audioDeviceProcess?.killed === false) {
            this.audioDeviceProcess?.kill('SIGKILL')
            this.printMessage('forceExit', 'Процесс был принудительно завершён.')
          }
        }, 3000)
      } else {
        this.printMessage('error', 'Процесс уже завершён.')
      }
      this.audioDeviceProcess = null
    } else {
      this.printMessage('error', 'Нет процесса для остановки.')
    }
  }

  public updateSettings(options: UpdateOptions): void {
    options.delay && this.setDelay(options.delay)
    if (options.step !== undefined) {
      this.setStepVolume(options.step)
    }
  }

  // Метод для изменения задержки
  private setDelay(newDelay: number): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (newDelay >= 100) {
        this.delay = newDelay
        this.printMessage('alert', `Задержка обновлена в ${this.delay} мс.`)
        this.audioDeviceProcess.stdin.write(`setDelay ${this.delay}\n`)
      } else {
        this.printMessage('error', 'Задержка должна быть не менее 100 мс.')
      }
    } else {
      this.printMessage('error', 'Процесс не запущен или стандартный ввод недоступен.')
    }
  }

  // Метод для изменения шага громкости
  private setStepVolume(newStep: number): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (newStep > 0 && newStep <= 100) {
        this.step = newStep
        this.printMessage('alert', `Шаг громкости обновлён до ${this.step}.`)
        this.audioDeviceProcess.stdin.write(`setStepVolume ${this.step}\n`)
      } else {
        this.printMessage('error', 'Шаг громкости должен быть больше в диапозоне от 1 до 100.')
      }
    } else {
      this.printMessage('error', 'Процесс не запущен или стандартный ввод недоступен.')
    }
  }

  /**
   * Проверяет, изменилось ли состояние устройства.
   * @param {IDevice} newDeviceInfo - Новая информация о состоянии устройства.
   */
  private checkChange(newDeviceInfo: IDevice): void {
    for (const key in newDeviceInfo) {
      if (newDeviceInfo[key as keyof IDevice] !== this.deviceInfo[key as keyof IDevice]) {
        this.deviceChange[key as keyof IChange] = true
        this.printMessage(
          'alert',
          `${newDeviceInfo[key as keyof IDevice]} изменилось - ${this.deviceChange[key as keyof IChange]}`
        )
      }
    }
  }

  /**
   * Сбрасывает изменения состояния после их обработки.
   */
  private defaultChange(): void {
    this.deviceChange = { id: false, name: false, volume: false, muted: false }
  }

  private log(event: keyof AudioMonitorEvents, ...msg: string[]): void {
    if (this.logger) {
      event === 'change' && console.log('change:: ', ...msg)
      event === 'alert' && console.log('info:: ', ...msg)
      event === 'error' && console.log('error:: ', ...msg)
      event === 'exit' && console.log('exit:: ', ...msg)
      event === 'forceExit' && console.log('forceExit:: ', ...msg)
    }
  }

  private printMessage(event: any, message: string) {
    this.log(event, message)
    this.eventEmitter.emit({
      event: event,
      args: [message],
    })
  }
}

export default AudioDeviceMonitor
