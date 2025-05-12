# MCP Server MITRE Integration

A multi-agent system that fetches, processes, and evaluates documents against the MITRE ATT&CK framework using Azure OpenAI for analysis.

## Architecture

The system consists of five specialized agents:

1. **FetchAgent**: Retrieves the latest MITRE ATT&CK data from GitHub
2. **ParseAgent**: Processes the MITRE data into a usable format
3. **DocIngestAgent**: Extracts text from URLs and documents
4. **EvalAgent**: Analyzes documents against MITRE techniques using Azure OpenAI
5. **ReportAgent**: Generates and stores analysis reports

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (optional)
- Azure OpenAI API access (for enhanced evaluation)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mcp-server-mitre-integration.git
   cd mcp-server-mitre-integration
   ```

2. Install dependencies:
   ```
   cd backend
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Using Docker

1. Build and start the containers:
   ```
   docker-compose up -d
   ```

2. View logs:
   ```
   docker-compose logs -f
   ```

## API Endpoints

- `GET /health` - System health status
- `POST /api/analyze` - Submit a URL or document for analysis
- `GET /api/analyze/:jobId` - Check analysis status
- `GET /api/reports` - List all reports
- `GET /api/reports/:id` - Get specific report details
- `GET /api/reports/:id/export` - Export report in different formats

## License

MIT
