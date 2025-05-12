# DocIngestAgent Development

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. The DocIngestAgent is responsible for processing URLs and documents, extracting text content, and preparing it for analysis by the EvalAgent.

## Requirements
- Accept URLs for direct analysis
- Support common document formats (PDF, DOCX, TXT, HTML)
- Extract text content preserving necessary context
- Handle documents up to 50MB in size
- Implement text normalization and chunking for large documents

## Tasks

### 2.3.1. Create DocIngestAgent interface and model
- Define the DocIngestAgent interface
- Create data models for document content
- Define input/output specifications
- Implement configuration options

### 2.3.2. Implement URL validation and fetching
- Create URL validation logic
- Implement secure HTTP client using axios
- Add user-agent and header configuration
- Handle redirects and HTTP status codes
- Implement timeout and retry logic

### 2.3.3. Create HTML content extraction
- Implement HTML parsing using cheerio or jsdom
- Extract main content from HTML pages
- Strip unnecessary elements (ads, navigation, etc.)
- Preserve headings and structure
- Handle character encoding issues

### 2.3.4. Implement text normalization utilities
- Create text cleaning functions
- Normalize whitespace and line breaks
- Handle special characters and encoding
- Implement language detection
- Create paragraph and sentence splitting

### 2.3.5. Add PDF text extraction
- Implement PDF parsing using pdf-parse
- Extract text with proper ordering
- Handle multi-column layouts
- Extract metadata (title, author, etc.)
- Implement page-by-page extraction

### 2.3.6. Add DOCX text extraction
- Implement DOCX parsing using mammoth
- Extract text with structure
- Handle tables and lists
- Extract metadata
- Preserve styling information when relevant

### 2.3.7. Implement document chunking for large content
- Create algorithm for splitting large documents
- Implement chunk overlap for context preservation
- Add metadata to chunks for reassembly
- Create size estimation for token limits
- Handle special cases (tables, code blocks, etc.)

### 2.3.8. Create tests for DocIngestAgent
- Write unit tests for extraction logic
- Create integration tests with sample documents
- Test error handling and edge cases
- Verify chunking algorithm

## Implementation Guidance

The implementation should:
- Use TypeScript interfaces and types
- Handle a variety of content formats and structures
- Preserve document context and structure when possible
- Implement proper error handling for malformed content
- Include detailed logging for extraction operations
- Optimize for both accuracy and performance

Start by creating the interface and models, then implement URL fetching and HTML extraction. Next, add support for PDF and DOCX formats, and finally implement text normalization and chunking.

## DocIngestAgent Interface

Here's a suggested interface for the DocIngestAgent:

```typescript
interface DocIngestAgentConfig {
  maxDocumentSize: number;      // Maximum document size in bytes
  maxChunkSize: number;         // Maximum chunk size in characters
  chunkOverlap: number;         // Overlap between chunks in characters
  userAgent: string;            // User agent for HTTP requests
  timeout: number;              // Timeout for HTTP requests in ms
  retries: number;              // Number of retries for failed requests
  followRedirects: boolean;     // Whether to follow redirects
}

interface DocIngestResult {
  sourceUrl?: string;           // Original URL if applicable
  sourceFile?: string;          // Original filename if applicable
  extractedText: string;        // Full extracted text
  textChunks?: string[];        // Text broken into processable chunks
  metadata: {                   // Document metadata
    title?: string;
    author?: string;
    createdDate?: Date;
    pageCount?: number;
    charCount: number;
  }
  format: string;               // Detected format
  extractionTimestamp: Date;    // When processing completed
}

interface DocIngestAgent {
  initialize(): Promise<void>;
  processUrl(url: string): Promise<DocIngestResult>;
  processFile(filePath: string, fileName: string): Promise<DocIngestResult>;
  extractText(content: Buffer, format: string): Promise<string>;
  normalizeText(text: string): string;
  chunkText(text: string): string[];
}
```

## Supported Document Formats

Implement support for the following formats:

- HTML: Web pages and HTML documents
- PDF: Portable Document Format
- DOCX: Microsoft Word Open XML Format
- TXT: Plain text files
- Markdown: CommonMark/GitHub Markdown
- RTF: Rich Text Format (basic support)

## URL Fetching Considerations

When fetching URLs, consider:

1. Setting appropriate headers:
   - User-Agent: Set a descriptive user agent
   - Accept-Language: Support multiple languages
   - Accept: Indicate preferred content types

2. Security considerations:
   - Validate URLs before fetching
   - Set timeouts to prevent hanging
   - Limit redirects to prevent loops
   - Verify SSL certificates
   - Implement rate limiting

3. Error handling:
   - Handle common HTTP errors (404, 500, etc.)
   - Implement retry logic with backoff
   - Log detailed error information

## Text Chunking Strategy

For large documents, implement a chunking strategy:

1. Split text at natural boundaries (paragraphs, sections)
2. Maintain a maximum chunk size (e.g., 10KB)
3. Ensure chunks overlap (e.g., 10% overlap)
4. Preserve context in each chunk (include headings)
5. Add metadata to chunks for reassembly
6. Estimate token counts for API limits

Example chunking algorithm:

```typescript
function chunkDocument(text: string, maxChunkTokens: number = 6000): string[] {
  // Estimate tokens (approx 4 chars per token)
  const estimatedTokens = Math.ceil(text.length / 4);
  
  // If under limit, return as single chunk
  if (estimatedTokens <= maxChunkTokens) {
    return [text];
  }
  
  // Otherwise split into chunks with 10% overlap
  const chunkSize = Math.floor(maxChunkTokens * 4); // Convert back to chars
  const overlap = Math.floor(chunkSize * 0.1);
  const chunks: string[] = [];
  
  let startPos = 0;
  while (startPos < text.length) {
    const endPos = Math.min(startPos + chunkSize, text.length);
    chunks.push(text.substring(startPos, endPos));
    startPos = endPos - overlap;
  }
  
  return chunks;
}
```
