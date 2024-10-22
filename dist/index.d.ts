import { EventEmitter } from 'node:events';
type Range<Min extends number, Max extends number, Result extends number[] = []> = Result['length'] extends Max ? Result[number] : Range<Min, Max, [...Result, Result['length']]>;
type Percentage = Range<0, 101>;
interface AudioMonitorOptions {
    delay?: number;
    step?: number;
}
interface IDevice {
    id: string;
    name: string;
    volume: number;
    muted: boolean;
}
interface IChange {
    id: boolean;
    name: boolean;
    volume: boolean;
    muted: boolean;
}
interface AudioMonitorEvents {
    change: (deviceInfo: IDevice, change: IChange) => void;
    error: (message: string) => void;
    exit: (code: number) => void;
    forceExit: (message: string) => void;
}
declare class AudioDeviceMonitor extends EventEmitter {
    private audioDeviceProcess;
    private exePath;
    private delay;
    private stepVolume;
    private parsedInfo;
    private change;
    constructor(options?: AudioMonitorOptions);
    private start;
    upVolume(step?: Percentage): void;
    downVolume(step?: Percentage): void;
    stop(): void;
    private checkChange;
    private defaultChange;
    on<K extends keyof AudioMonitorEvents>(event: K, listener: AudioMonitorEvents[K]): this;
}
export default AudioDeviceMonitor;
//# sourceMappingURL=index.d.ts.map