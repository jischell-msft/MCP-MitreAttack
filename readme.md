# MCP MITRE ATT&CK Integration

Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework using Azure OpenAI for analysis.

## Overview

This project provides a platform for analyzing documents and URLs against the MITRE ATT&CK framework to identify potential security threats and techniques. It uses a multi-agent architecture with optional Azure OpenAI integration for advanced analysis. The system is designed for easy deployment with Docker and includes a modern web dashboard.

## Features

- Document and URL submission for MITRE ATT&CK analysis
- Support for PDF, DOCX, TXT, HTML, Markdown
- Multiple output formats for analysis reports (JSON, HTML, CSV, PDF)
- RESTful API for integration with other systems
- Dashboard for submitting, viewing, and managing analysis reports
- Local caching and scheduled update of MITRE ATT&CK data
- Progress tracking and job status polling
- Filtering, sorting, and export of reports

## Project Structure

```
mcp-mitre-attack/
├── backend/                  # Node.js, Express, TypeScript API
│   ├── src/
│   │   ├── agents/           # Agent implementations
│   │   ├── api/              # API routes
│   │   ├── db/               # Database logic (SQLite)
│   │   ├── models/           # Data models
│   │   ├── services/         # Business logic
│   │   ├── tasks/            # Task orchestration (Taskt)
│   │   ├── utils/            # Utilities
│   │   └── config/           # Configuration
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React, TypeScript, Vite UI
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml        # Docker Compose config
├── Caddyfile                 # Caddy reverse proxy config
├── .env.example              # Backend environment variables example
├── .gitignore
└── README.md
```

## Technical Stack

- **Backend**: Node.js (18+), Express, TypeScript, SQLite, Taskt
- **Frontend**: React (18+), TypeScript, Vite, React Query, CSS Modules/SCSS
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Caddy (HTTPS, routing)
- **Document Processing**: pdf-parse, mammoth, cheerio
- **Text Analysis**: natural, fuse.js

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (recommended for deployment)
- Azure OpenAI API access (optional, for enhanced evaluation)

### Backend Setup

```sh
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration (DB_PATH, Azure OpenAI keys, etc.)
npm run dev
```
Backend runs on `http://localhost:3001` by default.

### Frontend Setup

```sh
cd frontend
npm install
# Optionally set VITE_API_URL in frontend/.env (default: http://localhost:3001)
npm run dev
```
Frontend runs on `http://localhost:3000` by default.

### Configuration

- **Backend**: Configure via `backend/.env` (see `.env.example`). Key variables:
  - `PORT`, `DB_PATH`, `AZURE_OPENAI_API_KEY`, `MITRE_DATA_URL`, etc.
- **Frontend**: Set `VITE_API_URL` in `frontend/.env` if backend is not on default port.

## Deployment with Docker & Caddy

1. **Configure environment**:
   - Copy and edit `backend/.env.example` to `backend/.env`.
   - Update `Caddyfile` with your domain and backend service name if needed.

2. **Build and start all services**:
   ```sh
   docker-compose build
   docker-compose up -d
   ```

3. **Access the app**:
   - Web UI: `https://yourdomain.com`
   - Health check: `https://yourdomain.com/health`

4. **Logs and maintenance**:
   - View logs: `docker-compose logs -f`
   - Backup DB: `docker-compose exec backend sh -c "sqlite3 /app/data/mcp_database.sqlite .dump > /app/data/backup-$(date +%Y%m%d%H%M%S).sql"`

## Web Interface

- **Submit**: Analyze a URL or upload a document.
- **Track**: See progress and status of analyses.
- **Reports**: Browse, filter, and export historical reports.
- **Detail**: View matched MITRE techniques, context, and confidence.
- **Export**: Download reports as JSON, CSV, PDF, or HTML.
- **System**: View system and MITRE data status.

## API Endpoints

- `GET /health` - System health status
- `GET /health/details` - Detailed health info
- `POST /api/analyze/url` - Submit a URL for analysis
- `POST /api/analyze/file` - Upload a document for analysis
- `GET /api/analyze/status/:jobId` - Check analysis status
- `GET /api/reports` - List all reports (supports filters, pagination)
- `GET /api/reports/:id` - Get specific report details
- `POST /api/reports/export` - Export report (JSON, CSV, HTML, PDF)
- `DELETE /api/reports/:id` - Delete a report
- `GET /api/mitre/status` - MITRE data status
- `POST /api/mitre/update` - Trigger MITRE data update

## License

MIT
