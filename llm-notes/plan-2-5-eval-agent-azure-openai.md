# EvalAgent with Azure OpenAI

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on enhancing the EvalAgent with Azure OpenAI integration to improve detection capabilities and accuracy. The Azure OpenAI integration will be the primary analysis method, with the local processing capabilities developed in the previous step serving as a fallback.

## Requirements
- Integrate with Azure OpenAI for enhanced document analysis
- Implement secure API key management
- Create efficient prompt templates for technique matching
- Manage token limits and implement chunking strategies
- Parse and process Azure OpenAI responses
- Implement fallback to local processing when needed

## Tasks

### 2.5.1. Set up Azure OpenAI client configuration
- Create Azure OpenAI service client
- Implement configuration options
- Add environment variable support
- Create API request utilities

### 2.5.2. Create secure credential management
- Implement secure API key handling
- Add support for Azure AD authentication
- Create fallback mechanisms
- Implement key rotation support

### 2.5.3. Implement prompt template generation
- Design effective prompts for technique matching
- Create dynamic prompt generation
- Optimize prompts for token efficiency
- Include necessary context and instructions

### 2.5.4. Create token counting and chunking logic
- Implement accurate token counting
- Create document chunking strategy
- Add overlap between chunks
- Optimize MITRE data for token efficiency

### 2.5.5. Build API response parsing
- Implement JSON response parsing
- Extract technique matches and confidence
- Handle various response formats
- Add error checking and validation

### 2.5.6. Implement fallback mechanism to local processing
- Create seamless fallback when API fails
- Add timeout handling
- Implement circuit breaker pattern
- Create metrics for API reliability

### 2.5.7. Add caching for similar requests
- Implement request caching
- Create cache invalidation strategy
- Add cache hit/miss metrics
- Optimize for frequently analyzed content

### 2.5.8. Create tests for Azure OpenAI EvalAgent
- Write unit tests with mocked API responses
- Create integration tests with real API calls
- Test error handling and fallback mechanisms
- Verify end-to-end functionality

## Implementation Guidance

The implementation should:
- Follow security best practices for API key management
- Optimize prompt design for accurate technique matching
- Implement efficient token usage strategies
- Create robust error handling and fallback mechanisms
- Include detailed logging for API operations
- Design for both performance and cost efficiency

Start by setting up the Azure OpenAI client configuration and credential management. Then implement prompt template generation and token management. Finally, add response parsing, fallback mechanisms, and caching.

## Azure OpenAI Integration

### Endpoint Configuration

```typescript
interface AzureOpenAIConfig {
  endpoint: string;             // Azure OpenAI service endpoint URL
  apiKey: string;               // API key for authentication
  deploymentName: string;       // Model deployment name (e.g., "gpt-4")
  apiVersion: string;           // API version (e.g., "2023-05-15")
  maxTokens: number;            // Maximum tokens for completion
  temperature: number;          // Temperature for generation (0.0-1.0)
  timeout: number;              // Request timeout in milliseconds
  retryCount: number;           // Number of retry attempts
  useAzureAD: boolean;          // Whether to use Azure AD authentication
}
```

### API Key Security Implementation

```typescript
// Example: Secure API key handling in EvalAgent

// 1. Load from environment variable (never hardcode)
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2023-05-15";

if (!apiKey || !endpoint || !deploymentName) {
  throw new Error("Missing required Azure OpenAI configuration");
}

// 2. Use in API requests, never logging the key
async function analyzeWithAzureOpenAI(document: string, techniques: any[]) {
  try {
    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    const response = await axios.post(url, 
      {
        messages: [
          {
            role: "system",
            content: "You are an expert in cybersecurity and the MITRE ATT&CK framework..."
          },
          {
            role: "user",
            content: `DOCUMENT: ${document}\n\nMITRE TECHNIQUES: ${JSON.stringify(techniques)}\n\nAnalyze...`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        timeout: parseInt(process.env.AZURE_OPENAI_TIMEOUT_MS || "30000")
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error("Azure OpenAI API error", { 
      error: error.message,
      status: error.response?.status,
      // Never log the actual API key in error messages
      endpoint: endpoint.replace(/\/+$/, '')
    });
    
    // Implement fallback mechanism
    return await analyzeWithLocalAlgorithm(document, techniques);
  }
}
```

## Azure Active Directory Authentication

For enhanced security, implement AAD authentication:

```typescript
// AAD Authentication implementation
import { DefaultAzureCredential } from "@azure/identity";
import { OpenAIClient } from "@azure/openai";

async function analyzeWithAzureOpenAIUsingAAD(document: string, techniques: any[]) {
  // Create a client using AAD authentication
  const credential = new DefaultAzureCredential();
  const client = new OpenAIClient(
    process.env.AZURE_OPENAI_ENDPOINT as string,
    credential
  );

  try {
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME as string;
    
    const response = await client.getChatCompletions(
      deploymentName,
      [
        { role: "system", content: "You are an expert in cybersecurity..." },
        { role: "user", content: `DOCUMENT: ${document}\n\nMITRE TECHNIQUES: ${JSON.stringify(techniques)}\n\nAnalyze...` }
      ],
      {
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: "json_object" }
      }
    );
    
    return response.choices[0].message?.content || "";
  } catch (error) {
    logger.error("Azure OpenAI API error with AAD auth", { 
      error: error.message,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT
    });
    
    // Implement fallback mechanism
    return await analyzeWithLocalAlgorithm(document, techniques);
  }
}
```

## Prompt Template Design

The system prompt should be designed to:
1. Establish the role as a cybersecurity expert
2. Provide clear instructions for analysis
3. Specify the expected output format
4. Include guidance on confidence scoring

Example system prompt:

```
You are an expert in cybersecurity and the MITRE ATT&CK framework. Your task is to analyze the provided document text and identify any techniques, tactics, or procedures that match entries in the MITRE ATT&CK framework.

For each match you find:
1. Identify the specific MITRE technique ID and name
2. Assess a confidence score (0-100) based on how well the document text matches the technique
3. Extract the specific text that triggered the match
4. Provide brief context around why this is a match

Return your analysis in valid JSON format with the following structure:
{
  "matches": [
    {
      "techniqueId": "T1566",
      "techniqueName": "Phishing",
      "confidenceScore": 85,
      "matchedText": "The attacker sent emails with malicious attachments",
      "rationale": "The document describes a classic phishing attack vector using email attachments"
    }
  ],
  "summary": {
    "matchCount": 1,
    "topTechniques": ["T1566"],
    "overallAssessment": "The document describes a phishing attack"
  }
}

Only include techniques where you have at least moderate confidence (score >= 60). If no techniques match with sufficient confidence, return an empty matches array.
```

## Token Management Strategy

Implement efficient token management:

```typescript
function optimizeMitreTechniques(techniques: TechniqueModel[]): any[] {
  // Extract only necessary fields to reduce token usage
  return techniques.map(technique => ({
    id: technique.id,
    name: technique.name,
    description: truncateDescription(technique.description, 100),
    tactics: technique.tactics,
    keywords: technique.keywords
  }));
}

function countTokens(text: string): number {
  return encode(text).length;
}

function prepareApiPayload(document: string, techniques: any[]): any {
  const systemMessage = "You are an expert in cybersecurity...";
  const userMessage = `DOCUMENT: ${document}\n\nMITRE TECHNIQUES: ${JSON.stringify(optimizeMitreTechniques(techniques))}\n\nAnalyze...`;
  
  const systemTokens = countTokens(systemMessage);
  const userTokens = countTokens(userMessage);
  const totalInputTokens = systemTokens + userTokens;
  
  // Maximum input tokens to leave room for output (for GPT-4)
  const maxInputTokens = 7000; // 8192 - ~1200 for output
  
  if (totalInputTokens <= maxInputTokens) {
    return {
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ]
    };
  } else {
    // Need to reduce tokens - either chunk document or reduce techniques
    return createReducedPayload(document, techniques, maxInputTokens);
  }
}
```

## Progressive Analysis for Large Documents

For very large documents, implement a progressive analysis approach:

```typescript
async function analyzeProgressively(document: string, techniques: TechniqueModel[]): Promise<EvalResult> {
  // 1. Split document into chunks
  const chunks = chunkDocument(document);
  
  // 2. Analyze each chunk
  const chunkResults: EvalMatch[][] = [];
  for (const chunk of chunks) {
    const result = await analyzeWithAzureOpenAI(chunk, techniques);
    chunkResults.push(parseMatches(result));
  }
  
  // 3. Merge results
  const allMatches = mergeMatches(chunkResults);
  
  // 4. Deduplicate and score
  const uniqueMatches = deduplicateMatches(allMatches);
  
  // 5. Create final result
  return {
    matches: uniqueMatches,
    summary: createSummary(uniqueMatches, document)
  };
}

function mergeMatches(chunkResults: EvalMatch[][]): EvalMatch[] {
  const allMatches: EvalMatch[] = [];
  
  for (const matches of chunkResults) {
    allMatches.push(...matches);
  }
  
  return allMatches;
}

function deduplicateMatches(matches: EvalMatch[]): EvalMatch[] {
  // Group by technique ID
  const groupedMatches = groupBy(matches, 'techniqueId');
  
  // For each group, keep the highest confidence match
  // or merge if they're different contexts
  const uniqueMatches: EvalMatch[] = [];
  
  for (const [techniqueId, techniqueMatches] of Object.entries(groupedMatches)) {
    if (techniqueMatches.length === 1) {
      uniqueMatches.push(techniqueMatches[0]);
    } else {
      // For multiple matches of same technique, increase confidence
      // if found in multiple chunks
      const bestMatch = findBestMatch(techniqueMatches);
      bestMatch.confidenceScore = Math.min(100, bestMatch.confidenceScore + 5 * (techniqueMatches.length - 1));
      uniqueMatches.push(bestMatch);
    }
  }
  
  return uniqueMatches;
}
```
