import { db } from '../db/connection';

/**
 * Check database connection status
 */
export async function checkDatabaseStatus(): Promise<{
    connected: boolean;
    version: string;
    message: string;
}> {
    try {
        // Get SQLite version
        const result = await db.get('SELECT sqlite_version() as version');

        return {
            connected: true,
            version: result.version,
            message: 'Database connection successful'
        };
    } catch (error) {
        return {
            connected: false,
            version: 'unknown',
            message: `Database connection failed: ${error.message}`
        };
    }
}
