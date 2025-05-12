/**
 * Database Setup Script
 * 
 * This script will initialize the database schema when run.
 */

import { getDatabase } from '../src/db';
import fs from 'fs';
import path from 'path';

// Main function to set up the database
async function setupDatabase() {
    try {
        console.log('Setting up database...');

        const db = getDatabase();

        // Ensure the database directory exists
        const dbDir = path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'mcp.sqlite3'));
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`Created database directory: ${dbDir}`);
        }

        // Basic schema creation (placeholder - will be expanded in future)
        db.exec(`
      -- Create tables only if they don't exist
      
      -- Basic version tracking
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME NOT NULL,
        description TEXT
      );
      
      -- Insert initial version record if not exists
      INSERT OR IGNORE INTO schema_versions (version, applied_at, description)
      VALUES (1, CURRENT_TIMESTAMP, 'Initial schema setup');
    `);

        console.log('Database setup complete!');
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    setupDatabase();
}

export { setupDatabase };
