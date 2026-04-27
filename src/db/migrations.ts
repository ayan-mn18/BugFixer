import { promises as fs } from 'fs';
import path from 'path';
import { Pool, PoolConfig } from 'pg';
import config from '../config';
import logger from '../lib/logger';
import { resolveDatabaseUrl, shouldUseSsl } from './connection';

const MIGRATIONS_TABLE = 'schema_migrations';
const migrationsDirectory = path.resolve(__dirname, '../../migrations');

const getPoolConfig = (): PoolConfig => {
  const connectionString = resolveDatabaseUrl();

  return {
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
  };
};

const ensureMigrationsTable = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const listPendingMigrations = async (pool: Pool) => {
  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  const { rows } = await pool.query<{ filename: string }>(
    `SELECT filename FROM ${MIGRATIONS_TABLE}`
  );
  const applied = new Set(rows.map((row) => row.filename));

  return files.filter((file) => !applied.has(file));
};

const applyMigration = async (pool: Pool, filename: string) => {
  const migrationPath = path.join(migrationsDirectory, filename);
  const sql = await fs.readFile(migrationPath, 'utf8');

  logger.info({ filename }, 'Applying database migration');
  await pool.query(sql);
  await pool.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [filename]);
  logger.info({ filename }, 'Database migration applied');
};

export const runMigrations = async () => {
  const pool = new Pool(getPoolConfig());

  try {
    await pool.query('SELECT 1');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await ensureMigrationsTable(pool);

    const pendingMigrations = await listPendingMigrations(pool);
    if (pendingMigrations.length === 0) {
      logger.info('No pending database migrations');
      return;
    }

    for (const filename of pendingMigrations) {
      await applyMigration(pool, filename);
    }

    logger.info({ appliedCount: pendingMigrations.length }, 'Database migrations completed');
  } catch (error) {
    logger.error({ err: error }, 'Database migrations failed');
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration command finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      logger.fatal({ err: error }, 'Migration command failed');
      process.exit(1);
    });
}
