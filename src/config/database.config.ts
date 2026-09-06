export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolMin: number;
  poolMax: number;
  statementTimeout: number;
  idleTimeout: number;
}

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;

const parseIntEnv = (value: string | undefined, defaultValue: number, name: string): number => {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid value for environment variable "${name}": expected non-negative integer, got "${value}"`);
  }
  return parsed;
};

export function getDatabaseConfig(): DatabaseConfig {
  const missing: string[] = [];
  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}. ` +
        'Please set these variables before starting the application.'
    );
  }

  const host = process.env['DB_HOST'] as string;
  const portRaw = process.env['DB_PORT'] as string;
  const database = process.env['DB_NAME'] as string;
  const user = process.env['DB_USER'] as string;
  const password = process.env['DB_PASSWORD'] as string;

  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid DB_PORT value "${portRaw}": must be an integer between 1 and 65535`);
  }

  const poolMin = parseIntEnv(process.env['DB_POOL_MIN'], 2, 'DB_POOL_MIN');
  const poolMax = parseIntEnv(process.env['DB_POOL_MAX'], 10, 'DB_POOL_MAX');
  const statementTimeout = parseIntEnv(process.env['DB_STATEMENT_TIMEOUT'], 30000, 'DB_STATEMENT_TIMEOUT');
  const idleTimeout = parseIntEnv(process.env['DB_IDLE_TIMEOUT'], 10000, 'DB_IDLE_TIMEOUT');

  if (poolMin > poolMax) {
    throw new Error(
      `Invalid pool configuration: DB_POOL_MIN (${poolMin}) cannot be greater than DB_POOL_MAX (${poolMax})`
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
    poolMin,
    poolMax,
    statementTimeout,
    idleTimeout,
  };
}
