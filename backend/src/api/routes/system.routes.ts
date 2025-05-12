import { Router } from 'express';
import { checkDatabaseStatus } from '../../utils/db-helpers';
import { getMitreDataStatus, startUpdateWorkflow, isUpdateInProgress } from '../../services/mitre.service';
import { checkDiskSpace, getQueueStatus } from '../../utils/system-utils';

const router = Router();

// System status endpoint
router.get('/status', async (req, res, next) => {
    try {
        // Check database connection
        const dbStatus = await checkDatabaseStatus();

        // Get MITRE data status
        const mitreStatus = await getMitreDataStatus();

        // Check disk space
        const diskStatus = await checkDiskSpace();

        // Get processing queue status
        const queueStatus = await getQueueStatus();

        // Build status response
        const status = {
            system: {
                status: 'operational',
                uptime: process.uptime(),
                version: process.env.APP_VERSION || '1.0.0',
                nodeVersion: process.version
            },
            components: {
                database: {
                    status: dbStatus.connected ? 'operational' : 'error',
                    version: dbStatus.version,
                    message: dbStatus.message
                },
                mitreData: {
                    status: mitreStatus.available ? 'operational' : 'error',
                    version: mitreStatus.version,
                    lastUpdated: mitreStatus.lastUpdated,
                    techniqueCount: mitreStatus.techniqueCount
                },
                storage: {
                    status: diskStatus.sufficient ? 'operational' : 'warning',
                    availableSpace: diskStatus.availableSpace,
                    totalSpace: diskStatus.totalSpace,
                    usagePercent: diskStatus.usagePercent
                },
                processingQueue: {
                    status: queueStatus.healthy ? 'operational' : 'warning',
                    activeJobs: queueStatus.activeJobs,
                    queuedJobs: queueStatus.queuedJobs,
                    completedJobs24h: queueStatus.completedJobs24h,
                    failedJobs24h: queueStatus.failedJobs24h
                }
            }
        };

        // Return status response
        return res.status(200).json({
            success: true,
            data: status,
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
});

// MITRE update endpoint
router.post('/update', async (req, res, next) => {
    try {
        // Check if update is already in progress
        if (isUpdateInProgress()) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'UPDATE_IN_PROGRESS',
                    message: 'A MITRE ATT&CK update is already in progress'
                }
            });
        }

        // Start update workflow asynchronously
        const jobId = await startUpdateWorkflow();

        // Return response
        return res.status(202).json({
            success: true,
            data: {
                jobId,
                status: 'updating',
                message: 'MITRE ATT&CK update started',
                statusUrl: `/api/system/update/${jobId}`
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
