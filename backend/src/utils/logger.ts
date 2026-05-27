import { config } from '../config';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3
};

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'App') {
    this.serviceName = serviceName;
  }

  private shouldLog(level: LogLevel): boolean {
    const currentLevel = LOG_LEVELS[config.log.level as LogLevel] || LOG_LEVELS[LogLevel.INFO];
    return LOG_LEVELS[level] <= currentLevel;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.serviceName}] ${message}${metaStr}`;
  }

  error(message: string, error?: Error | any, meta?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorMeta = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack, ...meta }
      : { error, ...meta };

    console.error(this.formatMessage('ERROR', message, errorMeta));
  }

  warn(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage('WARN', message, meta));
  }

  info(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.formatMessage('INFO', message, meta));
  }

  debug(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.formatMessage('DEBUG', message, meta));
  }

  child(serviceName: string): Logger {
    return new Logger(`${this.serviceName}:${serviceName}`);
  }
}

export const logger = new Logger('SuperIndividual');

export const createLogger = (serviceName: string) => logger.child(serviceName);
