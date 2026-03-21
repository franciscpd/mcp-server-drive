type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) in LEVELS
    ? (process.env.LOG_LEVEL as LogLevel)
    : 'info';

function log(level: LogLevel, message: string): void {
  if (LEVELS[level] <= LEVELS[currentLevel]) {
    const timestamp = new Date().toISOString();
    process.stderr.write(
      `[drive-mcp] ${timestamp} ${level.toUpperCase()} ${message}\n`,
    );
  }
}

export const logger = {
  error: (msg: string) => log('error', msg),
  warn: (msg: string) => log('warn', msg),
  info: (msg: string) => log('info', msg),
  debug: (msg: string) => log('debug', msg),
};
