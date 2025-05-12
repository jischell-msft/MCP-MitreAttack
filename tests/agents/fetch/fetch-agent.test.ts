import { FetchAgent } from '../../../src/agents/fetch';
import { MitreApiClient } from '../../../src/agents/fetch/mitre-api-client';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock the API client
jest.mock('../../../src/agents/fetch/mitre-api-client');

describe('FetchAgent', () => {
    let fetchAgent: FetchAgent;
    let tempDir: string;

    // Create a unique temp directory for each test run
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mitre-test-'));

        fetchAgent = new FetchAgent({
            sourceUrl: 'https://example.com/mitre.json',
            cacheDir: tempDir,
            updateInterval: 3600000, // 1 hour
            maxRetries: 3,
            requestTimeout: 30000
        });

        // Reset mocks
        jest.resetAllMocks();
    });

    // Clean up temp directory after tests
    afterEach(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore errors during cleanup
        }
    });

    it('should initialize correctly', async () => {
        await fetchAgent.initialize();
        expect(fs.existsSync(tempDir)).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'archive'))).toBe(true);
    });

    it('should return agent name and version', async () => {
        expect(fetchAgent.getName()).toBe('FetchAgent');
        expect(fetchAgent.getVersion()).toBe('1.0.0');
    });

    it('should fetch data when cache is empty', async () => {
        // Mock API client response
        const mockResponse = {
            data: {
                objects: [
                    { type: 'x-mitre-collection', x_mitre_version: '13.1' }
                ]
            },
            headers: {
                etag: '"abc123"',
                'last-modified': 'Wed, 01 Jan 2023 00:00:00 GMT'
            },
            modified: true
        };

        (MitreApiClient.prototype.fetchData as jest.Mock).mockResolvedValue(mockResponse);

        // Initialize and fetch
        await fetchAgent.initialize();
        const result = await fetchAgent.fetch();

        // Verify results
        expect(result.version).toBe('13.1');
        expect(result.source).toBe('https://example.com/mitre.json');
        expect(result.changeDetected).toBe(true);

        // Verify data was cached
        expect(fs.existsSync(path.join(tempDir, 'latest.json'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'metadata.json'))).toBe(true);
    });

    it('should use cached data when available and not modified', async () => {
        // Create mock cached data
        const cachedData = {
            objects: [
                { type: 'x-mitre-collection', x_mitre_version: '13.0' }
            ]
        };

        const cachedMetadata = {
            version: '13.0',
            timestamp: new Date().toISOString(),
            source: 'https://example.com/mitre.json',
            etag: '"abc123"',
            lastModified: 'Wed, 01 Jan 2023 00:00:00 GMT'
        };

        // Write cached data to disk
        fs.writeFileSync(path.join(tempDir, 'latest.json'), JSON.stringify(cachedData));
        fs.writeFileSync(path.join(tempDir, 'metadata.json'), JSON.stringify(cachedMetadata));

        // Mock API client to return not modified
        (MitreApiClient.prototype.fetchData as jest.Mock).mockResolvedValue({
            data: null,
            headers: {},
            modified: false
        });

        // Initialize and fetch
        await fetchAgent.initialize();
        const result = await fetchAgent.fetch();

        // Verify cached data is returned
        expect(result.version).toBe('13.0');
        expect(result.changeDetected).toBe(false);
        expect(result.mitreData).toEqual(cachedData);
    });

    it('should force update when specified', async () => {
        // Create mock cached data
        const cachedData = {
            objects: [
                { type: 'x-mitre-collection', x_mitre_version: '13.0' }
            ]
        };

        const cachedMetadata = {
            version: '13.0',
            timestamp: new Date().toISOString(),
            source: 'https://example.com/mitre.json',
            etag: '"abc123"',
            lastModified: 'Wed, 01 Jan 2023 00:00:00 GMT'
        };

        // Write cached data to disk
        fs.writeFileSync(path.join(tempDir, 'latest.json'), JSON.stringify(cachedData));
        fs.writeFileSync(path.join(tempDir, 'metadata.json'), JSON.stringify(cachedMetadata));

        // Mock API client response with new data
        const mockResponse = {
            data: {
                objects: [
                    { type: 'x-mitre-collection', x_mitre_version: '13.1' }
                ]
            },
            headers: {
                etag: '"def456"',
                'last-modified': 'Thu, 02 Jan 2023 00:00:00 GMT'
            },
            modified: true
        };

        (MitreApiClient.prototype.fetchData as jest.Mock).mockResolvedValue(mockResponse);

        // Initialize and fetch with force update
        await fetchAgent.initialize();
        const result = await fetchAgent.fetch(true);

        // Verify new data is returned
        expect(result.version).toBe('13.1');
        expect(result.changeDetected).toBe(true);
    });
});
