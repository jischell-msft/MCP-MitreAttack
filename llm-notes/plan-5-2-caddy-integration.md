# Caddy Integration

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on configuring Caddy as a reverse proxy for our application, setting up automatic HTTPS, implementing security headers, and optimizing for performance.

## Requirements
- Install and configure Caddy as a reverse proxy
- Set up automatic HTTPS with certificate management
- Configure security headers for enhanced protection
- Implement caching for static assets
- Set up logging and monitoring

## Tasks

### 5.2.1. Install and configure Caddy
- Set up Caddy container
- Configure basic routing
- Implement volume mounts
- Create network connectivity
- Test basic functionality

### 5.2.2. Create Caddyfile for routing
- Implement domain configuration
- Set up proxy directives
- Configure header handling
- Implement path-based routing
- Create error handling

### 5.2.3. Set up HTTPS with automatic certificates
- Configure automatic certificate provisioning
- Set up certificate storage
- Implement renewal process
- Configure HTTPS redirects
- Test certificate issuance

### 5.2.4. Configure security headers
- Implement Content-Security-Policy
- Add X-Frame-Options header
- Configure X-Content-Type-Options
- Set up Referrer-Policy
- Implement HSTS

### 5.2.5. Implement caching for static assets
- Configure cache control headers
- Set up browser caching rules
- Implement compression
- Configure file extension matching
- Optimize cache durations

### 5.2.6. Set up request logging
- Configure structured logging
- Implement log rotation
- Create access logging format
- Set up error logging
- Configure log storage

### 5.2.7. Configure compression
- Set up Gzip compression
- Configure Brotli compression
- Implement MIME type filtering
- Set compression levels
- Configure minimum sizes

### 5.2.8. Test production setup with Caddy
- Verify routing functionality
- Test HTTPS certificate issuance
- Validate security headers
- Check caching behavior
- Test compression effectiveness

## Implementation Guidance

The implementation should:
- Follow Caddy best practices for configuration
- Implement secure defaults for all settings
- Optimize for both security and performance
- Ensure proper logging for monitoring and debugging
- Create a maintainable and extensible setup

Start by installing and configuring Caddy, then create the Caddyfile with routing rules. Next, set up HTTPS with automatic certificates and configure security headers. Finally, implement caching and compression, and set up request logging.

## Caddy Installation in Docker Compose

Add Caddy service to docker-compose.yml:

```yaml
services:
  # Other services...

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
    environment:
      - DOMAIN=${DOMAIN:-localhost}
    depends_on:
      - backend
      - frontend
    networks:
      - mcp-network

volumes:
  # Other volumes...
  caddy-data:
    name: mcp-caddy-data
  caddy-config:
    name: mcp-caddy-config
```

## Basic Caddyfile

Create the initial Caddyfile:

```
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
    # Reverse proxy for frontend
    handle {
        reverse_proxy frontend:80 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Handle /api requests
    handle_path /api/* {
        reverse_proxy backend:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Error handling
    handle_errors {
        respond "{http.error.status_code} {http.error.status_text}" {http.error.status_code}
    }
}
```

## Enhanced Caddyfile with Security Headers

Enhance the Caddyfile with security headers:

```
# Caddyfile with Security Headers
{
    # Global options
    admin off
    log {
        format json
    }
    # Global settings
    servers {
        protocol {
            # Strict TLS settings
            tls_min_version 1.2
            tls_ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
        }
    }
}

# Domain configuration
{$DOMAIN:localhost} {
    # Reverse proxy for frontend
    handle {
        reverse_proxy frontend:80 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Handle /api requests
    handle_path /api/* {
        reverse_proxy backend:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Compression
    encode gzip zstd

    # Security headers
    header {
        # Prevent MIME type sniffing
        X-Content-Type-Options "nosniff"
        
        # Prevent embedding in frames
        X-Frame-Options "DENY"
        
        # Enable XSS protection
        X-XSS-Protection "1; mode=block"
        
        # Control referrer information
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Content Security Policy
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
        
        # HTTP Strict Transport Security
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Permissions Policy
        Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        
        # Remove Server header
        -Server
    }

    # Cache static assets by file type
    @static {
        path *.css *.js *.svg *.jpg *.jpeg *.png *.gif *.ico *.woff *.woff2 *.ttf *.eot
    }
    header @static {
        # Cache for 30 days
        Cache-Control "public, max-age=2592000"
        # Remove ETag to improve cache performance
        -ETag
    }
    
    # Cache JS and CSS for longer periods (they contain hashes for cache busting)
    @assets {
        path *.*.js *.*.css
    }
    header @assets {
        # Cache for 1 year
        Cache-Control "public, max-age=31536000, immutable"
    }

    # No cache for HTML
    @html {
        path *.html /
    }
    header @html {
        Cache-Control "no-cache, no-store, must-revalidate"
    }

    # Rate limiting for API
    @api {
        path /api/*
    }
    handle @api {
        rate_limit {
            zone api_limit {
                key {remote}
                events 100
                window 60s
            }
        }
    }

    # Error handling with custom pages
    handle_errors {
        @404 {
            expression {http.error.status_code} == 404
        }
        handle @404 {
            rewrite * /404.html
            reverse_proxy frontend:80
        }

        @5xx {
            expression {http.error.status_code} >= 500
        }
        handle @5xx {
            rewrite * /error.html
            reverse_proxy frontend:80
        }

        # Default error handler
        handle {
            respond "{http.error.status_code} {http.error.status_text}" {http.error.status_code}
        }
    }
}
```

## Custom 404 Page

Create a custom 404 page for the frontend:

```html
<!-- public/404.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - MCP Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: #f8f9fa;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            padding: 40px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: #ea4335;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }
        .btn {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #155abc;
        }
        .error-code {
            font-size: 1rem;
            color: #5f6368;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" class="btn">Go to Homepage</a>
        <div class="error-code">Error Code: 404</div>
    </div>
</body>
</html>
```

## Custom Error Page

Create a custom error page for server errors:

```html
<!-- public/error.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Error - MCP Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: #f8f9fa;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            padding: 40px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: #ea4335;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }
        .btn {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #155abc;
        }
        .error-code {
            font-size: 1rem;
            color: #5f6368;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Server Error</h1>
        <p>We're experiencing some technical difficulties. Please try again later.</p>
        <a href="/" class="btn">Go to Homepage</a>
        <div class="error-code">Error Code: 500</div>
    </div>
</body>
</html>
```

## Health Check Endpoint

Implement health check endpoints for both services:

```typescript
// backend/src/routes/health.ts
import express, { Request, Response } from 'express';
import { getDatabase } from '../db/database';

const router = express.Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const db = await getDatabase();
    await db.get('SELECT 1');
    
    // Return health status
    return res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
    });
  } catch (error) {
    // Database connection failed
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

```html
<!-- frontend/public/health -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Check</title>
</head>
<body>
    OK
</body>
</html>
```

## Caddy Docker Volumes

Configure the Docker volumes for Caddy:

```yaml
volumes:
  caddy-data:
    name: mcp-caddy-data
    driver: local
    driver_opts:
      type: none
      device: /path/to/persistent/storage/caddy/data
      o: bind
  caddy-config:
    name: mcp-caddy-config
    driver: local
    driver_opts:
      type: none
      device: /path/to/persistent/storage/caddy/config
      o: bind
```

## Caddy Testing Script

Create a testing script for validating the Caddy configuration:

```bash
#!/bin/bash
# caddy-test.sh - Script to test Caddy configuration

echo "Testing Caddy Configuration..."

# Variables
DOMAIN=${1:-localhost}
PROTOCOL=${2:-https}
BASE_URL="${PROTOCOL}://${DOMAIN}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "curl is required but not installed. Please install curl."
    exit 1
fi

# Function to make a request and check response
check_endpoint() {
    local url="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -n "Testing ${description}... "
    
    # Make the request
    response=$(curl -s -o /dev/null -w "%{http_code}" "${url}")
    
    # Check the response
    if [ "$response" = "$expected_status" ]; then
        echo "OK (Status: ${response})"
        return 0
    else
        echo "FAIL (Expected: ${expected_status}, Got: ${response})"
        return 1
    fi
}

# Function to check security headers
check_security_headers() {
    local url="$1"
    
    echo "Checking security headers for ${url}..."
    
    # Make the request and get headers
    headers=$(curl -s -I "${url}")
    
    # Check for required security headers
    for header in "X-Content-Type-Options" "X-Frame-Options" "Strict-Transport-Security" "Content-Security-Policy" "Referrer-Policy"; do
        if echo "$headers" | grep -q "$header"; then
            echo "  ${header}: OK"
        else
            echo "  ${header}: MISSING"
        fi
    done
}

# Function to check SSL configuration
check_ssl() {
    local domain="$1"
    
    echo "Checking SSL configuration for ${domain}..."
    
    # Check if openssl is installed
    if ! command -v openssl &> /dev/null; then
        echo "  openssl is required for SSL testing but not installed."
        return
    fi
    
    # Check TLS version
    echo "  Testing TLS versions:"
    for version in "1.0" "1.1" "1.2" "1.3"; do
        if openssl s_client -connect "${domain}:443" -tls${version} -quiet < /dev/null 2>/dev/null; then
            echo "    TLS ${version}: Supported"
        else
            echo "    TLS ${version}: Not supported"
        fi
    done
    
    # Check certificate validity
    echo "  Certificate information:"
    cert_info=$(openssl s_client -connect "${domain}:443" -showcerts </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer -subject)
    echo "$cert_info" | sed 's/^/    /'
}

# Test basic endpoints
check_endpoint "${BASE_URL}" "200" "Homepage"
check_endpoint "${BASE_URL}/api/health" "200" "API Health endpoint"
check_endpoint "${BASE_URL}/nonexistent-page" "404" "404 handling"

# Test security headers
check_security_headers "${BASE_URL}"

# Test SSL if using HTTPS
if [ "$PROTOCOL" = "https" ]; then
    check_ssl "$DOMAIN"
fi

echo "Testing completed."
```

## Caddy Monitoring Setup

Create a simple monitoring setup for Caddy:

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  caddy-exporter:
    image: caddy/caddy-exporter:latest
    container_name: mcp-caddy-exporter
    restart: unless-stopped
    ports:
      - "127.0.0.1:9989:9989"
    environment:
      - CADDY_ADMIN_URL=http://caddy:2019
    networks:
      - mcp-network

  prometheus:
    image: prom/prometheus:latest
    container_name: mcp-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - mcp-network

  grafana:
    image: grafana/grafana:latest
    container_name: mcp-grafana
    restart: unless-stopped
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - mcp-network

volumes:
  prometheus-data:
    name: mcp-prometheus-data
  grafana-data:
    name: mcp-grafana-data

networks:
  mcp-network:
    external: true
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'caddy'
    static_configs:
      - targets: ['caddy-exporter:9989']
```
self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
        
        # HTTP Strict Transport Security
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Remove Server header
        -Server
    }

    # Cache static assets
    @static {
        path *.css *.js *.svg *.jpg *.jpeg *.png *.gif *.ico *.woff *.woff2 *.ttf *.eot
    }
    header @static {
        # Cache for 30 days
        Cache-Control "public, max-age=2592000"
        # Remove ETag to improve cache performance
        -ETag
    }

    # No cache for HTML
    @html {
        path *.html /
    }
    header @html {
        Cache-Control "no-cache, no-store, must-revalidate"
    }

    # Error handling
    handle_errors {
        respond "{http.error.status_code} {http.error.status_text}" {http.error.status_code}
    }
}
```

## Advanced Caddyfile with Logging

Enhance the configuration with structured logging:

```
# Caddyfile with Advanced Logging
{
    # Global options
    admin off
    
    # Structured logging configuration
    log {
        format json
        output file /var/log/caddy/access.log {
            roll_size 10MB
            roll_keep 5
            roll_keep_for 720h
        }
        level INFO
    }
    
    # Global settings
    servers {
        protocol {
            # Strict TLS settings
            tls_min_version 1.2
            tls_ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
        }
    }
}

# Domain configuration
{$DOMAIN:localhost} {
    # Access logging
    log {
        output file /var/log/caddy/access.{$DOMAIN}.log {
            roll_size 10MB
            roll_keep 5
            roll_keep_for 720h
        }
        format json {
            time_format iso8601
            time_local
        }
    }

    # Reverse proxy for frontend
    handle {
        reverse_proxy frontend:80 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # Health checks
            health_path /health
            health_interval 30s
            health_timeout 10s
        }
    }

    # Handle /api requests
    handle_path /api/* {
        reverse_proxy backend:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # Health checks
            health_path /api/health
            health_interval 30s
            health_timeout 10s
        }
    }

    # Compression
    encode gzip zstd {
        minimum_length 1024
        match {
            header Content-Type text/*
            header Content-Type application/json
            header Content-Type application/javascript
            header Content-Type application/xml
            header Content-Type application/wasm
            header Content-Type image/svg+xml
        }
    }

    # Security headers
    header {
        # Prevent MIME type sniffing
        X-Content-Type-Options "nosniff"
        
        # Prevent embedding in frames
        X-Frame-Options "DENY"
        
        # Enable XSS protection
        X-XSS-Protection "1; mode=block"
        
        # Control referrer information
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Content Security Policy
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
        
        # HTTP Strict Transport Security
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Remove Server header
        -Server
    }

    # Cache static assets
    @static {
        path *.css *.js *.svg *.jpg *.jpeg *.png *.gif *.ico *.woff *.woff2 *.ttf *.eot
    }
    header @static {
        # Cache for 30 days
        Cache-Control "public, max-age=2592000"
        # Remove ETag to improve cache performance
        -ETag
    }

    # No cache for HTML
    @html {
        path *.html /
    }
    header @html {
        Cache-Control "no-cache, no-store, must-revalidate"
    }

    # Rate limiting for API
    @api {
        path /api/*
    }
    handle @api {
        rate_limit {
            zone api_limit {
                key {remote}
                events 100
                window 60s
            }
        }
    }

    # Error handling with custom pages
    handle_errors {
        @404 {
            expression {http.error.status_code} == 404
        }
        handle @404 {
            rewrite * /404.html
            reverse_proxy frontend:80
        }

        @5xx {
            expression {http.error.status_code} >= 500
        }
        handle @5xx {
            rewrite * /error.html
            reverse_proxy frontend:80
        }

        # Default error handler
        handle {
            respond "{http.error.status_code} {http.error.status_text}" {http.error.status_code}
        }
    }
}
```

## Production-Ready Caddyfile

Final production-ready configuration:

```
# Production Caddyfile
{
    # Global options
    admin off
    
    # Structured logging configuration
    log {
        format json
        output file /var/log/caddy/access.log {
            roll_size 10MB
            roll_keep 5
            roll_keep_for 720h
        }
    }
    
    # Global settings
    servers {
        protocol {
            # Strict TLS settings
            tls_min_version 1.2
            tls_ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
        }
        protocols h2 h1
    }
    
    # Email for Let's Encrypt
    email {$EMAIL}
}

# HTTP to HTTPS redirect
http://{$DOMAIN:localhost} {
    redir https://{host}{uri} permanent
}

# Main site configuration
https://{$DOMAIN:localhost} {
    # TLS configuration
    tls {
        # Use Let's Encrypt
        issuer acme
        # Enable OCSP stapling
        ocsp_stapling 168h
    }
    
    # Access logging
    log {
        output file /var/log/caddy/{$DOMAIN}.access.log {
            roll_size 10MB
            roll_keep 5
            roll_keep_for 720h
        }
        format json {
            time_format iso8601
            time_local
        }
    }

    # API routing
    handle_path /api/* {
        reverse_proxy backend:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # Health checks
            health_path /api/health
            health_interval 30s
            health_timeout 10s
            
            # Load balancing (for future scaling)
            lb_policy round_robin
            lb_try_duration 30s
            
            # Timeouts
            timeout 60s
            
            # Automatic failover
            fail_duration 10s
            max_fails 3
        }
    }

    # Frontend routing (default)
    handle {
        reverse_proxy frontend:80 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # Health checks
            health_path /health
            health_interval 30s
            health_timeout 10s
            
            # Load balancing (for future scaling)
            lb_policy round_robin
            
            # Timeouts
            timeout 30s
        }
    }

    # Compression
    encode gzip zstd {
        minimum_length 1024
        match {
            header Content-Type text/*
            header Content-Type application/json
            header Content-Type application/javascript
            header Content-Type application/xml
            header Content-Type application/wasm
            header Content-Type image/svg+xml
        }
        level 6
    }

    # Security headers
    header {
        # Prevent MIME type sniffing
        X-Content-Type-Options "nosniff"
        
        # Prevent embedding in frames
        X-Frame-Options "DENY"
        
        # Enable XSS protection
        X-XSS-Protection "1; mode=block"
        
        # Control referrer information
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Content Security Policy
        Content-Security-Policy "default-src '