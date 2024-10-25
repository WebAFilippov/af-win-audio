import { ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import path from 'node:path'

// Экспорт типов
export type Range<
  Min extends number,
  Max extends number,
  Result extends number[] = [],
> = Result['length'] extends Max ? Result[number] : Range<Min, Max, [...Result, Result['length']]>

// Тип для процентов
export type Percentage = Range<1, 101>

// Опции мониторинга аудио
export interface AudioMonitorOptions {
  delay?: number
  step?: number
}

// Интерфейс устройства
export interface IDevice {
  id: string
  name: string
  volume: number
  muted: boolean
}

// Интерфейс изменений
export interface IChange {
  id: boolean
  name: boolean
  volume: boolean
  muted: boolean
}

// Интерфейс событий
export interface AudioMonitorEvents {
  change: (deviceInfo: IDevice, change: IChange) => void
  error: (message: string) => void
  exit: (code: number) => void
  forceExit: (message: string) => void
}

export class AudioDeviceMonitor extends EventEmitter {
  // Определение процесса
  private audioDeviceProcess: ChildProcess | null = null
  private exePath = path.join(__dirname, 'bin', 'af-win-audio.exe')
  // Аргументы инициализации
  private delay: number
  private stepVolume: number
  // Парсинг информации
  private parsedInfo: IDevice = { id: '', name: '', volume: 0, muted: false }
  private change: IChange = {
    id: false,
    name: false,
    volume: false,
    muted: false,
  }

  constructor(options?: AudioMonitorOptions) {
    super()

    this.delay = options?.delay !== undefined ? Math.max(options.delay, 100) : 250
    this.stepVolume = options?.step || 5

    this.start()
  }

  private start(): void {
    this.audioDeviceProcess = spawn(this.exePath, [
      this.delay.toString(),
      this.stepVolume.toString(),
    ])

    if (this.audioDeviceProcess && this.audioDeviceProcess.stdout) {
      this.audioDeviceProcess.stdout.on('data', (data: Buffer) => {
        try {
          const parsedData = JSON.parse(data.toString())
          this.checkChange(parsedData) // Проверка изменения
          this.parsedInfo = parsedData
          this.emit('change', this.parsedInfo as IDevice, this.change as IChange)
          this.defaultChange()
        } catch (e) {
          this.emit('error', `Failed to parse data: ${e}`)
        }
      })
    } else {
      this.emit('error', 'stdout not available.')
    }

    // Обработка ошибок процесса C#
    this.audioDeviceProcess.stderr?.on('data', (data: Buffer): void => {
      this.emit('error', `C# Error: ${data.toString('utf-8')}`)
    })

    this.audioDeviceProcess.on('close', (code: number): void => {
      this.emit('exit', code)
    })

    // Обработка завершения основного процесса Node.js
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Terminating child process...')
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM') // Отправка SIGTERM дочернему процессу
      }
      process.exit() // Завершение основного процесса
    })

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Terminating child process...')
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM') // Отправка SIGTERM дочернему процессу
      }
      process.exit() // Завершение основного процесса
    })
  }

  public upVolume(step?: Percentage): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.audioDeviceProcess.stdin.write(`upVolume ${step}\n`)
      } else {
        this.audioDeviceProcess.stdin.write('upVolume\n')
      }
    } else {
      this.emit('error', 'Process not started or stdin not available.')
    }
  }

  public downVolume(step?: Percentage): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.audioDeviceProcess.stdin.write(`downVolume ${step}\n`)
      } else {
        this.audioDeviceProcess.stdin.write('downVolume\n')
      }
    } else {
      this.emit('error', 'Process not started or stdin not available.')
    }
  }

  public stop(): void {
    if (this.audioDeviceProcess) {
      if (!this.audioDeviceProcess.killed) {
        this.audioDeviceProcess.kill('SIGTERM')
        setTimeout(() => {
          if (!this.audioDeviceProcess?.killed) {
            this.audioDeviceProcess?.kill('SIGKILL')
            this.emit('forceExit', 'Process forcibly terminated.')
          }
        }, 3000)
      } else {
        this.emit('error', 'Process already terminated.')
      }
    } else {
      this.emit('error', 'Process not started.')
    }
  }

  private checkChange(data: IDevice): void {
    for (const key in data) {
      if (data[key as keyof IDevice] !== this.parsedInfo[key as keyof IDevice]) {
        this.change[key as keyof IChange] = true
      }
    }
  }

  private defaultChange(): void {
    this.change.id = false
    this.change.name = false
    this.change.volume = false
    this.change.muted = false
  }

  // Переопределяем метод on для типизации
  public override on<K extends keyof AudioMonitorEvents>(
    event: K,
    listener: AudioMonitorEvents[K]
  ): this {
    return super.on(event, listener)
  }
}

export default AudioDeviceMonitor
