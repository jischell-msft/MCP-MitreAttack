import { Router } from 'express';
import analyzeRoutes from './analyze.routes';
import reportRoutes from './report.routes';
import systemRoutes from './system.routes';

const router = Router();

// Register all routes
router.use('/analyze', analyzeRoutes);
router.use('/reports', reportRoutes);
router.use('/system', systemRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

export default router;
