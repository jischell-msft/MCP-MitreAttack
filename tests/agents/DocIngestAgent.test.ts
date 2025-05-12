import { DocIngestAgent } from '../../src/agents/DocIngestAgent';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

describe('DocIngestAgent', () => {
    let agent: DocIngestAgent;
    let tempDir: string;
    let axiosGetStub: sinon.SinonStub;

    before(async () => {
        // Create temporary directory for tests
        tempDir = path.join(os.tmpdir(), `doc-ingest-test-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Create test files
        await fs.writeFile(path.join(tempDir, 'test.txt'), 'This is a test document.\nIt has multiple lines.\n\nAnd paragraphs.');
    });

    beforeEach(() => {
        // Create a fresh agent for each test
        agent = new DocIngestAgent({
            maxDocumentSize: 1024 * 1024, // 1MB for tests
            cachePath: tempDir,
        });

        // Stub axios.get for URL tests
        axiosGetStub = sinon.stub(axios, 'get');
    });

    afterEach(() => {
        // Restore stubs
        axiosGetStub.restore();
    });

    after(async () => {
        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('initialization', () => {
        it('should initialize successfully', async () => {
            await agent.initialize();
            // Initialization is successful if no error is thrown
        });

        it('should set default configuration values', () => {
            const defaultAgent = new DocIngestAgent();
            expect(defaultAgent['config'].userAgent).to.include('DocIngestAgent');
            expect(defaultAgent['config'].maxDocumentSize).to.be.greaterThan(0);
        });
    });

    describe('URL validation and fetching', () => {
        it('should throw error for invalid URLs', () => {
            expect(() => agent['validateUrl']('not-a-url')).to.throw('Invalid URL');
        });

        it('should throw error for non-HTTP protocols', () => {
            expect(() => agent['validateUrl']('ftp://example.com')).to.throw('Unsupported protocol');
        });

        it('should throw error for localhost URLs', () => {
            expect(() => agent['validateUrl']('http://localhost/test')).to.throw('Local addresses not allowed');
        });

        it('should fetch URL content with proper headers', async () => {
            axiosGetStub.resolves({
                data: Buffer.from('HTML content'),
                status: 200,
            });

            await agent.initialize();
            await agent.processUrl('https://example.com');

            expect(axiosGetStub.calledOnce).to.be.true;
            expect(axiosGetStub.firstCall.args[0]).to.equal('https://example.com');
            expect(axiosGetStub.firstCall.args[1].headers['User-Agent']).to.include('DocIngestAgent');
        });

        it('should retry failed requests', async () => {
            axiosGetStub.onFirstCall().rejects(new Error('Network error'));
            axiosGetStub.onSecondCall().resolves({
                data: Buffer.from('HTML content'),
                status: 200,
            });

            await agent.initialize();
            await agent.processUrl('https://example.com');

            expect(axiosGetStub.calledTwice).to.be.true;
        });
    });

    describe('format detection', () => {
        it('should detect PDF format from URL', () => {
            expect(agent['detectFormatFromUrl']('https://example.com/doc.pdf')).to.equal('pdf');
        });

        it('should detect DOCX format from URL', () => {
            expect(agent['detectFormatFromUrl']('https://example.com/doc.docx')).to.equal('docx');
        });

        it('should default to HTML for web URLs', () => {
            expect(agent['detectFormatFromUrl']('https://example.com/page')).to.equal('html');
        });

        it('should detect format from filename', () => {
            expect(agent['detectFormatFromFilename']('document.pdf')).to.equal('pdf');
            expect(agent['detectFormatFromFilename']('document.docx')).to.equal('docx');
            expect(agent['detectFormatFromFilename']('document.txt')).to.equal('txt');
        });
    });

    describe('text normalization', () => {
        it('should normalize whitespace', () => {
            const text = 'Line with    multiple   spaces\nand\ttabs';
            const normalized = agent.normalizeText(text);

            expect(normalized).to.equal('Line with multiple spaces\nand tabs');
        });

        it('should handle empty input', () => {
            expect(agent.normalizeText('')).to.equal('');
            expect(agent.normalizeText(null)).to.equal('');
            expect(agent.normalizeText(undefined)).to.equal('');
        });

        it('should normalize Unicode characters', () => {
            const text = 'Smart "quotes" and 'apostrophes' and an em—dash';
            const normalized = agent.normalizeText(text);

            expect(normalized).to.include('Smart "quotes" and \'apostrophes\'');
        });
    });

    describe('text chunking', () => {
        it('should return single chunk for small text', () => {
            const text = 'This is a small text document.';
            const chunks = agent.chunkText(text);

            expect(chunks).to.have.length(1);
            expect(chunks[0]).to.equal(text);
        });

        it('should chunk large text with proper overlap', () => {
            // Create a large text with multiple paragraphs
            let largeText = '';
            for (let i = 0; i < 100; i++) {
                largeText += `Paragraph ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n`;
            }

            // Set small chunk size for testing
            agent = new DocIngestAgent({
                maxChunkSize: 500,
                chunkOverlap: 50,
            });

            const chunks = agent.chunkText(largeText);

            expect(chunks.length).to.be.greaterThan(1);

            // Check that all chunks have reasonable size
            for (const chunk of chunks) {
                expect(chunk.length).to.be.lessThanOrEqual(500);
            }

            // Check for overlap between adjacent chunks
            for (let i = 1; i < chunks.length; i++) {
                const prevChunk = chunks[i - 1];
                const currentChunk = chunks[i];

                // Get end of previous chunk and start of current chunk
                const prevEnd = prevChunk.substring(Math.max(0, prevChunk.length - 50));
                const currentStart = currentChunk.substring(0, Math.min(50, currentChunk.length));

                // Check that there is some content overlap
                const hasOverlap = prevEnd.includes(currentStart.substring(0, 10)) ||
                    currentStart.includes(prevEnd.substring(prevEnd.length - 10));

                expect(hasOverlap).to.be.true;
            }
        });

        it('should handle very large paragraphs', () => {
            // Create a text with one very large paragraph
            let largeText = 'A'.repeat(2000);

            // Set small chunk size for testing
            agent = new DocIngestAgent({
                maxChunkSize: 500,
                chunkOverlap: 50,
            });

            const chunks = agent.chunkText(largeText);

            expect(chunks.length).to.be.greaterThan(1);

            // Check that all chunks have reasonable size
            for (const chunk of chunks) {
                expect(chunk.length).to.be.lessThanOrEqual(500);
            }
        });
    });

    describe('text extraction', () => {
        it('should extract text from plain text files', async () => {
            const content = Buffer.from('This is plain text');
            const extracted = await agent.extractText(content, 'txt');

            expect(extracted).to.equal('This is plain text');
        });

        it('should extract text from HTML', async () => {
            const html = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Heading</h1>
            <p>Test paragraph.</p>
            <script>console.log('This should be removed');</script>
          </body>
        </html>
      `;

            const content = Buffer.from(html);
            const extracted = await agent.extractText(content, 'html');

            expect(extracted).to.include('Test Heading');
            expect(extracted).to.include('Test paragraph');
            expect(extracted).to.not.include('console.log');
        });

        it('should throw error for unsupported formats', async () => {
            const content = Buffer.from('test');
            try {
                await agent.extractText(content, 'unknown');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('Unsupported format');
            }
        });
    });

    describe('file processing', () => {
        it('should process a text file', async () => {
            const testFile = path.join(tempDir, 'test.txt');
            await agent.initialize();
            const result = await agent.processFile(testFile, 'test.txt');

            expect(result.format).to.equal('txt');
            expect(result.extractedText).to.include('This is a test document');
            expect(result.metadata.charCount).to.be.greaterThan(0);
        });

        it('should throw error for too large files', async () => {
            // Create a stub for file reading that returns a large buffer
            const readFileStub = sinon.stub(fs, 'readFile');
            readFileStub.resolves(Buffer.alloc(1024 * 1024 * 60)); // 60MB, above limit

            try {
                await agent.initialize();
                await agent.processFile('large-file.txt', 'large-file.txt');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('exceeds maximum');
            } finally {
                readFileStub.restore();
            }
        });
    });

    describe('end-to-end tests', () => {
        it('should process a URL and return structured result', async () => {
            axiosGetStub.resolves({
                data: Buffer.from(`
          <html>
            <head><title>Test Document</title></head>
            <body>
              <h1>Test Document</h1>
              <p>This is a test document for DocIngestAgent.</p>
              <p>It contains multiple paragraphs.</p>
            </body>
          </html>
        `),
                status: 200,
            });

            await agent.initialize();
            const result = await agent.processUrl('https://example.com/test.html');

            expect(result.sourceUrl).to.equal('https://example.com/test.html');
            expect(result.format).to.equal('html');
            expect(result.extractedText).to.include('Test Document');
            expect(result.extractedText).to.include('multiple paragraphs');
            expect(result.textChunks).to.be.an('array');
            expect(result.metadata).to.be.an('object');
            expect(result.extractionTimestamp).to.be.instanceOf(Date);
        });
    });
});
