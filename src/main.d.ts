// Экспорт типов
export type Range<Min extends number, Max extends number, Result extends number[] = []> =
  Result['length'] extends Max
    ? Result[number]
    : Range<Min, Max, [...Result, Result['length']]>;

// Тип для процентов
export type Percentage = Range<0, 101>;

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
