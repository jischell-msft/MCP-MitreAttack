import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_CONFIG } from '../config';

export type DatabaseInstance = Database.Database;
export type Statement = Database.Statement;
export type RunResult = Database.RunResult;

// Database singleton instance
let dbInstance: DatabaseInstance | null = null;

/**
 * Get or create the database connection
 */
export function getDatabase(): DatabaseInstance {
    if (dbInstance) {
        return dbInstance;
    }

    // Ensure database directory exists
    const dbDir = path.dirname(DB_CONFIG.path);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
        // Initialize the database connection
        dbInstance = new Database(DB_CONFIG.path, {
            verbose: DB_CONFIG.debug ? console.log : undefined,
            fileMustExist: false // Create the file if it doesn't exist
        });

        // Enable foreign keys
        dbInstance.pragma('foreign_keys = ON');

        // Configure optimizations
        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('synchronous = NORMAL');

        return dbInstance;
    } catch (error: any) {
        console.error(`Database connection error: ${error.message}`);
        throw new Error(`Failed to connect to database: ${error.message}`);
    }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

/**
 * Execute a transaction
 * @param callback Function to execute within the transaction
 * @returns Result of callback function
 */
export function executeTransaction<T>(callback: (db: DatabaseInstance) => T): T {
    const db = getDatabase();

    try {
        db.prepare('BEGIN').run();
        const result = callback(db);
        db.prepare('COMMIT').run();
        return result;
    } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
    }
}
