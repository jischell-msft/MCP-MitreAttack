/**
 * Database Operations
 * 
 * This directory will contain:
 * - Database connection management
 * - Schema definition and migrations
 * - Repository pattern implementations
 */

import path from 'path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

// Get database path from environment variable or use default
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'mcp.sqlite3');

// Database connection function
export function getDatabase() {
    try {
        return new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : undefined });
    } catch (error) {
        console.error('Database connection error:', error);
        throw new Error('Failed to connect to database');
    }
}
