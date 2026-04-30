/**
 * Configuration module exports
 */
export * from './env';
export * from './logger';
export * from './database';
export * from './neo4j';
export * from './redis';
export * from './llm';

import { validateEnv } from './env';
import { initializeDatabase, closeDatabase } from './database';
import { initializeNeo4j, closeNeo4j } from './neo4j';
import { initializeRedis, closeRedis } from './redis';
import { initializeLLM } from './llm';
import { logger } from './logger';

/**
 * Initialize all services
 */
export async function initializeServices(): Promise<void> {
  logger.info('Initializing services...');
  
  // Validate environment
  validateEnv();
  
  // Initialize databases and services in parallel where possible
  await Promise.all([
    initializeDatabase(),
    initializeNeo4j(),
    initializeRedis()
  ]);
  
  // Initialize LLM (sync, just creates client)
  initializeLLM();
  
  logger.info('All services initialized successfully');
}

/**
 * Gracefully shutdown all services
 */
export async function shutdownServices(): Promise<void> {
  logger.info('Shutting down services...');
  
  await Promise.all([
    closeDatabase(),
    closeNeo4j(),
    closeRedis()
  ]);
  
  logger.info('All services shut down successfully');
}
