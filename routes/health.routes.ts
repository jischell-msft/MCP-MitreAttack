import express, { Request, Response } from 'express';
import { getDatabase } from '../db/database'; // Assuming this path is correct
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger';

const router = express.Router();
const execAsync = promisify(exec);

// Basic health check for load balancers
router.get('/health', async (req: Request, res: Response) => {
    try {
        // Simple database check
        const db = await getDatabase();
        await db.get('SELECT 1');

        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Health check failed', { error: error.message });

        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Detailed health check for monitoring systems
router.get('/health/details', async (req: Request, res: Response) => {
    try {
        // Check database
        let dbStatus = 'ok';
        let dbError = null;
        let dbResponse = null;

        try {
            const db = await getDatabase();
            const result = await db.get('PRAGMA page_count, page_size, integrity_check, freelist_count');
            dbStatus = 'ok';
            dbResponse = result;
        } catch (error: any) {
            dbStatus = 'error';
            dbError = error.message;
        }

        // Check disk space
        const diskInfo = await checkDiskSpace();

        // Check memory usage
        const memoryInfo = getMemoryInfo();

        // Check system uptime
        const uptimeInfo = getUptimeInfo();

        // Check MITRE data
        const mitreDataStatus = await checkMitreData();

        // Return comprehensive health status
        res.status(200).json({
            status: dbStatus === 'ok' && diskInfo.status === 'ok' && mitreDataStatus.status === 'ok' ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || 'unknown',
            uptime: uptimeInfo,
            system: {
                memory: memoryInfo,
                disk: diskInfo,
                platform: process.platform,
                arch: process.arch,
                nodejs: process.version,
            },
            components: {
                database: {
                    status: dbStatus,
                    error: dbError,
                    details: dbResponse,
                },
                mitreData: mitreDataStatus,
            },
        });
    } catch (error: any) {
        logger.error('Detailed health check failed', { error: error.message });

        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Readiness probe for Kubernetes
router.get('/health/ready', async (req: Request, res: Response) => {
    try {
        // Check if all components are ready
        const db = await getDatabase();
        await db.get('SELECT 1');

        // Check if MITRE data is available
        const mitreData = await checkMitreData();

        if (mitreData.status !== 'ok') {
            return res.status(503).json({
                status: 'not_ready',
                reason: 'MITRE data not available',
                timestamp: new Date().toISOString(),
            });
        }

        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Readiness check failed', { error: error.message });

        res.status(503).json({
            status: 'not_ready',
            reason: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Liveness probe for Kubernetes
router.get('/health/live', (req: Request, res: Response) => {
    // Simple check that the process is running and responsive
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
});

// Helper functions
async function checkDiskSpace() {
    try {
        // Check disk space (Unix-like systems)
        if (process.platform !== 'win32') {
            const { stdout } = await execAsync('df -k .');
            const lines = stdout.trim().split('\n');
            const dfOutput = lines[1].split(/\s+/);

            return {
                status: 'ok',
                total: parseInt(dfOutput[1]) * 1024,
                used: parseInt(dfOutput[2]) * 1024,
                available: parseInt(dfOutput[3]) * 1024,
                percentUsed: dfOutput[4],
            };
        }

        // Windows systems
        return {
            status: 'ok',
            total: 'unknown',
            used: 'unknown',
            available: 'unknown',
            percentUsed: 'unknown',
        };
    } catch (error: any) {
        return {
            status: 'error',
            error: error.message,
            total: 'unknown',
            used: 'unknown',
            available: 'unknown',
            percentUsed: 'unknown',
        };
    }
}

function getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentUsed = Math.round((usedMem / totalMem) * 100);

    return {
        status: 'ok',
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percentUsed: `${percentUsed}%`,
    };
}

function getUptimeInfo() {
    const uptimeSec = process.uptime();
    const uptimeMin = Math.floor(uptimeSec / 60);
    const uptimeHour = Math.floor(uptimeMin / 60);
    const uptimeDay = Math.floor(uptimeHour / 24);

    return {
        seconds: Math.floor(uptimeSec),
        formatted: `${uptimeDay}d ${uptimeHour % 24}h ${uptimeMin % 60}m ${Math.floor(uptimeSec % 60)}s`,
        serverStarted: new Date(Date.now() - (uptimeSec * 1000)).toISOString(),
    };
}

async function checkMitreData() {
    try {
        // Check if MITRE data file exists
        const db = await getDatabase();
        const result = await db.get('SELECT COUNT(*) as count FROM mitre_techniques');

        if (result && result.count > 0) {
            return {
                status: 'ok',
                techniqueCount: result.count,
            };
        }

        return {
            status: 'error',
            error: 'No MITRE techniques found in database',
        };
    } catch (error: any) {
        return {
            status: 'error',
            error: error.message,
        };
    }
}

export default router;
