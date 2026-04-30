/**
 * Jest test setup file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'context_builder_test';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'test_password';
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for async tests
jest.setTimeout(30000);

// Global teardown
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});
