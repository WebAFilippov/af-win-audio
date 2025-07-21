import { spawn, type ChildProcess } from 'child_process'
import EventEmitter from 'events'
import path from 'path'
import fs from 'fs'
import { createLogger, format, transports } from 'winston'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface AudioMonitorOptions {
  autoStart: boolean
  logger: boolean
  execPath?: string
}

interface AudioDevice {
  id: string
  name: string
  dataFlow: string
  isDefault: boolean
  volume: number
  isMuted: boolean
  channels: number
  bitDepth: number
  sampleRate: number
}

interface ActionDevice {
  id: string
  name?: string
  dataFlow?: string
  isDefault?: boolean
  volume?: number
  isMuted?: boolean
  channels?: number
  bitDepth?: number
  sampleRate?: number
}

interface AudioAction {
  type: 'initial' | 'add' | 'remove' | 'default' | 'volume'
  device?: ActionDevice
}

interface AudioEventData {
  action: AudioAction
  devices: AudioDevice[]
}

// Добавляем типы для событий
interface AudioMonitorEvents {
  listen: (data: AudioEventData) => void
  error: (error: string) => void
}

/**
 * Монитор аудио устройств Windows
 * @class
 * @extends EventEmitter
 * @fires AudioMonitor#listen - Срабатывает при получении данных об аудио устройствах
 * @fires AudioMonitor#error - Срабатывает при возникновении ошибки
 */
class AudioMonitor extends EventEmitter {
  private execPath: string | null = null
  private process: ChildProcess | null = null
  private options: AudioMonitorOptions
  private logger: any

  constructor(options: Partial<AudioMonitorOptions> = {}) {
    super()

    // Устанавливаем значения по умолчанию для опций
    const { autoStart = true, logger = false, execPath } = options

    this.options = { autoStart, logger, execPath }

    // Инициализация логгера
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
      ),
      transports: [new transports.Console({ silent: !this.options.logger })],
    })

    // Установка пути к исполняемому файлу
    if (this.options.execPath) {
      this.execPath = this.options.execPath
    } else {
      // Получение корневого пути пакета
      this.execPath = path.join(__dirname, 'bin', 'af-win-audio.exe')
    }

    if (!fs.existsSync(this.execPath)) {
      this.logError(`Исполняемый файл не найден: ${this.execPath}`)
      throw new Error(`Исполняемый файл не найден: ${this.execPath}`)
    }
    if (this.options.autoStart) {
      this.start()
    }
  }

  private logInfo(message: string, data?: any) {
    if (this.options.logger) {
      const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message
      this.logger.info(fullMessage)
    }
  }

  private logError(message: string, error?: any) {
    if (this.options.logger) {
      const fullMessage = error ? `${message} ${JSON.stringify(error)}` : message
      this.logger.error(fullMessage)
    }
    this.emit('error', message)
  }

  // Добавляем перегрузку для emit
  emit<K extends keyof AudioMonitorEvents>(
    event: K,
    ...args: Parameters<AudioMonitorEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  // Добавляем перегрузку для on
  on<K extends keyof AudioMonitorEvents>(event: K, listener: AudioMonitorEvents[K]): this {
    return super.on(event, listener)
  }

  public start() {
    if (this.process) {
      this.logInfo('Процесс уже запущен')
      return
    }

    if (!this.execPath) {
      this.logError('Путь к исполняемому файлу не задан')
      return
    }

    try {
      this.process = spawn(this.execPath)
      this.logInfo(`Запущен процесс: ${this.execPath}`)

      // Обработка stdout
      if (this.process && this.process.stdout) {
        this.process.stdout.on('data', (dataBuffer: Buffer) => {
          try {
            const data = JSON.parse(dataBuffer.toString('utf-8'))
            this.logInfo('Получены данные:', data)
            this.emit('listen', {
              action: data.action,
              devices: data.devices,
            })
          } catch (error) {
            this.logError('Ошибка парсинга JSON:', error)
          }
        })
      }

      // Обработка stderr
      if (this.process && this.process.stderr) {
        this.process.stderr.on('data', (data: Buffer) => {
          this.logError('Ошибка процесса:', data.toString())
        })
      }

      // Обработка закрытия процесса
      this.process.on('close', code => {
        this.logInfo(`Процесс завершился с кодом ${code}`)
        if (code !== 0) {
          this.logError(`Процесс завершился с кодом ${code}`)
        }
        this.process = null
      })
    } catch (error) {
      this.logError('Ошибка запуска процесса:', error)
    }
  }

  public stop() {
    if (!this.process) {
      this.logInfo('Процесс не запущен')
      return
    }
    this.process.kill()
    this.process = null
    this.logInfo('Процесс остановлен')
  }

  /**
   * Устанавливает общую громкость системы
   * @param volume Уровень громкости (0-100)
   * @throws {Error} Если громкость вне допустимого диапазона
   */
  public setVolume(volume: number): void {
    this.validateVolume(volume)
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`setvolume ${volume}\n`)
    this.logInfo(`Установлена общая громкость: ${volume}`)
  }

  /**
   * Устанавливает громкость для указанного устройства
   * @param deviceId ID устройства
   * @param volume Уровень громкости (0-100)
   * @throws {Error} Если громкость вне допустимого диапазона или ID устройства пустое
   */
  public setVolumeById(deviceId: string, volume: number): void {
    this.validateDeviceId(deviceId)
    this.validateVolume(volume)
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`setvolumeid ${deviceId} ${volume}\n`)
    this.logInfo(`Установлена громкость для устройства ${deviceId}: ${volume}`)
  }

  /**
   * Устанавливает шаг изменения громкости
   * @param value Значение шага (положительное число)
   * @throws {Error} Если значение отрицательное или не является числом
   */
  public setStepVolume(value: number): void {
    if (typeof value !== 'number' || value <= 0) {
      throw new Error('Значение шага должно быть положительным числом')
    }
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`setstepvolume ${value}\n`)
    this.logInfo(`Установлен шаг изменения громкости: ${value}`)
  }

  public incrementVolume() {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write('upvolume\n')
    this.logInfo('Увеличена общая громкость')
  }

  public decrementVolume() {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write('downvolume\n')
    this.logInfo('Уменьшена общая громкость')
  }

  /**
   * Увеличивает громкость указанного устройства
   * @param deviceId ID устройства
   * @throws {Error} Если ID устройства пустое
   */
  public incrementVolumeById(deviceId: string): void {
    this.validateDeviceId(deviceId)
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`upvolumeid ${deviceId}\n`)
    this.logInfo(`Увеличена громкость для устройства ${deviceId}`)
  }

  /**
   * Уменьшает громкость указанного устройства
   * @param deviceId ID устройства
   * @throws {Error} Если ID устройства пустое
   */
  public decrementVolumeById(deviceId: string): void {
    this.validateDeviceId(deviceId)
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`downvolumeid ${deviceId}\n`)
    this.logInfo(`Уменьшена громкость для устройства ${deviceId}`)
  }

  public setMute() {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write('setmute\n')
    this.logInfo('Звук отключен')
  }

  public setMuteById(deviceId: string) {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`setmuteid ${deviceId}\n`)
    this.logInfo(`Звук отключен для устройства ${deviceId}`)
  }

  public setUnMute() {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write('setunmute\n')
    this.logInfo('Звук включен')
  }

  public setUnMuteById(deviceId: string) {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`setunmuteid ${deviceId}\n`)
    this.logInfo(`Звук включен для устройства ${deviceId}`)
  }

  public toggleMuted() {
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write('togglemute\n')
    this.logInfo('Переключено состояние звука')
  }

  /**
   * Включает/выключает звук для указанного устройства
   * @param deviceId ID устройства
   * @throws {Error} Если ID устройства пустое
   */
  public toggleMutedById(deviceId: string): void {
    this.validateDeviceId(deviceId)
    if (!this.process || !this.process.stdin) {
      this.logError('Процесс не запущен или stdin не доступен')
      return
    }
    this.process.stdin.write(`togglemuteid ${deviceId}\n`)
    this.logInfo(`Переключено состояние звука для устройства ${deviceId}`)
  }

  private validateDeviceId(deviceId: string): void {
    if (!deviceId?.trim()) {
      throw new Error('ID устройства не может быть пустым')
    }
  }

  private validateVolume(volume: number): void {
    if (typeof volume !== 'number') {
      throw new Error('Громкость должна быть числом')
    }
    if (volume < 0 || volume > 100) {
      throw new Error('Громкость должна быть в диапазоне 0-100')
    }
  }
}

export default AudioMonitor
