import { DocIngestAgent } from '../../../src/agents/DocIngestAgent';
import { describe, it, before, afterEach } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DocIngestAgent', () => {
    let docIngestAgent: DocIngestAgent;
    let tempDir: string;

    before(async () => {
        // Create a temporary directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-ingest-tests-'));

        // Create a DocIngestAgent instance with test configuration
        docIngestAgent = new DocIngestAgent({
            maxDocumentSize: 1024 * 1024, // 1MB for tests
            maxChunkSize: 1000,
            chunkOverlap: 100,
            userAgent: 'DocIngestAgent-Test/1.0',
            timeout: 5000,
            retries: 1,
            followRedirects: true
        });

        await docIngestAgent.initialize();
    });

    afterEach(() => {
        // Clean up any test files after each test
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
            fs.unlinkSync(path.join(tempDir, file));
        }
    });

    describe('#initialize', () => {
        it('should initialize successfully', async () => {
            const agent = new DocIngestAgent();
            await agent.initialize();
            // If no error is thrown, initialization was successful
        });
    });

    describe('#normalizeText', () => {
        it('should normalize whitespace', () => {
            const input = 'This    has    multiple    spaces';
            const expected = 'This has multiple spaces';
            const result = docIngestAgent.normalizeText(input);
            expect(result).to.equal(expected);
        });

        it('should normalize line breaks', () => {
            const input = 'Line 1\r\nLine 2\rLine 3\n\n\n\nLine 4';
            const expected = 'Line 1\nLine 2\nLine 3\n\nLine 4';
            const result = docIngestAgent.normalizeText(input);
            expect(result).to.equal(expected);
        });

        it('should handle empty input', () => {
            const result = docIngestAgent.normalizeText('');
            expect(result).to.equal('');
        });
    });

    describe('#chunkText', () => {
        it('should not chunk text smaller than max size', () => {
            const text = 'This is a short text';
            const result = docIngestAgent.chunkText(text, { maxChunkSize: 100, overlap: 10 });
            expect(result).to.have.lengthOf(1);
            expect(result[0]).to.equal(text);
        });

        it('should chunk text larger than max size', () => {
            const text = 'a'.repeat(2000);
            const result = docIngestAgent.chunkText(text, { maxChunkSize: 1000, overlap: 100 });
            expect(result.length).to.be.greaterThan(1);
            // The total content length should be greater than original due to overlap
            const totalLength = result.reduce((sum, chunk) => sum + chunk.length, 0);
            expect(totalLength).to.be.greaterThan(text.length);
        });

        it('should create chunks with overlap', () => {
            const text = 'a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500);
            const result = docIngestAgent.chunkText(text, { maxChunkSize: 600, overlap: 100 });
            expect(result.length).to.be.greaterThan(2);
            // Check for overlap - chunk 2 should start with the end of chunk 1
            const endOfFirstChunk = result[0].substring(result[0].length - 100);
            const startOfSecondChunk = result[1].substring(0, 100);
            expect(startOfSecondChunk).to.equal(endOfFirstChunk);
        });
    });

    describe('#extractText', () => {
        it('should extract text from HTML content', async () => {
            const html = '<html><body><h1>Test Heading</h1><p>Test paragraph.</p></body></html>';
            const buffer = Buffer.from(html, 'utf8');
            const result = await docIngestAgent.extractText(buffer, 'html');
            expect(result).to.include('Test Heading');
            expect(result).to.include('Test paragraph');
        });

        it('should extract text from plain text content', async () => {
            const text = 'This is a plain text document.';
            const buffer = Buffer.from(text, 'utf8');
            const result = await docIngestAgent.extractText(buffer, 'txt');
            expect(result).to.equal(text);
        });

        it('should extract text from Markdown content', async () => {
            const markdown = '# Heading\n\nThis is a paragraph with [a link](https://example.com).\n\n```\nCode block\n```';
            const buffer = Buffer.from(markdown, 'utf8');
            const result = await docIngestAgent.extractText(buffer, 'md');
            expect(result).to.include('Heading');
            expect(result).to.include('This is a paragraph with a link');
            expect(result).to.include('Code block');
            // Links should be reformatted
            expect(result).to.include('[https://example.com]');
        });
    });

    describe('#processFile', () => {
        it('should process a text file', async () => {
            // Create a test file
            const testFilePath = path.join(tempDir, 'test.txt');
            const testContent = 'This is a test file.\nIt has multiple lines.\n';
            fs.writeFileSync(testFilePath, testContent);

            const result = await docIngestAgent.processFile(testFilePath, 'test.txt');

            expect(result).to.have.property('extractedText');
            expect(result.extractedText).to.include('This is a test file');
            expect(result).to.have.property('format', 'txt');
            expect(result).to.have.property('sourceFile', 'test.txt');
            expect(result.metadata).to.have.property('charCount');
        });

        it('should reject files that are too large', async () => {
            // Create a test file larger than the limit
            const testFilePath = path.join(tempDir, 'large.txt');
            const largeContent = 'X'.repeat(2 * 1024 * 1024); // 2MB, over our 1MB test limit
            fs.writeFileSync(testFilePath, largeContent);

            try {
                await docIngestAgent.processFile(testFilePath, 'large.txt');
                expect.fail('Should have thrown an error for a file that is too large');
            } catch (error) {
                expect(error).to.have.property('message').that.includes('File too large');
            }
        });
    });
});
