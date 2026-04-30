import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { logger } from './logger';

/**
 * PostgreSQL connection pool
 */
let pool: Pool | null = null;

/**
 * Initialize PostgreSQL connection pool
 */
export async function initializeDatabase(): Promise<void> {
  if (pool) {
    logger.warn('Database pool already initialized');
    return;
  }

  pool = new Pool({
    host: env.postgres.host,
    port: env.postgres.port,
    database: env.postgres.database,
    user: env.postgres.user,
    password: env.postgres.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error', { error: err.message });
  });

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connected successfully', {
      host: env.postgres.host,
      database: env.postgres.database
    });
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    throw error;
  }
}

/**
 * Get the database pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Execute a parameterized query
 * @param text SQL query with $1, $2, etc. placeholders
 * @param params Query parameters
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const pool = getPool();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', {
      query: text.substring(0, 100),
      duration,
      rowCount: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Query execution error', {
      query: text.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Execute a function within a transaction
 * @param fn Function to execute within transaction
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export default {
  initializeDatabase,
  getPool,
  query,
  getClient,
  withTransaction,
  closeDatabase,
  checkDatabaseHealth
};
