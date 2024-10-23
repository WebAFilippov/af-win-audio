import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

/**
 * Опции мониторинга аудио устройств.
 * @property {boolean} [autoStart=true] - Автоматический запуск мониторинга при инициализации.
 * @property {number} [delay=250] - Задержка между проверками состояния устройства (в миллисекундах).
 * @property {number} [step=5] - Шаг изменения громкости.
 */
export interface AudioMonitorOptions {
  autoStart?: boolean;
  delay?: number;
  step?: number;
}

/**
 * Представление аудио устройства.
 * @property {string} id - Уникальный идентификатор устройства.
 * @property {string} name - Название устройства.
 * @property {number} volume - Текущий уровень громкости (от 0 до 100).
 * @property {boolean} muted - Указывает, отключен ли звук на устройстве.
 */
export interface IDevice {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
}

/**
 * Изменения состояния аудио устройства.
 * @property {boolean} id - Изменился ли идентификатор устройства.
 * @property {boolean} name - Изменилось ли название устройства.
 * @property {boolean} volume - Изменился ли уровень громкости.
 * @property {boolean} muted - Изменилось ли состояние отключения звука.
 */
export interface IChange {
  id: boolean;
  name: boolean;
  volume: boolean;
  muted: boolean;
}

/**
 * События аудио мониторинга.
 * @property {(deviceInfo: IDevice, change: IChange) => void} change - Событие, срабатывающее при изменении состояния устройства.
 * @property {(message: string) => void} error - Событие ошибки при работе с устройством.
 * @property {(code: number) => void} exit - Событие завершения процесса мониторинга.
 * @property {(message: string) => void} forceExit - Событие принудительного завершения процесса мониторинга.
 */
export interface AudioMonitorEvents {
  change: (deviceInfo: IDevice, change: IChange) => void;
  error: (message: string) => void;
  exit: (code: number) => void;
  forceExit: (message: string) => void;
}

/**
 * Реализация событийного механизма для аудио мониторинга.
 */
class CustomEventEmitter {
  private listeners: {
    [K in keyof AudioMonitorEvents]?: AudioMonitorEvents[K][];
  } = {};

  /**
   * Регистрирует слушателя для определенного события.
   * @param {keyof AudioMonitorEvents} event - Название события.
   * @param {AudioMonitorEvents[keyof AudioMonitorEvents]} listener - Обработчик события.
   */
  on<K extends keyof AudioMonitorEvents>(event: K, listener: AudioMonitorEvents[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
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
      event: K;
      args: Parameters<AudioMonitorEvents[K]>;
    };
  }[keyof AudioMonitorEvents]) {
    if (event === 'change') {
      const listeners = this.listeners.change || [];
      listeners.forEach((listener) => listener(...args));
    }
    if (event === 'error') {
      const listeners = this.listeners.error || [];
      listeners.forEach((listener) => listener(...args));
    }
    if (event === 'exit') {
      const listeners = this.listeners.exit || [];
      listeners.forEach((listener) => listener(...args));
    }
    if (event === 'forceExit') {
      const listeners = this.listeners.forceExit || [];
      listeners.forEach((listener) => listener(...args));
    }
  }
}

/**
 * Класс для мониторинга состояния аудиоустройств в системе.
 */
class AudioDeviceMonitor {
  private audioDeviceProcess: ChildProcess | null = null;
  private exePath: string = '';
  private autoStart: boolean;
  private delay: number;
  private stepVolume: number;
  private parsedInfo: IDevice = { id: '', name: '', volume: 0, muted: false };
  private change: IChange = {
    id: false,
    name: false,
    volume: false,
    muted: false,
  };
  private eventEmitter = new CustomEventEmitter();

  /**
   * Создает экземпляр аудио монитора.
   * @param {AudioMonitorOptions} [options] - Настройки для мониторинга.
   */
  constructor(options?: AudioMonitorOptions) {
    this.autoStart = options?.autoStart ?? true;
    this.delay = options?.delay !== undefined ? Math.max(options.delay, 100) : 250;
    this.stepVolume = options?.step || 5;

    if (this.autoStart) {
      this.start();
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
   * - Для события 'error': (message: string) => void
   * - Для события 'exit': (code: number) => void
   * - Для события 'forceExit': (message: string) => void
   */
  on(event: 'change', listener: (deviceInfo: IDevice, change: IChange) => void): void;
  on(event: 'error', listener: (message: string) => void): void;
  on(event: 'exit', listener: (code: number) => void): void;
  on(event: 'forceExit', listener: (message: string) => void): void;
  on(
    event: keyof AudioMonitorEvents,
    listener: AudioMonitorEvents[keyof AudioMonitorEvents]
  ): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Запускает процесс мониторинга аудиоустройств.
   */
  public start(): void {
    if (this.audioDeviceProcess) {
      this.eventEmitter.emit({
        event: 'error',
        args: ['Process is already running.\n'],
      });
      return;
    }

    if (process.env.DEV === 'true') {
      this.exePath = path.join('bin', 'af-win-audio.exe');
    } else {
      this.exePath = path.join(__dirname, 'bin', 'af-win-audio.exe');
    }
    // Запуск процесса
    this.audioDeviceProcess = spawn(this.exePath, [
      this.delay.toString(),
      this.stepVolume.toString(),
    ]);

    // Обработка ошибок при запуске процесса
    this.audioDeviceProcess.on('error', (err) => {
      this.eventEmitter.emit({
        event: 'error',
        args: [`Failed to start process: ${err.message}`],
      });
    });

    // Обработка данных из stdout процесса
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdout) {
      this.audioDeviceProcess.stdout.on('data', (data: Buffer) => {
        try {
          const parsedData = JSON.parse(data.toString());
          this.checkChange(parsedData);
          this.parsedInfo = parsedData;
          this.eventEmitter.emit({
            event: 'change',
            args: [this.parsedInfo, this.change],
          });
          this.defaultChange();
        } catch (e) {
          this.eventEmitter.emit({
            event: 'error',
            args: [`Failed to parse data: ${e}`],
          });
        }
      });
    } else {
      this.eventEmitter.emit({
        event: 'error',
        args: ['Process stdout not available.'],
      });
    }

    // Обработка ошибок процесса
    this.audioDeviceProcess.stderr?.on('data', (data: Buffer): void => {
      this.eventEmitter.emit({
        event: 'error',
        args: [`C# Error: ${data.toString('utf-8')}`],
      });
    });

    this.audioDeviceProcess.on('close', (code: number): void => {
      this.eventEmitter.emit({
        event: 'exit',
        args: [code],
      });
    });

    // Обработка завершения основного процесса Node.js
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Terminating child process...');
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM');
      }
      setTimeout(() => process.exit(), 1000); // Небольшая задержка перед завершением
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Terminating child process...');
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM');
      }
      setTimeout(() => process.exit(), 1000); // Небольшая задержка перед завершением
    });
  }

  /**
   * Увеличивает громкость устройства.
   * @param {number} [step] - Шаг увеличения громкости. Если не указан, используется шаг по умолчанию.
   */
  public upVolume(step?: number): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.audioDeviceProcess.stdin.write(`upVolume ${step}\n`);
      } else {
        this.audioDeviceProcess.stdin.write('upVolume\n');
      }
    } else {
      this.eventEmitter.emit({
        event: 'error',
        args: ['Process not started or stdin not available.'],
      });
    }
  }

  /**
   * Уменьшает громкость устройства.
   * @param {number} [step] - Шаг уменьшения громкости. Если не указан, используется шаг по умолчанию.
   */
  public downVolume(step?: number): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.audioDeviceProcess.stdin.write(`downVolume ${step}\n`);
      } else {
        this.audioDeviceProcess.stdin.write('downVolume\n');
      }
    } else {
      this.eventEmitter.emit({
        event: 'error',
        args: ['Process not started or stdin not available.'],
      });
    }
  }

  /**
   * Останавливает процесс мониторинга.
   * Если процесс уже завершен, генерируется событие ошибки.
   */
  public stop(): void {
    if (this.audioDeviceProcess) {
      if (!this.audioDeviceProcess.killed) {
        this.audioDeviceProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!this.audioDeviceProcess?.killed) {
            this.audioDeviceProcess?.kill('SIGKILL');
            this.eventEmitter.emit({
              event: 'forceExit',
              args: ['Process forcibly terminated.'],
            });
          }
        }, 3000);
      } else {
        this.eventEmitter.emit({
          event: 'error',
          args: ['Process already terminated.'],
        });
      }
      this.audioDeviceProcess = null;
    } else {
      this.eventEmitter.emit({
        event: 'error',
        args: ['No process to stop.'],
      });
    }
  }

  /**
   * Проверяет, изменилось ли состояние устройства.
   * @param {IDevice} newDeviceInfo - Новая информация о состоянии устройства.
   */
  private checkChange(newDeviceInfo: IDevice): void {
    for (const key in newDeviceInfo) {
      if (newDeviceInfo[key as keyof IDevice] !== this.parsedInfo[key as keyof IDevice]) {
        this.change[key as keyof IChange] = true;
      }
    }
  }

  /**
   * Сбрасывает изменения состояния после их обработки.
   */
  private defaultChange(): void {
    this.change = { id: false, name: false, volume: false, muted: false };
  }
}

export default AudioDeviceMonitor;
