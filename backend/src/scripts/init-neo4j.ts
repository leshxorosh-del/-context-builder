import neo4j from 'neo4j-driver';
import { env } from '../config/env';

/**
 * Neo4j initialization script
 * Creates constraints, indexes, and initial schema
 */

const CYPHER_STATEMENTS = [
  // Constraints
  `CREATE CONSTRAINT chat_id IF NOT EXISTS FOR (c:Chat) REQUIRE c.id IS UNIQUE`,
  `CREATE CONSTRAINT super_chat_id IF NOT EXISTS FOR (sc:SuperChat) REQUIRE sc.id IS UNIQUE`,
  `CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE`,
  
  // Indexes for faster lookups
  `CREATE INDEX chat_user_id IF NOT EXISTS FOR (c:Chat) ON (c.userId)`,
  `CREATE INDEX super_chat_user_id IF NOT EXISTS FOR (sc:SuperChat) ON (sc.userId)`,
  
  // Full-text search indexes
  `CREATE FULLTEXT INDEX chat_title IF NOT EXISTS FOR (c:Chat) ON EACH [c.title]`,
  `CREATE FULLTEXT INDEX super_chat_title IF NOT EXISTS FOR (sc:SuperChat) ON EACH [sc.title]`
];

async function main(): Promise<void> {
  console.log('🚀 Neo4j Initialization Script');
  console.log(`   URI: ${env.neo4j.uri}`);
  console.log('');

  const driver = neo4j.driver(
    env.neo4j.uri,
    neo4j.auth.basic(env.neo4j.user, env.neo4j.password)
  );

  const session = driver.session();

  try {
    // Test connection
    await session.run('RETURN 1');
    console.log('✅ Connected to Neo4j');
    console.log('');

    // Execute each statement
    for (const statement of CYPHER_STATEMENTS) {
      try {
        await session.run(statement);
        // Extract constraint/index name from statement
        const match = statement.match(/(\w+_\w+)/);
        const name = match ? match[1] : 'statement';
        console.log(`✅ Created: ${name}`);
      } catch (error) {
        // Constraint might already exist
        if (error instanceof Error && error.message.includes('already exists')) {
          const match = statement.match(/(\w+_\w+)/);
          const name = match ? match[1] : 'statement';
          console.log(`⏭️  Exists: ${name}`);
        } else {
          throw error;
        }
      }
    }

    console.log('');
    console.log('✅ Neo4j initialization complete');

    // Print schema info
    console.log('');
    console.log('📋 Current schema:');
    
    const constraints = await session.run('SHOW CONSTRAINTS');
    console.log(`   Constraints: ${constraints.records.length}`);
    
    const indexes = await session.run('SHOW INDEXES');
    console.log(`   Indexes: ${indexes.records.length}`);

  } catch (error) {
    console.error('❌ Neo4j initialization failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
