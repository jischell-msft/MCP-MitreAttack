import fs from 'fs';
import { promisify } from 'util';
import { db } from '../db/connection';

const statAsync = promisify(fs.stat);

/**
 * Check disk space availability
 */
export async function checkDiskSpace(): Promise<{
    sufficient: boolean;
    availableSpace: string;
    totalSpace: string;
    usagePercent: number;
}> {
    // This is a simplified implementation - in a production system,
    // you would use a library like `diskusage` for more accurate info
    const path = process.cwd();

    try {
        // Get disk usage from the OS
        // Note: This is a mock implementation - actual implementation would depend on OS
        // and would likely use a library or system call

        // Mock values for demonstration
        const availableGB = 25; // GB
        const totalGB = 100; // GB
        const usagePercent = 100 - (availableGB / totalGB * 100);

        return {
            sufficient: availableGB > 1, // Consider less than 1GB as insufficient
            availableSpace: `${availableGB.toFixed(2)} GB`,
            totalSpace: `${totalGB.toFixed(2)} GB`,
            usagePercent: Number(usagePercent.toFixed(2))
        };
    } catch (error) {
        return {
            sufficient: false,
            availableSpace: 'Unknown',
            totalSpace: 'Unknown',
            usagePercent: 0
        };
    }
}

/**
 * Get processing queue status
 */
export async function getQueueStatus(): Promise<{
    healthy: boolean;
    activeJobs: number;
    queuedJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
}> {
    try {
        // Query the database for workflow status counts
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString();

        // Get active jobs
        const activeJobs = await db.get(`
      SELECT COUNT(*) as count 
      FROM workflows 
      WHERE status IN ('pending', 'running')
    `);

        // Get completed jobs in the last 24 hours
        const completedJobs = await db.get(`
      SELECT COUNT(*) as count 
      FROM workflows 
      WHERE status = 'completed' 
        AND updated_at > ?
    `, [yesterdayISO]);

        // Get failed jobs in the last 24 hours
        const failedJobs = await db.get(`
      SELECT COUNT(*) as count 
      FROM workflows 
      WHERE status = 'failed' 
        AND updated_at > ?
    `, [yesterdayISO]);

        // Determine if the queue is healthy
        // A simple heuristic: queue is unhealthy if there are too many active jobs
        // or if the failure rate is high
        const totalJobs24h = completedJobs.count + failedJobs.count;
        const failureRate = totalJobs24h > 0 ? failedJobs.count / totalJobs24h : 0;
        const healthy = activeJobs.count < 10 && failureRate < 0.2;

        return {
            healthy,
            activeJobs: activeJobs.count,
            queuedJobs: 0, // We don't have a separate queue in this implementation
            completedJobs24h: completedJobs.count,
            failedJobs24h: failedJobs.count
        };
    } catch (error) {
        return {
            healthy: false,
            activeJobs: 0,
            queuedJobs: 0,
            completedJobs24h: 0,
            failedJobs24h: 0
        };
    }
}
