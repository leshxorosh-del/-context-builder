import neo4j, { Driver, Session, QueryResult, RecordShape } from 'neo4j-driver';
import { env } from './env';
import { logger } from './logger';

/**
 * Neo4j driver instance
 */
let driver: Driver | null = null;

/**
 * Initialize Neo4j driver
 */
export async function initializeNeo4j(): Promise<void> {
  if (driver) {
    logger.warn('Neo4j driver already initialized');
    return;
  }

  driver = neo4j.driver(
    env.neo4j.uri,
    neo4j.auth.basic(env.neo4j.user, env.neo4j.password),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10000,
      connectionTimeout: 30000,
    }
  );

  // Verify connectivity
  try {
    await driver.verifyConnectivity();
    logger.info('Neo4j connected successfully', { uri: env.neo4j.uri });
  } catch (error) {
    logger.error('Failed to connect to Neo4j', { error });
    throw error;
  }
}

/**
 * Get Neo4j driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initializeNeo4j() first.');
  }
  return driver;
}

/**
 * Get a new session from the driver
 * @param database Optional database name (defaults to 'neo4j')
 */
export function getSession(database: string = 'neo4j'): Session {
  const driver = getDriver();
  return driver.session({ database });
}

/**
 * Execute a Cypher query
 * @param cypher Cypher query string
 * @param params Query parameters
 */
export async function runQuery<T extends RecordShape = RecordShape>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult<T>> {
  const session = getSession();
  const start = Date.now();

  try {
    const result = await session.run<T>(cypher, params);
    const duration = Date.now() - start;

    logger.debug('Executed Cypher query', {
      query: cypher.substring(0, 100),
      duration,
      recordCount: result.records.length
    });

    return result;
  } catch (error) {
    logger.error('Cypher query execution error', {
      query: cypher.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Execute a function within a Neo4j transaction
 * @param fn Function to execute within transaction
 */
export async function withNeo4jTransaction<T>(
  fn: (tx: neo4j.Transaction) => Promise<T>
): Promise<T> {
  const session = getSession();

  try {
    return await session.executeWrite(async (tx) => {
      return fn(tx);
    });
  } finally {
    await session.close();
  }
}

/**
 * Execute a read transaction
 * @param fn Function to execute within read transaction
 */
export async function withNeo4jReadTransaction<T>(
  fn: (tx: neo4j.Transaction) => Promise<T>
): Promise<T> {
  const session = getSession();

  try {
    return await session.executeRead(async (tx) => {
      return fn(tx);
    });
  } finally {
    await session.close();
  }
}

/**
 * Close Neo4j driver
 */
export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    logger.info('Neo4j driver closed');
  }
}

/**
 * Check Neo4j health
 */
export async function checkNeo4jHealth(): Promise<boolean> {
  try {
    const result = await runQuery('RETURN 1 as health');
    return result.records.length > 0;
  } catch {
    return false;
  }
}

/**
 * Common Neo4j node labels
 */
export const NodeLabels = {
  CHAT: 'Chat',
  SUPER_CHAT: 'SuperChat',
  USER: 'User'
} as const;

/**
 * Common Neo4j relationship types
 */
export const RelationshipTypes = {
  INCLUDES: 'INCLUDES',
  OWNS: 'OWNS',
  LINKED_TO: 'LINKED_TO'
} as const;

export default {
  initializeNeo4j,
  getDriver,
  getSession,
  runQuery,
  withNeo4jTransaction,
  withNeo4jReadTransaction,
  closeNeo4j,
  checkNeo4jHealth,
  NodeLabels,
  RelationshipTypes
};
