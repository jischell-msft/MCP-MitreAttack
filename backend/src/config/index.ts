/**
 * Configuration
 * 
 * This directory will contain configuration settings and environment variable handling.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Server configuration
export const SERVER_CONFIG = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
};

// Database configuration
export const DB_CONFIG = {
    path: process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'mcp.sqlite3'),
    debug: process.env.NODE_ENV === 'development',
    migrationDir: path.join(process.cwd(), 'src', 'db', 'migrations'),
    schemaPath: path.join(process.cwd(), 'src', 'db', 'schema.sql'),
};

// MITRE ATT&CK configuration
export const MITRE_CONFIG = {
    updateInterval: parseInt(process.env.MITRE_UPDATE_INTERVAL || '86400000', 10), // Default: 24 hours
/*...*/