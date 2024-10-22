import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'path';

class AudioDeviceMonitor extends EventEmitter {
    constructor(options) {
        super();
        // Определение процесса
        this.audioDeviceProcess = null;
        this.exePath = path.join('bin', 'af-win-audio.exe');
        // Парсинг информации
        this.parsedInfo = { id: '', name: '', volume: 0, muted: false };
        this.change = {
            "id": false,
            "name": false,
            "volume": false,
            "muted": false
        };
        this.delay = options?.delay !== undefined ? Math.max(options.delay, 100) : 250;
        this.stepVolume = options?.step || 5;
        this.start();
    }
    start() {
        this.audioDeviceProcess = spawn(this.exePath, [this.delay.toString(), this.stepVolume.toString()]);
        if (this.audioDeviceProcess && this.audioDeviceProcess.stdout) {
            this.audioDeviceProcess.stdout.on('data', (data) => {
                try {
                    const parsedData = JSON.parse(data.toString());
                    this.checkChange(parsedData); // Проверка изменения
                    this.parsedInfo = parsedData;
                    this.emit('change', this.parsedInfo, this.change);
                    this.defaultChange();
                }
                catch (e) {
                    this.emit('error', `Failed to parse data: ${e}`);
                }
            });
        }
        else {
            this.emit('error', 'stdout not available.');
        }
        // Обработка ошибок процесса C#
        this.audioDeviceProcess.stderr?.on('data', (data) => {
            this.emit('error', `C# Error: ${data.toString("utf-8")}`);
        });
        this.audioDeviceProcess.on('close', (code) => {
            this.emit('exit', code);
        });
        // Обработка завершения основного процесса Node.js
        process.on('SIGINT', () => {
            console.log('Received SIGINT. Terminating child process...');
            if (this.audioDeviceProcess) {
                this.audioDeviceProcess.kill('SIGTERM'); // Отправка SIGTERM дочернему процессу
            }
            process.exit(); // Завершение основного процесса
        });
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM. Terminating child process...');
            if (this.audioDeviceProcess) {
                this.audioDeviceProcess.kill('SIGTERM'); // Отправка SIGTERM дочернему процессу
            }
            process.exit(); // Завершение основного процесса
        });
    }
    upVolume(step) {
        if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
            if (step) {
                this.audioDeviceProcess.stdin.write(`upVolume ${step}\n`);
            }
            else {
                this.audioDeviceProcess.stdin.write('upVolume\n');
            }
        }
        else {
            this.emit('error', 'Process not started or stdin not available.');
        }
    }
    downVolume(step) {
        if (this.audioDeviceProcess && this.audioDeviceProcess.stdin) {
            if (step) {
                this.audioDeviceProcess.stdin.write(`downVolume ${step}\n`);
            }
            else {
                this.audioDeviceProcess.stdin.write('downVolume\n');
            }
        }
        else {
            this.emit('error', 'Process not started or stdin not available.');
        }
    }
    stop() {
        if (this.audioDeviceProcess) {
            if (!this.audioDeviceProcess.killed) {
                this.audioDeviceProcess.kill('SIGTERM');
                setTimeout(() => {
                    if (!this.audioDeviceProcess?.killed) {
                        this.audioDeviceProcess?.kill('SIGKILL');
                        this.emit('forceExit', 'Process forcibly terminated.');
                    }
                }, 3000);
            }
            else {
                this.emit('error', 'Process already terminated.');
            }
        }
        else {
            this.emit('error', 'Process not started.');
        }
    }
    checkChange(data) {
        for (const key in data) {
            if (data[key] !== this.parsedInfo[key]) {
                this.change[key] = true;
            }
        }
    }
    defaultChange() {
        this.change.id = false;
        this.change.name = false;
        this.change.volume = false;
        this.change.muted = false;
    }
    // Переопределяем метод on для типизации
    on(event, listener) {
        return super.on(event, listener);
    }
}

export { AudioDeviceMonitor as default };
