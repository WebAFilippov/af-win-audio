import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

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
  private listeners: { [K in keyof AudioMonitorEvents]?: AudioMonitorEvents[K][] } = {};

  on<K extends keyof AudioMonitorEvents>(event: K, listener: AudioMonitorEvents[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  emit({ event, args }: { [K in keyof AudioMonitorEvents]: { event: K, args: Parameters<AudioMonitorEvents[K]> } }[keyof AudioMonitorEvents]) {
    if (event === 'change') {
      const listeners = this.listeners.change || []
      listeners.forEach((listener) => listener(...args))
    }
    if (event === 'error') {
      const listeners = this.listeners.error || []
      listeners.forEach((listener) => listener(...args))
    }
    if (event === 'exit') {
      const listeners = this.listeners.exit || []
      listeners.forEach((listener) => listener(...args))
    }
    if (event === 'forceExit') {
      const listeners = this.listeners.forceExit || []
      listeners.forEach((listener) => listener(...args))
    }
  }
}
// Класс для мониторинга аудиоустройств
class AudioDeviceMonitor {
  private audioDeviceProcess: ChildProcess | null = null;
  private exePath = path.join('bin', 'af-win-audio.exe');
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

    // Обработка ошибок при запуске процесса
    this.audioDeviceProcess.on('error', (err) => {
      this.eventEmitter.emit({
        event: 'error',
        args: [`Failed to start process: ${err.message}`]
      });
    });

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

    // Обработка ошибок процесса C#
    this.audioDeviceProcess.stderr?.on('data', (data: Buffer): void => {
      this.eventEmitter.emit({
        event: 'error',
        args: [`C# Error: ${data.toString("utf-8")}`],
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

  public stop(): void {
    if (this.audioDeviceProcess) {
      if (!this.audioDeviceProcess.killed) {
        this.audioDeviceProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!this.audioDeviceProcess?.killed) {
            this.audioDeviceProcess?.kill('SIGKILL');
            this.eventEmitter.emit({
              event: 'forceExit',
              args: ['Process forcibly terminated.']
            });
          }
        }, 3000);
      } else {
        this.eventEmitter.emit({
          event: 'error',
          args: ['Process already terminated.'],
        });
      }
    } else {
      this.eventEmitter.emit({
        event: 'error',
        args: ['Process not started.'],
      });
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