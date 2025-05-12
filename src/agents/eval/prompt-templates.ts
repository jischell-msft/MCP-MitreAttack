/**
 * Prompt template for analyzing documents against MITRE ATT&CK techniques
 */
export const MITRE_ANALYSIS_PROMPT = `
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
`;

/**
 * Function to generate a user prompt for MITRE analysis
 * @param document Document text to analyze
 * @param techniques MITRE techniques to check against 
 * @returns Formatted user prompt
 */
export function generateMitreAnalysisPrompt(document: string, techniques: any[]): string {
    return `DOCUMENT:\n${document}\n\nMITRE TECHNIQUES:\n${JSON.stringify(techniques)}\n\nAnalyze the document text and identify any techniques from the provided MITRE ATT&CK list that appear in the document. Follow the instructions carefully.`;
}
