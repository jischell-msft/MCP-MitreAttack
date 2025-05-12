import express, { Request, Response } from 'express';
// Assuming getDatabase is correctly set up in your project structure
// You might need to adjust the import path based on your actual db setup
// import { getDatabase } from '../db/database'; 

const router = express.Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        // Check database connection (example, replace with your actual db check)
        // const db = await getDatabase(); // Uncomment and use if you have getDatabase
        // await db.get('SELECT 1'); // Uncomment and use if you have getDatabase

        // If db check is not yet implemented or not needed for basic health:
        const dbStatus = 'not_checked'; // or 'connected' if you implement the check

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
            database: 'disconnected', // or appropriate status
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
