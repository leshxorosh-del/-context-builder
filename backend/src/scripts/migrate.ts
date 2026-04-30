import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { env } from '../config/env';

/**
 * Migration script for PostgreSQL
 * Runs all SQL migrations in order
 */

const MIGRATIONS_TABLE = 'migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

async function createMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<string[]> {
  const result = await pool.query<Migration>(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return result.rows.map(row => row.name);
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  return files;
}

async function applyMigration(pool: Pool, filename: string): Promise<void> {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
      [filename]
    );
    await client.query('COMMIT');
    console.log(`✅ Applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackAll(pool: Pool): Promise<void> {
  console.log('🔄 Rolling back all migrations...');
  
  // Get all tables except migrations
  const result = await pool.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != '${MIGRATIONS_TABLE}'
  `);
  
  const tables = result.rows.map(r => r.tablename);
  
  if (tables.length > 0) {
    // Drop all tables
    for (const table of tables.reverse()) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  Dropped: ${table}`);
      } catch (error) {
        console.warn(`  Warning: Could not drop ${table}`);
      }
    }
  }
  
  // Drop custom types
  const types = ['message_role', 'link_type', 'subscription_plan'];
  for (const type of types) {
    try {
      await pool.query(`DROP TYPE IF EXISTS ${type} CASCADE`);
    } catch {
      // Type might not exist
    }
  }
  
  // Clear migrations table
  await pool.query(`DELETE FROM ${MIGRATIONS_TABLE}`);
  
  console.log('✅ Rollback complete');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isFresh = args.includes('--fresh');
  
  console.log('🚀 Context Builder Migration Tool');
  console.log(`   Database: ${env.postgres.database}@${env.postgres.host}`);
  console.log('');

  const pool = new Pool({
    host: env.postgres.host,
    port: env.postgres.port,
    database: env.postgres.database,
    user: env.postgres.user,
    password: env.postgres.password
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');
    
    // Create migrations table
    await createMigrationsTable(pool);
    
    // Fresh migration: rollback first
    if (isFresh) {
      await rollbackAll(pool);
    }
    
    // Get pending migrations
    const applied = await getAppliedMigrations(pool);
    const files = await getMigrationFiles();
    const pending = files.filter(f => !applied.includes(f));
    
    if (pending.length === 0) {
      console.log('✅ All migrations are up to date');
      return;
    }
    
    console.log(`📋 Pending migrations: ${pending.length}`);
    console.log('');
    
    // Apply migrations
    for (const file of pending) {
      await applyMigration(pool, file);
    }
    
    console.log('');
    console.log('✅ All migrations applied successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
