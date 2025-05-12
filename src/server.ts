import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { Server } from 'http';
import { apiRouter } from './api/routes';
import {
    apiRateLimiter,
    corsMiddleware,
    helmetMiddleware
} from './api/middleware/security-middleware';
import {
    errorHandlerMiddleware,
    notFoundMiddleware
} from './api/middleware/error-middleware';
import { logger } from './utils/logger';
import { SERVER_CONFIG } from './config';
import { getDatabase, closeDatabase } from './db/connection';

/**
 * Express server class
 */
export class AppServer {
    private app: express.Application;
    private server: Server | null = null;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Configure middleware
     */
    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmetMiddleware);
        this.app.use(corsMiddleware);
        this.app.use('/api', apiRateLimiter);

        // Request parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Compression middleware
        this.app.use(compression());

        // Logging middleware
        this.app.use(morgan(SERVER_CONFIG.nodeEnv === 'development' ? 'dev' : 'combined', {
            stream: {
                write: (message: string) => logger.info(message.trim())
            },
            skip: (req) => req.path === '/health' // Skip logging health checks
        }));
    }

    /**
     * Configure routes
     */
    private setupRoutes(): void {
        // Health check route (no auth required)
        this.app.get('/health', (req, res) => {
            const dbStatus = this.checkDbStatus();

            return res.status(dbStatus.ok ? 200 : 503).json({
                status: dbStatus.ok ? 'ok' : 'error',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                uptime: process.uptime(),
                database: dbStatus
            });
        });

        // API routes
        this.app.use('/api', apiRouter);
    }

    /**
     * Configure error handling
     */
    private setupErrorHandling(): void {
        // Not found handler
        this.app.use(notFoundMiddleware);

        // Error handler
        this.app.use(errorHandlerMiddleware);
    }

    /**
     * Check database connection status
     */
    private checkDbStatus(): { ok: boolean; message?: string } {
        try {
            const db = getDatabase();
            // Try a simple query to verify connection
            db.prepare('SELECT 1').get();
            return { ok: true };
        } catch (error: any) {
            return {
                ok: false,
                message: error.message
            };
        }
    }

    /**
     * Start the server
     */
    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const port = SERVER_CONFIG.port;

                this.server = this.app.listen(port, () => {
                    logger.info(`Server started on port ${port}`);
                    resolve();
                });

                // Handle server errors
                this.server.on('error', (error) => {
                    logger.error(`Server error: ${error.message}`);
                    reject(error);
                });

                // Handle graceful shutdown
                this.setupGracefulShutdown();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the server
     */
    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }

            this.server.close((error) => {
                if (error) {
                    logger.error(`Error stopping server: ${error.message}`);
                    reject(error);
                    return;
                }

                logger.info('Server stopped');
                this.server = null;
                resolve();
            });
        });
    }

    /**
     * Setup graceful shutdown handlers
     */
    private setupGracefulShutdown(): void {
        const shutdown = async () => {
            logger.info('Received shutdown signal');

            try {
                // Stop accepting new requests
                await this.stop();

                // Close database connections
                closeDatabase();

                logger.info('Server gracefully shut down');
                process.exit(0);
            } catch (error: any) {
                logger.error(`Error during shutdown: ${error.message}`);
                process.exit(1);
            }
        };

        // Listen for termination signals
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }

    /**
     * Get the Express application instance
     */
    public getApp(): express.Application {
        return this.app;
    }
}
