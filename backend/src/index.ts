import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { AppServer } from './server';
import { initializeDatabase } from './db/migration';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS configuration
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logging

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database initialization and server startup
async function main() {
    try {
        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized successfully');

        // Start server
        const server = new AppServer();
        await server.start();
    } catch (error: any) {
        logger.error(`Failed to start application: ${error.message}`, { stack: error.stack });
        process.exit(1);
    }
}

// Start application
main();

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
});
