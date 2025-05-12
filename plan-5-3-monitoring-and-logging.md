# Monitoring and Logging

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on implementing a comprehensive monitoring and logging system to track application health, performance, and errors. This will help with troubleshooting, performance optimization, and ensuring system reliability.

## Requirements
- Implement structured logging across all components
- Set up health check endpoints for monitoring
- Create basic monitoring dashboard
- Implement error tracking and alerting
- Configure log rotation and storage

## Tasks

### 5.3.1. Implement structured logging
- Create logging configuration
- Implement JSON-formatted logs
- Add context information to logs
- Set up log level management
- Create logging utilities

### 5.3.2. Create logging middleware
- Implement request logging middleware
- Add performance timing
- Create correlation IDs
- Log request/response information
- Implement error logging

### 5.3.3. Set up health check endpoints
- Create system health endpoint
- Implement component health checks
- Add dependency status reporting
- Create health metrics
- Implement readiness/liveness probes

### 5.3.4. Implement error tracking
- Create centralized error handling
- Add error categorization
- Implement error reporting
- Create error notification system
- Set up error rate monitoring

### 5.3.5. Create basic monitoring dashboard
- Implement system metrics collection
- Create performance dashboard
- Add request volume monitoring
- Implement status visualization
- Create alert indicators

### 5.3.6. Set up log rotation
- Configure log file management
- Implement rotation policies
- Create archive management
- Set up compression
- Configure retention periods

### 5.3.7. Implement alerting for critical errors
- Create alert thresholds
- Implement notification channels
- Set up alert routing
- Configure alert severity levels
- Create alert aggregation

### 5.3.8. Test monitoring and logging system
- Verify log output
- Test error tracking
- Validate alert triggering
- Check dashboard functionality
- Verify log rotation

## Implementation Guidance

The implementation should:
- Use structured logging for all components
- Implement consistent error handling and reporting
- Create useful and actionable alerts
- Ensure performance impact is minimal
- Design for scalability and maintainability

Start by setting up structured logging and logging middleware. Next, implement health check endpoints and error tracking. Finally, create monitoring dashboards, configure log rotation, and set up alerting.

## Structured Logging Setup

Create a logger utility:

```typescript
// utils/logger.ts
import winston from 'winston';
import { Request } from 'express';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Define color scheme
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Create format for JSON file logs
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/all.log',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Create request logger format
export const logRequest = (req: Request, responseTime?: number) => {
  const { method, originalUrl, ip, query, body } = req;
  
  return {
    method,
    url: originalUrl,
    ip,
    query,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    // Don't log sensitive information from body
    bodySize: body ? JSON.stringify(body).length : 0,
    timestamp: new Date().toISOString(),
  };
};

export default logger;
```

## Logging Middleware

Implement logging middleware for Express:

```typescript
// middleware/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger, { logRequest } from '../utils/logger';

// Add request ID and timing middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Add correlation ID to request
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  
  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    ...logRequest(req),
    requestId: req.id,
  });
  
  // Record start time
  const start = Date.now();
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(logLevel, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      requestId: req.id,
    });
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error processing request: ${err.message}`, {
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500,
      code: err.code,
    },
    request: logRequest(req),
    requestId: req.id,
  });
  
  next(err);
};
```

## Health Check Endpoint

Create comprehensive health check endpoints:

```typescript
// routes/health.routes.ts
import express, { Request, Response } from 'express';
import { getDatabase } from '../db/database';
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
  } catch (error) {
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
    } catch (error) {
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
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
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
  } catch (error) {
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
  } catch (error) {
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
      const [, space] = lines[1].split(/\s+/);
      const [, used] = lines[1].split(/\s+/);
      const [, available] = lines[1].split(/\s+/);
      const [, percentUsed] = lines[1].split(/\s+/);
      
      return {
        status: 'ok',
        total: parseInt(space) * 1024,
        used: parseInt(used) * 1024,
        available: parseInt(available) * 1024,
        percentUsed,
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
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
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
    
    if (result.count > 0) {
      return {
        status: 'ok',
        techniqueCount: result.count,
      };
    }
    
    return {
      status: 'error',
      error: 'No MITRE techniques found in database',
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
}

export default router;
```

## Monitoring Metrics

Implement application metrics collection:

```typescript
// middleware/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import os from 'os';

// Initialize metrics
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

const systemMemoryGauge = new Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
  collect() {
    this.set(os.totalmem() - os.freemem());
  },
});

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
  if (req.path === '/metrics') {
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
      status: res.statusCode,
    });
    
    // Update duration histogram
    httpRequestDurationMs.observe(
      {
        method: req.method,
        path,
        status: res.statusCode,
      },
      duration
    );
  });
  
  next();
};

// Endpoint to expose metrics for scraping
export const metricsEndpoint = (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

// Function to record document processing
export const recordDocumentProcessed = () => {
  documentsProcessedCounter.inc();
};

// Function to record document processing error
export const recordDocumentError = () => {
  documentsProcessingErrorsCounter.inc();
};
```

## Error Tracking Integration

Implement comprehensive error tracking:

```typescript
// utils/error-tracker.ts
import logger from './logger';

interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, any>;
  user?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorCount: Record<string, number> = {};
  private lastNotificationTime: Record<string, number> = {};
  private alertThreshold: number = 5; // Errors of same type before alerting
  private alertCooldown: number = 60 * 60 * 1000; // 1 hour cooldown between alerts
  
  private constructor() {
    // Initialize error tracking
    setInterval(() => this.resetErrorCounts(), 24 * 60 * 60 * 1000); // Reset counts daily
  }
  
  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    
    return ErrorTracker.instance;
  }
  
  public trackError(error: Error | string, details: Partial<ErrorDetails> = {}): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    const errorCode = typeof error === 'string' ? undefined : (error as any).code;
    
    const normalizedDetails: ErrorDetails = {
      message: errorMessage,
      stack: errorStack,
      code: errorCode || details.code,
      context: details.context || {},
      user: details.user,
      severity: details.severity || 'medium',
      tags: details.tags || [],
    };
    
    // Log the error
    logger.error(errorMessage, {
      error: {
        message: normalizedDetails.message,
        stack: normalizedDetails.stack,
        code: normalizedDetails.code,
      },
      context: normalizedDetails.context,
      user: normalizedDetails.user,
      severity: normalizedDetails.severity,
      tags: normalizedDetails.tags,
    });
    
    // Generate a key for this error type
    const errorKey = this.getErrorKey(normalizedDetails);
    
    // Update error count
    this.errorCount[errorKey] = (this.errorCount[errorKey] || 0) + 1;
    
    // Check if we should send an alert
    this.checkForAlert(errorKey, normalizedDetails);
  }
  
  private getErrorKey(details: ErrorDetails): string {
    // Create a unique key based on error properties
    return `${details.code || 'unknown'}-${details.message.substring(0, 40)}`;
  }
  
  private checkForAlert(errorKey: string, details: ErrorDetails): void {
    const count = this.errorCount[errorKey] || 0;
    const lastNotification = this.lastNotificationTime[errorKey] || 0;
    const now = Date.now();
    
    // Check if we've crossed the threshold and cooldown period has passed
    if (count >= this.alertThreshold && (now - lastNotification > this.alertCooldown)) {
      this.sendAlert(details, count);
      this.lastNotificationTime[errorKey] = now;
    }
  }
  
  private sendAlert(details: ErrorDetails, count: number): void {
    // In a real implementation, this would send to various alert channels
    // For now, we'll just log it prominently
    logger.warn(`ALERT: Error threshold reached (${count} occurrences)`, {
      error: {
        message: details.message,
        code: details.code,
      },
      severity: details.severity,
      count,
      timestamp: new Date().toISOString(),
    });
    
    // Here you would integrate with notification services like:
    // - Email alerts
    // - Slack/Teams notifications
    // - PagerDuty
    // - SMS alerts
    // etc.
  }
  
  private resetErrorCounts(): void {
    this.errorCount = {};
  }
}

export const errorTracker = ErrorTracker.getInstance();
```

## Log Rotation Configuration

Implement log rotation with a dedicated configuration:

```typescript
// utils/log-manager.ts
import winston from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transport for all logs with rotation
const allLogsTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/all-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

// Create transport for error logs with rotation
const errorLogsTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat,
});

// Create console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    })
  ),
});

// Configure logger with all transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    consoleTransport,
    allLogsTransport,
    errorLogsTransport,
  ],
  exitOnError: false,
});

// Setup log cleanup job
const setupLogCleanup = () => {
  // Run cleanup daily
  setInterval(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Read logs directory
    fs.readdir(logsDir, (err, files) => {
      if (err) {
        logger.error('Error reading logs directory for cleanup', { error: err.message });
        return;
      }
      
      // Check each file
      files.forEach(file => {
        // Skip archived (zipped) files
        if (!file.endsWith('.gz')) return;
        
        const filePath = path.join(logsDir, file);
        
        // Get file stats
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) {
            logger.error('Error getting file stats during log cleanup', {
              error: statErr.message,
              file: filePath,
            });
            return;
          }
          
          // Check if file is older than retention period
          if (stats.mtime < thirtyDaysAgo) {
            // Delete the file
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) {
                logger.error('Error deleting old log file', {
                  error: unlinkErr.message,
                  file: filePath,
                });
              } else {
                logger.info('Deleted old log file', { file });
              }
            });
          }
        });
      });
    });
  }, 24 * 60 * 60 * 1000); // Run daily
};

// Initialize the cleanup job
setupLogCleanup();

export default logger;
```

## Application Monitoring Dashboard

Create a simple monitoring dashboard component:

```typescript
// features/system/MonitoringDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Grid } from '../../components/ui/Layout/Grid';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage/ErrorMessage';
import { MetricChart } from './MetricChart';
import { SystemStatusPanel } from './SystemStatusPanel';
import { useQuery } from '@tanstack/react-query';
import { SystemService } from '../../services/api/system-service';
import styles from './MonitoringDashboard.module.scss';

export const MonitoringDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  
  // Fetch system status
  const { 
    data: systemStatus, 
    isLoading: isStatusLoading, 
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => SystemService.getSystemStatus(),
    refetchInterval: refreshInterval,
  });
  
  // Fetch metrics
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['systemMetrics'],
    queryFn: () => SystemService.getSystemMetrics(),
    refetchInterval: refreshInterval,
  });
  
  const handleManualRefresh = () => {
    refetchStatus();
    refetchMetrics();
  };
  
  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(parseInt(event.target.value));
  };
  
  if (isStatusLoading || isMetricsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" label="Loading system data..." />
      </div>
    );
  }
  
  if (statusError || metricsError) {
    return (
      <ErrorMessage 
        title="Error Loading Monitoring Data"
        message={(statusError || metricsError)?.message || 'An unknown error occurred'}
        actionLabel="Retry"
        onAction={handleManualRefresh}
      />
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>System Monitoring</h1>
        
        <div className={styles.controls}>
          <select 
            value={refreshInterval} 
            onChange={handleIntervalChange}
            className={styles.refreshSelect}
          >
            <option value="5000">Refresh: 5s</option>
            <option value="15000">Refresh: 15s</option>
            <option value="30000">Refresh: 30s</option>
            <option value="60000">Refresh: 1m</option>
            <option value="300000">Refresh: 5m</option>
          </select>
          
          <button 
            onClick={handleManualRefresh}
            className={styles.refreshButton}
          >
            Refresh Now
          </button>
        </div>
      </div>
      
      <Grid container spacing="md">
        <Grid item xs={12}>
          <Card>
            <SystemStatusPanel status={systemStatus} />
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card title="HTTP Requests">
            <MetricChart 
              data={metrics?.requestsPerMinute || []}
              xKey="timestamp"
              yKey="count"
              color="#1a73e8"
              label="Requests/min"
            />
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card title="Average Response Time">
            <MetricChart 
              data={metrics?.responseTime || []}
              xKey="timestamp"
              yKey="avgMs"
              color="#34a853"
              label="Avg. ms"
            />
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card title="Memory Usage">
            <MetricChart 
              data={metrics?.memoryUsage || []}
              xKey="timestamp"
              yKey="usedMB"
              color="#fbbc04"
              label="Used MB"
              max={metrics?.memoryUsage[0]?.totalMB}
            />
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card title="Document Processing">
            <MetricChart 
              data={metrics?.documentsProcessed || []}
              xKey="timestamp"
              yKey="count"
              color="#ea4335"
              label="Documents"
            />
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};
```

## Monitoring Integration with Prometheus

Create a Docker Compose extension for monitoring:

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: mcp-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - mcp-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: mcp-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "127.0.0.1:3003:3000"
    networks:
      - mcp-network
    restart: unless-stopped
    depends_on:
      - prometheus

volumes:
  prometheus-data:
    name: mcp-prometheus-data
  grafana-data:
    name: mcp-grafana-data

networks:
  mcp-network:
    external: true
```

## Prometheus Configuration

Create a basic Prometheus configuration:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093

rule_files:
  # - "alerts.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['backend:3001']

  - job_name: 'caddy'
    static_configs:
      - targets: ['caddy:2019']
```

## Grafana Dashboard

Create a sample Grafana dashboard:

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.2.0",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "rate(http_requests_total[1m])",
          "interval": "",
          "legendFormat": "{{method}} {{path}} ({{status}})",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Request Rate",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": "Requests / sec",
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 4,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.2.0",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))",
          "interval": "",
          "legendFormat": "95th percentile",
          "refId": "A"
        },
        {
          "expr": "histogram_quantile(0.5, rate(http_request_duration_ms_bucket[5m]))",
          "interval": "",
          "legendFormat": "50th percentile",
          "refId": "B"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "HTTP Request Duration",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "ms",
          "label": "Duration",
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 8
      },
      "hiddenSeries": false,
      "id": 6,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.2.0",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "process_memory_usage_bytes",
          "interval": "",
          "legendFormat": "Memory Used",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "Memory Usage",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "bytes",
          "label": "Memory",
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 8
      },
      "hiddenSeries": false,
      "id": 8,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.2.0",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "documents_processed_total",
          "interval": "",
          "legendFormat": "Documents Processed",
          "refId": "A"
        },
        {
          "expr": "documents_processing_errors_total",
          "interval": "",
          "legendFormat": "Processing Errors",
          "refId": "B"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "Document Processing",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": "Count",
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "10s",
  "schemaVersion": 26,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "timepicker": {
    "refresh_intervals": [
      "5s",
      "10s",
      "30s",
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "2h",
      "1d"
    ]
  },
  "timezone": "",
  "title": "MCP Dashboard",
  "uid": "mcp-main",
  "version": 1
}
```
