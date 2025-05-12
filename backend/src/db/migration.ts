import fs from 'fs';
import path from 'path';
import { getDatabase, executeTransaction } from './connection';
import { DB_CONFIG } from '../config';

interface Migration {
    version: number;
    name: string;
    up: string;
    down: string;
}

/**
 * Initialize the database schema
 */
export async function initializeDatabase(): Promise<void> {
    const db = getDatabase();

    // Create migration tracking table if it doesn't exist
    db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME NOT NULL
    )
  `);

    // Check if we have any migrations applied
    const result = db.prepare('SELECT COUNT(*) as count FROM migrations').get() as { count: number };

    // If no migrations, initialize with base schema
    if (result.count === 0) {
        try {
            console.log('Initializing database schema...');
            const schemaContent = fs.readFileSync(DB_CONFIG.schemaPath, 'utf8');

            executeTransaction((db) => {
                db.exec(schemaContent);
                db.prepare(`
          INSERT INTO migrations (version, name, applied_at)
          VALUES (1, 'initial_schema', datetime('now'))
        `).run();
            });

            console.log('Database schema initialized successfully.');
        } catch (error: any) {
            console.error(`Failed to initialize database schema: ${error.message}`);
            throw error;
        }
    }
}

/**
 * Get the current database schema version
 */
export function getCurrentVersion(): number {
    const db = getDatabase();

    try {
        const result = db.prepare('SELECT MAX(version) as version FROM migrations').get() as { version: number | null };
        return result.version || 0;
    } catch (error) {
        // If table doesn't exist, return 0
        return 0;
    }
}

/**
 * Load available migrations from files
 */
export function loadMigrations(): Migration[] {
    const migrationFiles = fs.readdirSync(DB_CONFIG.migrationDir);
    const migrations: Migration[] = [];

    for (const file of migrationFiles) {
        if (file.endsWith('.sql')) {
            const filePath = path.join(DB_CONFIG.migrationDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Parse file name to get version and name (e.g., 002_add_user_table.sql)
            const match = file.match(/^(\d+)_([a-z0-9_]+)\.sql$/i);

            if (match) {
                const version = parseInt(match[1], 10);
                const name = match[2];

                // Split content into up and down migrations
                const [up, down] = content.split('-- Down');

                migrations.push({
                    version,
                    name,
                    up: up.replace('-- Up', '').trim(),
                    down: down ? down.trim() : ''
                });
            }
        }
    }

    // Sort by version
    return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Apply pending migrations
 * @param targetVersion Optional target version to migrate to
 */
export function migrateUp(targetVersion?: number): void {
    const db = getDatabase();
    const currentVersion = getCurrentVersion();
    const migrations = loadMigrations();

    const pendingMigrations = migrations
        .filter(m => m.version > currentVersion)
        .filter(m => targetVersion === undefined || m.version <= targetVersion);

    if (pendingMigrations.length === 0) {
        console.log('Database is up to date.');
        return;
    }

    console.log(`Applying ${pendingMigrations.length} migrations...`);

    for (const migration of pendingMigrations) {
        try {
            console.log(`Migrating to version ${migration.version} (${migration.name})...`);

            executeTransaction((db) => {
                // Apply the migration
                db.exec(migration.up);

                // Record the migration
                db.prepare(`
          INSERT INTO migrations (version, name, applied_at)
          VALUES (?, ?, datetime('now'))
        `).run(migration.version, migration.name);
            });

            console.log(`Migration to version ${migration.version} completed.`);
        } catch (error: any) {
            console.error(`Migration to version ${migration.version} failed: ${error.message}`);
            throw error;
        }
    }

    console.log('Migrations completed successfully.');
}

/**
 * Rollback migrations
 * @param steps Number of migrations to roll back (default: 1)
 */
export function migrateDown(steps: number = 1): void {
    const db = getDatabase();
    const currentVersion = getCurrentVersion();
    const migrations = loadMigrations();

    // Get applied migrations in reverse order
    const appliedMigrations = db.prepare(`
    SELECT version, name FROM migrations
    ORDER BY version DESC
    LIMIT ?
  `).all(steps) as { version: number, name: string }[];

    if (appliedMigrations.length === 0) {
        console.log('No migrations to roll back.');
        return;
    }

    console.log(`Rolling back ${appliedMigrations.length} migrations...`);

    for (const applied of appliedMigrations) {
        const migration = migrations.find(m => m.version === applied.version);

        if (!migration || !migration.down) {
            console.warn(`No down migration found for version ${applied.version}. Skipping.`);
            continue;
        }

        try {
            console.log(`Rolling back version ${migration.version} (${migration.name})...`);

            executeTransaction((db) => {
                // Apply the down migration
                db.exec(migration.down);

                // Remove the migration record
                db.prepare('DELETE FROM migrations WHERE version = ?').run(migration.version);
            });

            console.log(`Rollback of version ${migration.version} completed.`);
        } catch (error: any) {
            console.error(`Rollback of version ${migration.version} failed: ${error.message}`);
            throw error;
        }
    }

    console.log('Rollbacks completed successfully.');
}
