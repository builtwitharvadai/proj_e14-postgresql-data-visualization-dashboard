import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { getDatabaseConfig, type DatabaseConfig } from '../config/database.config';
import { logger } from '../utils/logger';

class DatabasePoolSingleton {
  private pool: Pool | null = null;

  async init(config?: DatabaseConfig): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const cfg = config ?? getDatabaseConfig();
    const poolConfig: PoolConfig = {
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      min: cfg.poolMin,
      max: cfg.poolMax,
      statement_timeout: cfg.statementTimeout,
      idleTimeoutMillis: cfg.idleTimeout,
    };

    const pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', {
        message: err.message,
        stack: err.stack,
      });
    });

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected to pool');
    });

    pool.on('remove', () => {
      logger.debug('PostgreSQL client removed from pool');
    });

    this.pool = pool;
    logger.info('PostgreSQL connection pool initialized', {
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      poolMin: cfg.poolMin,
      poolMax: cfg.poolMax,
    });

    return pool;
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool has not been initialized. Call init() before getPool().');
    }
    return this.pool;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      logger.warn('Health check called before pool initialization');
      return false;
    }
    try {
      const result = await this.pool.query('SELECT 1 AS ok');
      return result.rowCount === 1;
    } catch (err) {
      const error = err as Error;
      logger.error('Database health check failed', {
        message: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }
    try {
      await this.pool.end();
      logger.info('PostgreSQL connection pool closed gracefully');
    } catch (err) {
      const error = err as Error;
      logger.error('Error while closing PostgreSQL connection pool', {
        message: error.message,
        stack: error.stack,
      });
      throw err;
    } finally {
      this.pool = null;
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params as never);
      const duration = Date.now() - start;
      logger.debug('Query executed', {
        durationMs: duration,
        rowCount: result.rowCount,
      });
      return result;
    } catch (err) {
      const error = err as Error;
      const duration = Date.now() - start;
      logger.error('Query execution failed', {
        message: error.message,
        stack: error.stack,
        durationMs: duration,
        query: text,
      });
      throw err;
    }
  }
}

export const DatabasePool = new DatabasePoolSingleton();
export type { DatabasePoolSingleton };
