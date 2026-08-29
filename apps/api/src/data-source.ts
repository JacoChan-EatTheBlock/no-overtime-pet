import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load env files in priority order (same as app.module.ts)
config({ path: join(__dirname, '../../../.env.local') });
config({ path: join(__dirname, '../../../.env') });
config({ path: '.env.local' });
config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — check your .env files');
}

/**
 * Standalone DataSource for TypeORM CLI commands:
 *   npx typeorm migration:run    -d src/data-source.ts
 *   npx typeorm migration:revert -d src/data-source.ts
 *   npx typeorm migration:generate -d src/data-source.ts -n MigrationName
 */
export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: { rejectUnauthorized: false },
  entities: [join(__dirname, '**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  logging: process.env.NODE_ENV === 'development',
});
