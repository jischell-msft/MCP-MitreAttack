/**
 * Configuration
 * 
 * This directory will contain configuration settings and environment variable handling.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Server configuration
export const SERVER_CONFIG = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
};

// Database configuration
export const DB_CONFIG = {
    path: process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'mcp.sqlite3'),
};

// MITRE ATT&CK configuration
export const MITRE_CONFIG = {
    updateInterval: parseInt(process.env.MITRE_UPDATE_INTERVAL || '86400000', 10), // Default: 24 hours
    cacheDir: process.env.MITRE_CACHE_DIR || path.join(process.cwd(), 'cache', 'mitre'),
    enterpriseUrl: 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json',
};

// Azure OpenAI configuration
export const AZURE_OPENAI_CONFIG = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || '',
    maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || '8000', 10),
    temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || '0.0'),
    timeout: parseInt(process.env.AZURE_OPENAI_TIMEOUT || '60000', 10),
    retryCount: parseInt(process.env.AZURE_OPENAI_RETRY_COUNT || '3', 10),
};

// CORS configuration
export const CORS_CONFIG = {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
