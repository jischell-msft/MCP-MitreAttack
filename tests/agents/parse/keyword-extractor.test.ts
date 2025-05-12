import { KeywordExtractor } from '../../../src/agents/parse/keyword-extractor';

describe('KeywordExtractor', () => {
    it('should extract keywords from text', () => {
        const text = 'The adversary uses phishing techniques to steal user credentials.';
        const keywords = KeywordExtractor.extractKeywords(text);

        expect(keywords).toContain('adversary');
        expect(keywords).toContain('phishing');
        expect(keywords).toContain('techniques');
        expect(keywords).toContain('steal');
        expect(keywords).toContain('user');
        expect(keywords).toContain('credentials');

        // Should not contain stop words
        expect(keywords).not.toContain('the');
        expect(keywords).not.toContain('to');
    });

    it('should include title keywords when provided', () => {
        const text = 'The adversary steals authentication data.';
        const title = 'Credential Theft';
        const keywords = KeywordExtractor.extractKeywords(text, title);

        expect(keywords).toContain('credential');
        expect(keywords).toContain('theft');
        expect(keywords).toContain('adversary');
        expect(keywords).toContain('steals');
        expect(keywords).toContain('authentication');
        expect(keywords).toContain('data');
    });

    it('should extract technical terms even if short', () => {
        const text = 'The attacker uses SSH to access the system and runs SQL queries.';
        const keywords = KeywordExtractor.extractKeywords(text);

        expect(keywords).toContain('ssh');
        expect(keywords).toContain('sql');
    });

    it('should expand keywords with synonyms', () => {
        const text = 'The malware encrypts files for ransom.';
        const keywords = KeywordExtractor.extractKeywords(text, '', true);

        // Original words
        expect(keywords).toContain('malware');
        expect(keywords).toContain('encrypts');
        expect(keywords).toContain('files');
        expect(keywords).toContain('ransom');

        // Synonyms
        expect(keywords).toContain('encryption');
        // Some of these might be included due to synonym expansion
        expect(keywords.some(k => ['virus', 'trojan', 'ransomware'].includes(k))).toBeTruthy();
    });

    it('should handle HTML and special characters', () => {
        const text = '<p>The attacker uses <strong>malicious code</strong> &amp; specialized tools.</p>';
        const keywords = KeywordExtractor.extractKeywords(text);

        expect(keywords).toContain('attacker');
        expect(keywords).toContain('malicious');
        expect(keywords).toContain('code');
        expect(keywords).toContain('specialized');
        expect(keywords).toContain('tools');
    });

    it('should extract multi-word phrases', () => {
        const text = 'The adversary uses social engineering to trick users into revealing their credentials.';
        const keywords = KeywordExtractor.extractKeywords(text);

        expect(keywords).toContain('social engineering');
        expect(keywords).toContain('trick users');
        expect(keywords).toContain('revealing credentials');
    });
});
