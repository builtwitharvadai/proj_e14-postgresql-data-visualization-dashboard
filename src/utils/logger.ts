type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = 'info';

const parseLevel = (raw: string | undefined): LogLevel => {
  if (!raw) return DEFAULT_LEVEL;
  const normalized = raw.toLowerCase();
  if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error') {
    return normalized;
  }
  return DEFAULT_LEVEL;
};

const shouldLog = (level: LogLevel): boolean => {
  const configured = parseLevel(process.env['LOG_LEVEL']);
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configured];
};

const format = (level: LogLevel, message: string, meta?: LogMeta): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    try {
      return `${prefix} ${JSON.stringify(meta)}`;
    } catch {
      return `${prefix} [meta serialization failed]`;
    }
  }
  return prefix;
};

const emit = (level: LogLevel, message: string, meta?: LogMeta): void => {
  if (!shouldLog(level)) return;
  const line = format(level, message, meta);
  switch (level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(line);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(line);
      break;
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(line);
      break;
    case 'info':
    default:
      // eslint-disable-next-line no-console
      console.log(line);
      break;
  }
};

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    emit('debug', message, meta);
  },
  info(message: string, meta?: LogMeta): void {
    emit('info', message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    emit('warn', message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    emit('error', message, meta);
  },
};

export type { LogLevel, LogMeta };
