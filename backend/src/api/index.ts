/**
 * API Routes
 * 
 * This directory will contain Express routes for:
 * - Document/URL submission and analysis
 * - Report retrieval and management
 * - System status and management
 */

import { Router } from 'express';

// Create main router
export const apiRouter = Router();

// Health check route
apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Example route structure
// apiRouter.use('/analyze', analyzeRouter);
// apiRouter.use('/reports', reportsRouter);
// apiRouter.use('/system', systemRouter);
