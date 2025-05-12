import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/api-response';
import { getDatabase } from '../../db/connection';
import { logger } from '../../utils/logger';
import { generateUUID } from '../../utils';

// Create router
export const systemRouter = Router();

// System status endpoint
systemRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check database connection
        const dbStatus = checkDatabaseStatus();

        // Get MITRE data status (mock)
        const mitreStatus = {
            available: true,
            version: '13.1',
            techniquesCount: 582,
            lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            nextUpdateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        };

        // Check disk space (mock)
        const diskStatus = {
            available: true,
            totalSpace: '100GB',
            freeSpace: '45GB',
            percentUsed: 55
        };

        // Get processing queue status (mock)
        const queueStatus = {
            active: 2,
            pending: 5,
            completed: 125,
            failed: 3
        };

        // Build status response
        const status = {
            system: {
                status: 'operational',
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                nodeVersion: process.version
            },
            components: {
                database: {
                    status: dbStatus.connected ? 'operational' : 'error',
                    version: dbStatus.version,
                    message: dbStatus.message
                },
                mitreData: mitreStatus,
                diskSpace: diskStatus,
                queue: queueStatus
            }
        };

        return sendSuccess(res, status);
    } catch (error) {
        next(error);
    }
});

// MITRE update endpoint
systemRouter.post('/update', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // In a real implementation, we would start an async job to update the MITRE data
        // For now, just return a success response with a mock job ID

        const jobId = generateUUID();
        logger.info(`Starting MITRE ATT&CK data update job: ${jobId}`);

        return sendSuccess(
            res,
            {
                jobId,
                status: 'updating',
                message: 'MITRE ATT&CK update started',
                statusUrl: `/api/system/update/${jobId}`
            },
            {},
            202 // Accepted
        );
    } catch (error) {
        next(error);
    }
});

// Update status endpoint
systemRouter.get('/update/:jobId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { jobId } = req.params;

        // In a real implementation, we would check the status of the update job
        // For now, return a mock status

        // Use a deterministic approach to generate different statuses for demo purposes
        const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const status = hash % 4; // 0-3

        let response;

        switch (status) {
            case 0:
                response = {
                    jobId,
                    status: 'running',
                    progress: 25,
                    message: 'Downloading MITRE ATT&CK data'
                };
                break;
            case 1:
                response = {
                    jobId,
                    status: 'running',
                    progress: 60,
                    message: 'Processing STIX data'
                };
                break;
            case 2:
                response = {
                    jobId,
                    status: 'completed',
                    progress: 100,
                    message: 'Update completed successfully',
                    techniquesCount: 582,
                    version: '13.1'
                };
                break;
            case 3:
                response = {
                    jobId,
                    status: 'failed',
                    progress: 45,
                    error: {
                        code: 'UPDATE_FAILED',
                        message: 'Failed to process MITRE data'
                    }
                };
                break;
        }

        return sendSuccess(res, response);
    } catch (error) {
        next(error);
    }
});

/**
 * Check database connection status
 */
function checkDatabaseStatus() {
    try {
        const db = getDatabase();
        const result = db.prepare('SELECT sqlite_version() as version').get() as { version: string };

        return {
            connected: true,
            version: result.version,
            message: 'Connected successfully'
        };
    } catch (error: any) {
        return {
            connected: false,
            version: null,
            message: error.message
        };
    }
}
