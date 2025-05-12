import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import os from 'os';

// Initialize metrics
collectDefaultMetrics(); // Collects default Node.js metrics

const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
});

const httpRequestDurationMs = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'path', 'status'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

const processMemoryGauge = new Gauge({
    name: 'process_memory_usage_bytes',
    help: 'Process memory usage in bytes',
    collect() {
        const memoryUsage = process.memoryUsage();
        this.set(memoryUsage.heapUsed);
    },
});
register.registerMetric(processMemoryGauge);


const systemMemoryGauge = new Gauge({
    name: 'system_memory_usage_bytes',
    help: 'System memory usage in bytes',
    collect() {
        this.set(os.totalmem() - os.freemem());
    },
});
register.registerMetric(systemMemoryGauge);

const documentsProcessedCounter = new Counter({
    name: 'documents_processed_total',
    help: 'Total number of documents processed',
});

const documentsProcessingErrorsCounter = new Counter({
    name: 'documents_processing_errors_total',
    help: 'Total number of document processing errors',
});

// Middleware to collect metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip metrics routes to avoid recursion
    if (req.path === '/metrics' || req.path === '/api/metrics') { // Added /api/metrics based on prometheus.yml
        return next();
    }

    // Start timer
    const start = Date.now();

    // Record end time and update metrics
    res.on('finish', () => {
        const duration = Date.now() - start;

        // Remove route parameters for better metric grouping
        const path = req.route ? req.route.path : req.path;

        // Update request counter
        httpRequestsTotal.inc({
            method: req.method,
            path,
            status: String(res.statusCode),
        });

        // Update duration histogram
        httpRequestDurationMs.observe(
            {
                method: req.method,
                path,
                status: String(res.statusCode),
            },
            duration
        );
    });

    next();
};

// Endpoint to expose metrics for scraping
export const metricsEndpoint = async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
};

// Function to record document processing
export const recordDocumentProcessed = () => {
    documentsProcessedCounter.inc();
};

// Function to record document processing error
export const recordDocumentError = () => {
    documentsProcessingErrorsCounter.inc();
};
