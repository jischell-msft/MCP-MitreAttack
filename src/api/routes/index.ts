import { Router } from 'express';
import { analyzeRouter } from './analyze-routes';
import { reportsRouter } from './reports-routes';
import { systemRouter } from './system-routes';

// Main API router
export const apiRouter = Router();

// Register route groups
apiRouter.use('/analyze', analyzeRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/system', systemRouter);

// API root endpoint
apiRouter.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'MCP-MitreAttack API',
            version: process.env.npm_package_version || '1.0.0'
        },
        meta: {
            timestamp: new Date().toISOString(),
            documentation: '/api-docs'
        }
    });
});
