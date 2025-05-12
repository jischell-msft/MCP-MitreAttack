# Docker Compose Setup

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on setting up Docker Compose for containerized deployment of both the backend and frontend applications, configuring volumes for persistent data, and managing environment variables.

## Requirements
- Create production-ready Dockerfiles for backend and frontend
- Set up Docker Compose for multi-container orchestration
- Configure persistent storage for SQLite database
- Implement environment variable management
- Ensure proper container health checks and restart policies

## Tasks

### 5.1.1. Create production Dockerfile for backend
- Create Node.js Dockerfile for backend
- Implement multi-stage build process
- Set up proper permissions and security
- Configure Node.js environment
- Add health check endpoint

### 5.1.2. Create production Dockerfile for frontend
- Create Dockerfile for React frontend (static build)
- Frontend assets served by a simple static server, proxied by Caddy
- Caching handled by the static server (`serve`) or configurable in Caddy
- Create lightweight production image for static assets

### 5.1.3. Set up multi-stage builds for optimization
- Implement build stage for dependencies
- Create separate build stage for application
- Configure production stage for runtime
- Optimize Docker layers for caching
- Minimize final image size

### 5.1.4. Configure volume for SQLite database
- Create named volume for database
- Implement proper permissions
- Set up backup directory
- Configure volume mounts
- Document volume management

### 5.1.5. Set up environment variable management
- Create environment variable files
- Implement secure handling of secrets
- Configure application settings
- Document environment variables
- Implement validation for required variables

### 5.1.6. Implement container health checks
- Create health check endpoints
- Configure Docker health checks
- Implement timeout and retry settings
- Create monitoring for container health
- Document health check behavior

### 5.1.7. Create docker-compose.yml
- Define all required services
- Configure network settings
- Set up environment and volumes
- Implement dependency ordering
- Configure restart policies

### 5.1.8. Test deployment with Docker Compose
- Verify backend functionality
- Test frontend serving
- Validate database persistence
- Check network connectivity
- Test environment variable loading

## Implementation Guidance

The implementation should:
- Follow Docker best practices for security and efficiency
- Use multi-stage builds to optimize image size
- Implement proper health checks and restart policies
- Ensure data persistence across container restarts
- Document all configuration options

Start by creating the Dockerfiles for the backend and frontend, then implement the multi-stage builds and configure the volumes. Next, set up environment variable management and container health checks. Finally, create the docker-compose.yml file and test the deployment.

## Backend Dockerfile

Create an optimized Dockerfile for the backend:

```dockerfile
# Backend Dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ 

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Stage 3: Runtime
FROM node:18-alpine AS runtime
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set ownership and permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

# Copy built app and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./

# Create directory for database and temp uploads
RUN mkdir -p /app/data/db /app/data/uploads /app/data/backups && \
    chown -R nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

## Frontend Dockerfile

Create a Dockerfile for the frontend. This Dockerfile will build the static assets and use the `serve` package to serve them. Caddy will then reverse proxy to this service.

```dockerfile
# Frontend Dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
# VITE_API_BASE_URL is set to /api so frontend requests go to Caddy's /api endpoint
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 3: Runtime with simple static server
FROM node:18-alpine AS runtime
WORKDIR /app

# Install 'serve' to serve static files
RUN npm install -g serve

# Copy static assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 80 for the static server (for Caddy to connect to)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/index.html || exit 1

# Start the static server
# 'serve -s dist' serves the 'dist' folder, '-l 80' listens on port 80
CMD ["serve", "-s", "dist", "-l", "80"]
```

## Docker Compose File

Create the docker-compose.yml file:

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mcp-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_PATH=/app/data/db/mcp.db
      - UPLOADS_DIR=/app/data/uploads
      - AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}
      - AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
      - AZURE_OPENAI_DEPLOYMENT_NAME=${AZURE_OPENAI_DEPLOYMENT_NAME}
      - AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION}
      - USE_AZURE_OPENAI=${USE_AZURE_OPENAI:-true}
    volumes:
      - mcp-data:/app/data
    ports:
      - "127.0.0.1:3001:3001"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - mcp-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mcp-frontend
    restart: unless-stopped
    depends_on:
      - backend
    # No direct host port mapping needed for frontend; Caddy handles external access
    # ports:
    #  - "127.0.0.1:8080:80" 
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/index.html"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - mcp-network

  caddy:
    image: caddy:2-alpine
    container_name: mcp-caddy
    restart: unless-stopped
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    networks:
      - mcp-network

volumes:
  mcp-data:
    name: mcp-data
  caddy-data:
    name: mcp-caddy-data
  caddy-config:
    name: mcp-caddy-config

networks:
  mcp-network:
    name: mcp-network
```

## Caddyfile

Create the Caddyfile for reverse proxy:

```caddy
# Caddyfile
{
    # Global options
    admin off
    log {
        format json
    }
}

# Domain configuration
{$DOMAIN:localhost} {
    # API proxy to backend
    handle_path /api/* {
        reverse_proxy backend:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Reverse proxy for frontend (serves static assets and handles SPA routing)
    handle {
        reverse_proxy frontend:80 { # frontend service serves on port 80 internally
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Compression
    encode gzip

    # Security headers
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' {$DOMAIN:localhost}/api;"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }

    # Error handling
    handle_errors {
        respond "{http.error.status_code} {http.error.status_text}" {http.error.status_code}
    }
}
```

## Environment Variables

Create the environment variables file:

```env
# .env.example (Copy to .env)

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=your-gpt-deployment
AZURE_OPENAI_API_VERSION=2023-05-15
USE_AZURE_OPENAI=true

# Optional: Domain for Caddy (default: localhost)
DOMAIN=example.com
```

## Deployment Instructions

Create a deployment guide:

```markdown
# Deployment Guide

## Prerequisites
- Docker Engine 20.10.0+
- Docker Compose 2.0.0+
- About 2GB of RAM for the containers
- At least 5GB of disk space

## Setup
1. Clone the repository
2. Copy `.env.example` to `.env`
3. Edit `.env` to add your Azure OpenAI API credentials and optionally set your DOMAIN.
4. Build and start the containers:
   ```
   docker-compose up -d
   ```

## Accessing the Application
The application will be accessible via Caddy.
- Web interface: `http://localhost` (or `http://your-domain.com` or `https://your-domain.com` if Caddy is configured for HTTPS with a public domain)
- API: `http://localhost/api/` (or `http://your-domain.com/api/` or `https://your-domain.com/api/`)

## Data Persistence
All data is stored in Docker volumes:
- `mcp-data`: Contains the SQLite database and uploaded files
- `caddy-data` and `caddy-config`: Contains Caddy certificates and configuration

## Backup
To backup the database:
```
docker exec mcp-backend sh -c 'sqlite3 /app/data/db/mcp.db .dump > /app/data/backups/backup-$(date +%Y%m%d).sql'
```

## Logs
To view logs:
```
docker-compose logs -f
```

## Updating
To update to a new version:
```
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting
- Check container status: `docker-compose ps`
- View detailed logs: `docker-compose logs -f [service]`
- Restart a service: `docker-compose restart [service]`
- Reset everything: `docker-compose down -v && docker-compose up -d`
```
