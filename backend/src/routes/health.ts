import express, { Request, Response } from 'express';
// Assuming getDatabase is correctly typed and exported from your db setup
// import { getDatabase } from '../db/database'; 

const router = express.Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        // Check database connection (example, replace with actual db check)
        // const db = await getDatabase(); 
        // await db.get('SELECT 1'); // This is a placeholder for an actual DB ping

        // Simulate a successful database check for now if getDatabase is not available
        const dbStatus = 'connected'; // Placeholder: 'connected' or 'disconnected'
        if (dbStatus !== 'connected') {
            throw new Error('Database not connected');
        }

        // Return health status
        return res.status(200).json({
            status: 'healthy',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || 'unknown',
        });
    } catch (error) {
        // Database connection failed or other error
        const err = error as Error;
        return res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected', // Or more specific error
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
