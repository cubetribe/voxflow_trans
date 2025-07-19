import knex from 'knex';
import { config } from './app.config';
import { logger } from '@/utils/logger';

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: config.database.url.replace('sqlite:', ''),
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds',
    extension: 'ts',
  },
});

export async function connectDatabase(): Promise<void> {
  try {
    // Test connection
    await db.raw('SELECT 1');
    
    // Run migrations
    await db.migrate.latest();
    
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}