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
