import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

// Экспорт типов
export type Range<Min extends number, Max extends number, Result extends number[] = []> =
  Result['length'] extends Max
    ? Result[number]
    : Range<Min, Max, [...Result, Result['length']]>;

// Тип для процентов
export type Percentage = Range<1, 101>;

// Опции мониторинга аудио
export interface AudioMonitorOptions {
  delay?: number;
  step?: number;
}

// Интерфейс устройства
export interface IDevice {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
}

// Интерфейс изменений
export interface IChange {
  id: boolean;
  name: boolean;
  volume: boolean;
  muted: boolean;
}

// Интерфейс событий
export interface AudioMonitorEvents {
  change: (deviceInfo: IDevice, change: IChange) => void;
  error: (message: string) => void;
  exit: (code: number) => void;
  forceExit: (message: string) => void;
}

// Кастомная реализация системы событий
class CustomEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }
}

// Класс для мониторинга аудиоустройств
export class AudioDeviceMonitor {
  private audioDeviceProcess: ChildProcess | null = null;
  private exePath = path.join( 'bin', 'af-win-audio.exe');
  private delay: number;
  private stepVolume: number;
  private parsedInfo: IDevice = { id: '', name: '', volume: 0, muted: false };
  private change: IChange = { id: false, name: false, volume: false, muted: false };
  private eventEmitter = new CustomEventEmitter();

  constructor(options?: AudioMonitorOptions) {
    this.delay = options?.delay !== undefined ? Math.max(options.delay, 100) : 250;
    this.stepVolume = options?.step || 5;

    this.start();
  }

  // Метод для регистрации обработчиков событий
  on(event: keyof AudioMonitorEvents, listener: AudioMonitorEvents[keyof AudioMonitorEvents]) {
    this.eventEmitter.on(event, listener);
  }

  private start(): void {
    this.audioDeviceProcess = spawn(this.exePath, [this.delay.toString(), this.stepVolume.toString()]);

    if (this.audioDeviceProcess && this.audioDeviceProcess.stdout) {
      this.audioDeviceProcess.stdout.on('data', (data: Buffer) => {
        try {
          const parsedData = JSON.parse(data.toString());
          this.checkChange(parsedData);
          this.parsedInfo = parsedData;
          this.eventEmitter.emit('change', this.parsedInfo, this.change);
          this.defaultChange();
        } catch (e) {
          this.eventEmitter.emit('error', `Failed to parse data: ${e}`);
        }
      });
    } else {
      this.eventEmitter.emit('error', 'stdout not available.');
    }

    // Обработка ошибок процесса C#
    this.audioDeviceProcess.stderr?.on('data', (data: Buffer): void => {
      this.eventEmitter.emit('error', `C# Error: ${data.toString("utf-8")}`);
    });

    this.audioDeviceProcess.on('close', (code: number): void => {
      this.eventEmitter.emit('exit', code);
    });

    // Обработка завершения основного процесса Node.js
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Terminating child process...');
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM');
      }
      process.exit();
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Terminating child process...');
      if (this.audioDeviceProcess) {
        this.audioDeviceProcess.kill('SIGTERM');
      }
      process.exit();
    });
  }

  public upVolume(step?: Percentage): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.audioDeviceProcess.stdin.write(`upVolume ${step}\n`);
      } else {
        this.audioDeviceProcess.stdin.write('upVolume\n');
      }
    } else {
      this.eventEmitter.emit('error', 'Process not started or stdin not available.');
    }
  }

  public downVolume(step?: Percentage): void {
    if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
      if (step) {
        this.audioDeviceProcess.stdin.write(`downVolume ${step}\n`);
      } else {
        this.audioDeviceProcess.stdin.write('downVolume\n');
      }
    } else {
      this.eventEmitter.emit('error', 'Process not started or stdin not available.');
    }
  }

  public stop(): void {
    if (this.audioDeviceProcess) {
      if (!this.audioDeviceProcess.killed) {
        this.audioDeviceProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!this.audioDeviceProcess?.killed) {
            this.audioDeviceProcess?.kill('SIGKILL');
            this.eventEmitter.emit('forceExit', 'Process forcibly terminated.');
          }
        }, 3000);
      } else {
        this.eventEmitter.emit('error', 'Process already terminated.');
      }
    } else {
      this.eventEmitter.emit('error', 'Process not started.');
    }
  }

  private checkChange(data: IDevice): void {
    for (const key in data) {
      if (data[key as keyof IDevice] !== this.parsedInfo[key as keyof IDevice]) {
        this.change[key as keyof IChange] = true;
      }
    }
  }

  private defaultChange(): void {
    this.change.id = false;
    this.change.name = false;
    this.change.volume = false;
    this.change.muted = false;
  }
}

export default AudioDeviceMonitor;
